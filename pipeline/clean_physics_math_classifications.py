"""
Phase 3 Migration & Cleanup Script for Edexcel IAL Physics and Mathematics Classifications.
1. Strips all invalid cross-unit secondary subtopics across:
   - `dataset_physics.json`, `frontend/public/dataset_physics.json`, `pipeline/classification_cache_physics.json`
   - `dataset_math.json`, `frontend/public/dataset_math.json`, `pipeline/classification_cache_mathematics.json`
2. Fixes ambiguous prefix / shared-code collisions:
   - Physics: `1.3.6 (Moments)` assigned to non-moment rope/pulley equilibrium questions;
     `4.4.3 (Spec 105-107)` bled onto pure `4.4.4 (Spec 105, 108-110)` electromagnetic induction questions.
   - Mathematics: `S1 1.1 & 2.1` (Histograms/Stem & Leaf/Box Plots) vs `S1 2.2-2.4` (Mean/SD/Quartiles/Coding);
     `S1 6.1a` vs `S1 6.1b` (Normal Distribution unknown mean/SD).
3. Promotes specific target syllabus subtopics over generic foundational skills into `mainSubtopic` (`subtopics[0]`):
   - Physics: `1.3.2 (Scalars & Vectors)` and introductory `.1` subtopics (`2.3.1`, `2.4.1`, `4.3.1`).
   - Mathematics: foundational algebraic/vector setup skills across P1–P4 and M1.
4. Strips sub-part vector bleed (`1.3.2`) on 1D/scalar Physics sub-parts and caps `relatedSubtopics` at `<= 1`
   (maximum 2 subtopics total per question sub-part).
"""

import json
from pathlib import Path
import shutil
import sys
from typing import Any, Dict, List, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pymupdf

pymupdf.TOOLS.mupdf_display_errors(False)

from pipeline.batch_scanner_physics import scan_physics_papers_directory
from pipeline.gemini_classifier import EdexcelPDFTextCache, UnitTaxonomyResolver
from pipeline.syllabus_math import (
    MATH_S1_HISTOGRAM_STEM_BOX,
    MATH_S1_NORMAL_A,
    MATH_S1_NORMAL_B,
    enforce_math_subtopic_hierarchy,
    get_math_parent_topic_for_subtopic,
    is_math_subtopic_valid_for_unit,
    normalize_math_unit_code,
)
from pipeline.syllabus_physics import (
    PHYS_INDUCTION_SUBTOPIC,
    PHYS_MAG_FORCE_SUBTOPIC,
    PHYS_MOMENTS_SUBTOPIC,
    PHYS_SCALARS_VECTORS_SUBTOPIC,
    enforce_physics_subtopic_hierarchy,
    get_physics_parent_topic_for_subtopic,
    is_physics_subtopic_valid_for_unit,
    normalize_physics_unit_code,
)


def load_physics_pdf_cache() -> Optional[EdexcelPDFTextCache]:
    phys_dir = ROOT_DIR / "papers_physics"
    if phys_dir.exists():
        try:
            pairs = {
                p["paper_id"]: p
                for p in scan_physics_papers_directory(str(phys_dir))
            }
            if pairs:
                return EdexcelPDFTextCache(pairs)
        except Exception:
            pass
    return None


def clean_physics_dataset_and_cache() -> None:
    dataset_path = ROOT_DIR / "dataset_physics.json"
    public_path = ROOT_DIR / "frontend" / "public" / "dataset_physics.json"
    cache_path = ROOT_DIR / "pipeline" / "classification_cache_physics.json"

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset: List[Dict[str, Any]] = json.load(f)

    cache: Dict[str, Dict[str, Any]] = {}
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            cache = json.load(f)

    pdf_cache = load_physics_pdf_cache()
    resolver = UnitTaxonomyResolver("physics")

    cross_unit_stripped = 0
    prefix_collisions_fixed = 0
    primary_promoted = 0
    subpart_bleeds_removed = 0
    secondary_capped = 0
    total_modified = 0

    qid_to_ucode: Dict[str, str] = {}
    qid_to_texts: Dict[str, tuple] = {}

    for q in dataset:
        qid = q["id"]
        pid = q.get("paperId") or q.get("paper_id") or ""
        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)
        qid_to_ucode[qid] = ucode

        orig_main = q.get("mainSubtopic") or q.get("subtopic") or ""
        orig_subs = list(q.get("subtopics") or ([orig_main] if orig_main else []))
        orig_rels = (
            list(q.get("relatedSubtopics"))
            if isinstance(q.get("relatedSubtopics"), list)
            else [s for s in orig_subs if s != orig_main]
        )

        own_qp, own_ms = (str(q.get("text") or "").strip(), "")
        if pdf_cache and ucode in ("WPH11", "WPH12", "WPH14") and any(
            s.startswith(("1.3.2", "1.3.6", "2.3.1", "2.4.1", "4.3.1", "4.4.3", "4.4.4"))
            for s in orig_subs
        ):
            own_qp, own_ms = pdf_cache.get_subpart_own_texts(q)
        qid_to_texts[qid] = (own_qp, own_ms)

        if any(not is_physics_subtopic_valid_for_unit(s, ucode) for s in orig_subs):
            cross_unit_stripped += 1
        if len(orig_rels) > 1:
            secondary_capped += 1

        new_top, new_main, new_rels = enforce_physics_subtopic_hierarchy(
            ucode,
            orig_main,
            orig_rels,
            own_prompt_text=own_qp,
            own_ms_text=own_ms,
        )

        if (
            ucode == "WPH11"
            and PHYS_MOMENTS_SUBTOPIC in orig_subs
            and PHYS_MOMENTS_SUBTOPIC not in ([new_main] + new_rels)
        ) or (
            ucode == "WPH14"
            and orig_main == PHYS_INDUCTION_SUBTOPIC
            and PHYS_MAG_FORCE_SUBTOPIC in orig_rels
            and PHYS_MAG_FORCE_SUBTOPIC not in new_rels
        ):
            prefix_collisions_fixed += 1

        if new_main != orig_main and orig_main != PHYS_MOMENTS_SUBTOPIC:
            primary_promoted += 1

        if (
            ucode == "WPH11"
            and PHYS_SCALARS_VECTORS_SUBTOPIC in orig_rels
            and len(orig_rels) == 1
            and PHYS_SCALARS_VECTORS_SUBTOPIC not in ([new_main] + new_rels)
        ):
            subpart_bleeds_removed += 1

        new_subs = [new_main] + [r for r in new_rels if r != new_main]
        new_topics = [new_top]
        for r in new_rels:
            rt = get_physics_parent_topic_for_subtopic(r)
            if rt and rt not in new_topics:
                new_topics.append(rt)

        if (
            q.get("mainTopic") != new_top
            or q.get("mainSubtopic") != new_main
            or q.get("relatedSubtopics") != new_rels
            or q.get("topic") != new_top
            or q.get("subtopic") != new_main
            or q.get("subtopics") != new_subs
            or q.get("topics") != new_topics
        ):
            total_modified += 1

        q["mainTopic"] = new_top
        q["mainSubtopic"] = new_main
        q["relatedSubtopics"] = new_rels
        q["topic"] = new_top
        q["subtopic"] = new_main
        q["subtopics"] = new_subs
        q["topics"] = new_topics

        cache[qid] = {
            "mainTopic": new_top,
            "mainSubtopic": new_main,
            "relatedSubtopics": new_rels,
            "topic": new_top,
            "subtopic": new_main,
            "subtopics": new_subs,
            "topics": new_topics,
            "unitCode": ucode,
        }

    # Clean any orphaned cache entries not in current dataset
    for qid, c_entry in list(cache.items()):
        if qid in qid_to_ucode:
            continue
        ucode = normalize_physics_unit_code(c_entry.get("unitCode") or "WPH11")
        c_main = c_entry.get("mainSubtopic") or c_entry.get("subtopic") or ""
        c_rels = c_entry.get("relatedSubtopics") or []
        new_top, new_main, new_rels = enforce_physics_subtopic_hierarchy(
            ucode, c_main, c_rels
        )
        new_subs = [new_main] + [r for r in new_rels if r != new_main]
        new_topics = [new_top]
        for r in new_rels:
            rt = get_physics_parent_topic_for_subtopic(r)
            if rt and rt not in new_topics:
                new_topics.append(rt)
        cache[qid] = {
            "mainTopic": new_top,
            "mainSubtopic": new_main,
            "relatedSubtopics": new_rels,
            "topic": new_top,
            "subtopic": new_main,
            "subtopics": new_subs,
            "topics": new_topics,
            "unitCode": ucode,
        }

    with open(dataset_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    if public_path.parent.exists():
        shutil.copy2(dataset_path, public_path)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

    print("=" * 78)
    print("  PHASE 3 PHYSICS CLASSIFICATION CLEANUP SUMMARY")
    print("=" * 78)
    print(f"  Total Questions Processed                  : {len(dataset):,}")
    print(f"  Total Questions Updated                    : {total_modified:,}")
    print(f"  Cross-Unit Violations Stripped             : {cross_unit_stripped:,}")
    print(f"  Ambiguous Prefix/Shared-Code Collisions Fix: {prefix_collisions_fixed:,}")
    print(f"  Generic Foundational Primaries Promoted    : {primary_promoted:,}")
    print(f"  Sub-part Vector/Scalar Bleeds Removed      : {subpart_bleeds_removed:,}")
    print(f"  Excessive Secondary Subtopics Capped (<=1) : {secondary_capped:,}")
    print(f"  Synced Files                               : {dataset_path.name}, frontend/public/{public_path.name}, pipeline/{cache_path.name}")
    print("=" * 78)


def clean_math_dataset_and_cache() -> None:
    dataset_path = ROOT_DIR / "dataset_math.json"
    public_path = ROOT_DIR / "frontend" / "public" / "dataset_math.json"
    cache_path = ROOT_DIR / "pipeline" / "classification_cache_mathematics.json"

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset: List[Dict[str, Any]] = json.load(f)

    cache: Dict[str, Dict[str, Any]] = {}
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            cache = json.load(f)

    resolver = UnitTaxonomyResolver("mathematics")

    cross_unit_stripped = 0
    prefix_collisions_fixed = 0
    primary_promoted = 0
    secondary_capped = 0
    total_modified = 0

    qid_to_ucode: Dict[str, str] = {}

    for q in dataset:
        qid = q["id"]
        pid = q.get("paperId") or q.get("paper_id") or ""
        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)
        qid_to_ucode[qid] = ucode

        orig_main = q.get("mainSubtopic") or q.get("subtopic") or ""
        orig_subs = list(q.get("subtopics") or ([orig_main] if orig_main else []))
        orig_rels = (
            list(q.get("relatedSubtopics"))
            if isinstance(q.get("relatedSubtopics"), list)
            else [s for s in orig_subs if s != orig_main]
        )
        own_qp = str(q.get("text") or "").strip()

        if any(not is_math_subtopic_valid_for_unit(s, ucode) for s in orig_subs):
            cross_unit_stripped += 1
        if len(orig_rels) > 1:
            secondary_capped += 1

        new_top, new_main, new_rels = enforce_math_subtopic_hierarchy(
            ucode,
            orig_main,
            orig_rels,
            own_prompt_text=own_qp,
        )

        if ucode == "WST01":
            if (
                orig_main == MATH_S1_HISTOGRAM_STEM_BOX
                and new_main != MATH_S1_HISTOGRAM_STEM_BOX
            ) or (
                orig_main in (MATH_S1_NORMAL_A, MATH_S1_NORMAL_B)
                and (new_main != orig_main or (MATH_S1_NORMAL_B in new_rels) != (MATH_S1_NORMAL_B in orig_rels))
            ):
                prefix_collisions_fixed += 1
        elif new_main != orig_main:
            primary_promoted += 1

        new_subs = [new_main] + [r for r in new_rels if r != new_main]
        new_topics = [new_top]
        for r in new_rels:
            rt = get_math_parent_topic_for_subtopic(r)
            if rt and rt not in new_topics:
                new_topics.append(rt)

        if (
            q.get("mainTopic") != new_top
            or q.get("mainSubtopic") != new_main
            or q.get("relatedSubtopics") != new_rels
            or q.get("topic") != new_top
            or q.get("subtopic") != new_main
            or q.get("subtopics") != new_subs
            or q.get("topics") != new_topics
        ):
            total_modified += 1

        q["mainTopic"] = new_top
        q["mainSubtopic"] = new_main
        q["relatedSubtopics"] = new_rels
        q["topic"] = new_top
        q["subtopic"] = new_main
        q["subtopics"] = new_subs
        q["topics"] = new_topics

        cache[qid] = {
            "mainTopic": new_top,
            "mainSubtopic": new_main,
            "relatedSubtopics": new_rels,
            "topic": new_top,
            "subtopic": new_main,
            "subtopics": new_subs,
            "topics": new_topics,
            "unitCode": ucode,
        }

    # Clean any orphaned cache entries not in current dataset
    for qid, c_entry in list(cache.items()):
        if qid in qid_to_ucode:
            continue
        ucode = normalize_math_unit_code(c_entry.get("unitCode") or "WMA11")
        c_main = c_entry.get("mainSubtopic") or c_entry.get("subtopic") or ""
        c_rels = c_entry.get("relatedSubtopics") or []
        new_top, new_main, new_rels = enforce_math_subtopic_hierarchy(
            ucode, c_main, c_rels
        )
        new_subs = [new_main] + [r for r in new_rels if r != new_main]
        new_topics = [new_top]
        for r in new_rels:
            rt = get_math_parent_topic_for_subtopic(r)
            if rt and rt not in new_topics:
                new_topics.append(rt)
        cache[qid] = {
            "mainTopic": new_top,
            "mainSubtopic": new_main,
            "relatedSubtopics": new_rels,
            "topic": new_top,
            "subtopic": new_main,
            "subtopics": new_subs,
            "topics": new_topics,
            "unitCode": ucode,
        }

    with open(dataset_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    if public_path.parent.exists():
        shutil.copy2(dataset_path, public_path)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 78)
    print("  PHASE 3 MATHEMATICS CLASSIFICATION CLEANUP SUMMARY")
    print("=" * 78)
    print(f"  Total Questions Processed                  : {len(dataset):,}")
    print(f"  Total Questions Updated                    : {total_modified:,}")
    print(f"  Cross-Unit Violations Stripped             : {cross_unit_stripped:,}")
    print(f"  Ambiguous Prefix/Subtopic Collisions Fixed : {prefix_collisions_fixed:,}")
    print(f"  Generic Foundational Primaries Promoted    : {primary_promoted:,}")
    print(f"  Excessive Secondary Subtopics Capped (<=1) : {secondary_capped:,}")
    print(f"  Synced Files                               : {dataset_path.name}, frontend/public/{public_path.name}, pipeline/{cache_path.name}")
    print("=" * 78)


if __name__ == "__main__":
    clean_physics_dataset_and_cache()
    clean_math_dataset_and_cache()
