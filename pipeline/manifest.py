"""
Pipeline Manifest Manager:
- Manages pipeline_manifest.json for incremental checkpointing
- Tracks processed papers by paper_id, file path, and SHA-256 hash
- Skips already extracted papers across batch runs
- Records question IDs generated per paper
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Set
from pipeline.batch_scanner import compute_file_hash

MANIFEST_VERSION = 1

class ManifestManager:
    def __init__(self, manifest_path: str = "pipeline_manifest.json"):
        self.manifest_path = manifest_path
        self.data: Dict[str, Any] = {
            "version": MANIFEST_VERSION,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "papers": {}
        }
        self.load()

    def load(self):
        if os.path.exists(self.manifest_path):
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception as e:
                print(f"[MANIFEST WARNING] Failed to read {self.manifest_path}: {e}")

    def save(self):
        self.data["last_updated"] = datetime.now(timezone.utc).isoformat()
        with open(self.manifest_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2)

    def is_paper_completed(
        self,
        paper_info: Dict[str, Any],
        existing_dataset_paper_ids: Optional[Set[str]] = None
    ) -> bool:
        """
        Checks if a paper has already been successfully extracted.
        Matches by paper_id, QP file hash, or file path.
        Also validates that the paper exists in dataset if existing_dataset_paper_ids is provided.
        """
        paper_id = paper_info.get("paper_id")
        que_path = paper_info.get("que_path")

        # 1. Check by paper_id
        if paper_id and paper_id in self.data.get("papers", {}):
            entry = self.data["papers"][paper_id]
            if entry.get("status") == "completed":
                if existing_dataset_paper_ids is None or paper_id in existing_dataset_paper_ids:
                    return True

        # 2. Check by file hash
        que_hash = paper_info.get("que_hash")
        if not que_hash and que_path and os.path.exists(que_path):
            que_hash = compute_file_hash(que_path)
            paper_info["que_hash"] = que_hash

        if que_hash:
            for pid, entry in self.data.get("papers", {}).items():
                if entry.get("que_hash") == que_hash and entry.get("status") == "completed":
                    if existing_dataset_paper_ids is None or pid in existing_dataset_paper_ids:
                        return True

        # 3. Check by normalized path
        if que_path:
            norm_q = os.path.normpath(que_path).lower()
            for pid, entry in self.data.get("papers", {}).items():
                entry_q = entry.get("que_path")
                if entry_q and os.path.normpath(entry_q).lower() == norm_q and entry.get("status") == "completed":
                    if existing_dataset_paper_ids is None or pid in existing_dataset_paper_ids:
                        return True

        return False

    def record_completed_paper(
        self,
        paper_info: Dict[str, Any],
        question_ids: List[str]
    ):
        """
        Records a newly processed paper in the manifest.
        """
        paper_id = paper_info["paper_id"]
        que_path = paper_info.get("que_path", "")
        rms_path = paper_info.get("rms_path", "")

        que_hash = paper_info.get("que_hash") or (compute_file_hash(que_path) if que_path and os.path.exists(que_path) else "")
        rms_hash = paper_info.get("rms_hash") or (compute_file_hash(rms_path) if rms_path and os.path.exists(rms_path) else "")

        self.data.setdefault("papers", {})[paper_id] = {
            "paper_id": paper_id,
            "unit_code": paper_info.get("unit_code"),
            "paper_code": paper_info.get("paper_code"),
            "unit_name": paper_info.get("unit_name"),
            "year": paper_info.get("year"),
            "session": paper_info.get("session"),
            "series": paper_info.get("series"),
            "series_folder": paper_info.get("series_folder"),
            "variant": paper_info.get("variant"),
            "que_path": que_path,
            "rms_path": rms_path,
            "que_hash": que_hash,
            "rms_hash": rms_hash,
            "status": "completed",
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "question_count": len(question_ids),
            "question_ids": question_ids
        }
        self.save()

    def bootstrap_from_dataset(self, dataset_path: str):
        """
        Populates manifest with existing questions in dataset.json if manifest is new.
        """
        if not os.path.exists(dataset_path):
            return

        try:
            with open(dataset_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            return

        # Group by paperId
        by_paper: Dict[str, List[Dict[str, Any]]] = {}
        for q in data:
            pid = q.get("paperId", "unknown")
            by_paper.setdefault(pid, []).append(q)

        for pid, q_list in by_paper.items():
            if pid not in self.data.get("papers", {}):
                sample_q = q_list[0]
                q_ids = [item["id"] for item in q_list]
                self.data.setdefault("papers", {})[pid] = {
                    "paper_id": pid,
                    "unit_code": sample_q.get("unitCode"),
                    "paper_code": sample_q.get("paperCode") or f"{sample_q.get('unitCode')}/01",
                    "unit_name": sample_q.get("unit"),
                    "year": sample_q.get("year", 2025),
                    "session": sample_q.get("session") or ("June" if "June" in sample_q.get("series", "") else "May/June"),
                    "series": sample_q.get("series", "2025 May/June"),
                    "series_folder": "sample_papers",
                    "variant": "",
                    "que_path": f"sample_papers/{pid}.pdf",
                    "rms_path": f"sample_papers/{pid.replace('-que-', '-rms-')}.pdf",
                    "que_hash": "",
                    "rms_hash": "",
                    "status": "completed",
                    "extracted_at": datetime.now(timezone.utc).isoformat(),
                    "question_count": len(q_ids),
                    "question_ids": q_ids
                }
        self.save()
