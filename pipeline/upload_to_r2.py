#!/usr/bin/env python3
"""
Multi-Threaded Cloudflare R2 Uploader for Edexcel Chemistry Topicals.

Uploads question crops and mark scheme images from frontend/public to Cloudflare R2
with immutable cache headers and concurrency, skipping already-uploaded files on re-runs.
"""

import os
import sys
import argparse
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
from botocore.config import Config
from tqdm import tqdm


def parse_args():
    parser = argparse.ArgumentParser(
        description="Upload question & mark scheme crops to Cloudflare R2"
    )
    parser.add_argument(
        "--bucket",
        default=os.getenv("R2_BUCKET", "edexcel-chemistry-crops"),
        help="R2 Bucket name (default: edexcel-chemistry-crops)",
    )
    parser.add_argument(
        "--account-id",
        default=os.getenv("R2_ACCOUNT_ID", "4d7cfd7388f8a4cbec19e52d0975b565"),
        help="Cloudflare Account ID",
    )
    parser.add_argument(
        "--access-key",
        default=os.getenv("R2_ACCESS_KEY", "8d1153fd97b257b53deadb314bb0ff74"),
        help="R2 Access Key ID",
    )
    parser.add_argument(
        "--secret-key",
        default=os.getenv("R2_SECRET_KEY", "6017faec2e5cbca7f3f58fbfcabd1705c0dd0e681c7b07b6dde52cca223be38d"),
        help="R2 Secret Access Key",
    )
    parser.add_argument(
        "--upload-dir",
        default=None,
        help="Upload directory (defaults to frontend/public image directories)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=25,
        help="Number of concurrent worker threads (default: 25)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview files to upload without making network requests",
    )
    return parser.parse_args()


def collect_image_files(base_search_dir: str | None = None):
    """
    Collects all question and mark scheme image files to upload.
    Returns a list of (absolute_local_path, s3_key).
    """
    files_to_process = []
    seen_keys = set()

    public_dir = os.path.abspath("frontend/public")
    project_root = os.path.abspath(".")

    search_dirs = []
    if base_search_dir:
        abs_base = os.path.abspath(base_search_dir)
        search_dirs.append(abs_base)
    else:
        # Default scan targets across Chemistry and Physics
        for sub in ["extracted", "crops", "ms_crops", "crops_physics"]:
            target = os.path.join(public_dir, sub)
            if os.path.exists(target):
                search_dirs.append(target)
            elif sub == "crops_physics":
                root_physics = os.path.join(project_root, "crops_physics")
                if os.path.exists(root_physics):
                    search_dirs.append(root_physics)

    image_extensions = {".png", ".jpg", ".jpeg", ".webp"}

    for root_dir in search_dirs:
        for root, _, files in os.walk(root_dir):
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in image_extensions:
                    full_local_path = os.path.join(root, file)
                    normalized_path = full_local_path.replace("\\", "/")
                    
                    if "/crops_physics/" in normalized_path:
                        parts = normalized_path.split("/crops_physics/")
                        s3_key = f"crops_physics/{parts[-1]}"
                    elif full_local_path.startswith(public_dir):
                        s3_key = os.path.relpath(full_local_path, public_dir).replace("\\", "/").lstrip("/")
                    else:
                        s3_key = os.path.relpath(full_local_path, project_root).replace("\\", "/").lstrip("/")

                    if s3_key not in seen_keys:
                        seen_keys.add(s3_key)
                        files_to_process.append((full_local_path, s3_key))

    return files_to_process


def get_content_type(file_path: str) -> str:
    lower = file_path.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    if lower.endswith(".webp"):
        return "image/webp"
    return "application/octet-stream"


def main():
    args = parse_args()

    endpoint_url = f"https://{args.account_id}.r2.cloudflarestorage.com"
    print(f"Connecting to Cloudflare R2 endpoint: {endpoint_url}")
    print(f"Target Bucket: {args.bucket}")
    print(f"Concurrency Workers: {args.workers}")

    # Configure boto3 client with generous retry and socket limits
    boto_config = Config(
        max_pool_connections=args.workers + 5,
        retries={"max_attempts": 5, "mode": "adaptive"},
    )

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=args.access_key,
        aws_secret_access_key=args.secret_key,
        region_name="auto",
        config=boto_config,
    )

    # 1. Collect candidate files
    candidates = collect_image_files(args.upload_dir)
    print(f"Discovered {len(candidates):,} local image assets.")
    if not candidates:
        print("No image assets found to upload. Exiting.")
        return

    # 2. Query existing objects in R2 bucket to skip re-uploads
    existing_objects = {}
    if not args.dry_run:
        print("Querying existing objects in R2 bucket...")
        try:
            paginator = s3.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=args.bucket):
                for obj in page.get("Contents", []):
                    existing_objects[obj["Key"]] = obj["Size"]
            print(f"Found {len(existing_objects):,} existing objects already in bucket.")
        except Exception as e:
            print(f"Warning: Failed to list existing objects ({e}). Will attempt uploading all.")

    # 3. Filter files needing upload
    upload_queue = []
    skipped_count = 0
    total_upload_bytes = 0

    for local_path, s3_key in candidates:
        file_size = os.path.getsize(local_path)
        if s3_key in existing_objects and existing_objects[s3_key] == file_size:
            skipped_count += 1
        else:
            upload_queue.append((local_path, s3_key, file_size))
            total_upload_bytes += file_size

    print(f"Skipped (already up-to-date in R2): {skipped_count:,} files")
    print(f"Queued for upload: {len(upload_queue):,} files ({total_upload_bytes / (1024 * 1024):.1f} MB)")

    if args.dry_run:
        print("[Dry Run] Exiting without uploading.")
        return

    if not upload_queue:
        print("All image assets are already synchronized with Cloudflare R2! Nothing to upload.")
        return

    # 4. Multi-Threaded Upload
    print(f"\nBeginning multi-threaded upload with {args.workers} workers...")
    start_time = time.time()
    uploaded_count = 0
    failed_count = 0
    errors = []

    def upload_task(item):
        path, key, size = item
        content_type = get_content_type(path)
        extra_args = {
            "ContentType": content_type,
            "CacheControl": "public, max-age=31536000, immutable",
        }
        try:
            s3.upload_file(path, args.bucket, key, ExtraArgs=extra_args)
            return True, key, size, None
        except Exception as exc:
            return False, key, size, str(exc)

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(upload_task, item): item for item in upload_queue}
        
        with tqdm(
            total=len(upload_queue),
            unit="file",
            desc="Uploading to R2",
            dynamic_ncols=True,
        ) as pbar:
            for future in as_completed(futures):
                success, key, size, err_msg = future.result()
                if success:
                    uploaded_count += 1
                else:
                    failed_count += 1
                    errors.append((key, err_msg))
                pbar.update(1)

    elapsed = time.time() - start_time
    print(f"\n{'=' * 60}")
    print("Cloudflare R2 Upload Summary:")
    print(f" - Total Local Images:    {len(candidates):,}")
    print(f" - Already in R2:         {skipped_count:,}")
    print(f" - Successfully Uploaded: {uploaded_count:,}")
    print(f" - Failed Uploads:        {failed_count:,}")
    print(f" - Upload Elapsed Time:   {elapsed:.1f}s ({elapsed / 60:.2f} mins)")
    if uploaded_count > 0:
        speed_mb = (total_upload_bytes / (1024 * 1024)) / max(elapsed, 0.001)
        print(f" - Average Speed:         {speed_mb:.2f} MB/s")
    print(f"{'=' * 60}")

    if errors:
        print("\nErrors encountered during upload (first 10):")
        for k, err in errors[:10]:
            print(f" [FAIL] {k}: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
