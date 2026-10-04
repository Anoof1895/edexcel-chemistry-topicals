import json
import os
import sys

def cleanup_orphaned_physics_crops(
    dataset_path: str = "dataset_physics.json",
    crops_dir: str = "crops_physics"
):
    print("=" * 60)
    print("Cleanup Orphaned Physics Crops")
    print("=" * 60)

    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}")
        return

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    # 1. Collect all referenced filenames
    valid_q_files = set()
    valid_ms_files = set()

    for item in dataset:
        qp = item.get("questionImagePath")
        if qp:
            valid_q_files.add(os.path.basename(qp))
        msp = item.get("markSchemeImagePath")
        if msp:
            valid_ms_files.add(os.path.basename(msp))

    print(f"Referenced Question Images: {len(valid_q_files)}")
    print(f"Referenced Mark Scheme Images: {len(valid_ms_files)}")

    q_dir = os.path.join(crops_dir, "questions")
    ms_dir = os.path.join(crops_dir, "mark_schemes")

    # 2. Scan and purge orphaned question images
    purged_q = []
    if os.path.exists(q_dir):
        for fname in os.listdir(q_dir):
            if fname.lower().endswith(".png"):
                if fname not in valid_q_files:
                    fpath = os.path.join(q_dir, fname)
                    try:
                        os.remove(fpath)
                        purged_q.append(fname)
                    except Exception as e:
                        print(f"  Warning: could not delete {fpath}: {e}")

    # 3. Scan and purge orphaned mark scheme images
    purged_ms = []
    if os.path.exists(ms_dir):
        for fname in os.listdir(ms_dir):
            if fname.lower().endswith(".png"):
                if fname not in valid_ms_files:
                    fpath = os.path.join(ms_dir, fname)
                    try:
                        os.remove(fpath)
                        purged_ms.append(fname)
                    except Exception as e:
                        print(f"  Warning: could not delete {fpath}: {e}")

    print("\n--- Purge Results ---")
    print(f"Purged Orphaned Question Crops ({len(purged_q)} files):")
    for f in sorted(purged_q):
        print(f"  [DELETED] {f}")

    print(f"\nPurged Orphaned Mark Scheme Crops ({len(purged_ms)} files):")
    for f in sorted(purged_ms):
        print(f"  [DELETED] {f}")

    # 4. Final disk audit
    remaining_q = len([f for f in os.listdir(q_dir) if f.lower().endswith('.png')]) if os.path.exists(q_dir) else 0
    remaining_ms = len([f for f in os.listdir(ms_dir) if f.lower().endswith('.png')]) if os.path.exists(ms_dir) else 0

    print("\n--- Disk Audit After Cleanup ---")
    print(f"Questions Directory ({q_dir}): {remaining_q} files (Matches referenced: {remaining_q == len(valid_q_files)})")
    print(f"Mark Schemes Directory ({ms_dir}): {remaining_ms} files (Matches referenced: {remaining_ms == len(valid_ms_files)})")
    print(f"Total Orphaned Files Purged: {len(purged_q) + len(purged_ms)}")
    print("=" * 60)

if __name__ == "__main__":
    cleanup_orphaned_physics_crops()
