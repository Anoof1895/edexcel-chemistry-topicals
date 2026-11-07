"""
Phase 3 Migration & Cleanup Script for Edexcel IAL Chemistry Classifications.
1. Strips all invalid cross-unit secondary subtopics across `dataset.json`,
   `frontend/public/dataset.json`, and `pipeline/classification_cache_chemistry.json`.
2. Fixes primary vs. secondary subtopic hierarchy where generic foundational subtopics
   (`1.3 & 1.12` / `1.3 & 1.10`, `4A (4.1-4.3)`, `4A (4.4-4.8)`) usurped a specific Topic 1-5 subtopic.
3. Strips non-hazard `4A (4.1-4.3)` tags (e.g. from IUPAC naming or structure drawing sub-parts).
4. Re-classifies flagged hazard/risk assessment questions (e.g. `wch11_2026_june_q15_b` / June 2020 Q15(b)
   and `wch11_2022_october_q6_a`) so `4A (4.1-4.3)` is primary and `4B (4.12-4.16)` is secondary.
5. Caps secondary subtopics at max 1 (`len(relatedSubtopics) <= 1`, max 2 subtopics total per sub-part).
"""

import json
from pathlib import Path
import re
import shutil
import sys
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pymupdf

pymupdf.TOOLS.mupdf_display_errors(False)

from pipeline.gemini_classifier import EdexcelPDFTextCache, UnitTaxonomyResolver
from pipeline.syllabus import (
    ALKANE_FUELS_POLLUTANTS_SUBTOPIC,
    ALKENE_ADDITION_SUBTOPIC,
    EQUATIONS_SUBTOPIC,
    FOUNDATIONAL_GENERIC_SUBTOPICS,
    HAZARD_BROAD_RE,
    HAZARD_SUBTOPIC,
    NOMENCLATURE_SUBTOPIC,
    enforce_chemistry_subtopic_hierarchy,
    get_parent_topic_for_subtopic,
    get_unit_for_subtopic,
    is_subtopic_valid_for_unit,
    normalize_subtopic_name,
)

# Explicit high-precision overrides for audited ambiguous / standalone misclassified Unit 1 questions
CURATED_OVERRIDES: Dict[str, Tuple[str, List[str]]] = {
    # Hazard & Risk Assessment questions on pollutant CO (Phase 2.3 & Phase 3.1)
    "wch11_2026_june_q15_b": (
        HAZARD_SUBTOPIC,
        [ALKANE_FUELS_POLLUTANTS_SUBTOPIC],
    ),
    "wch11_2022_october_q6_a": (
        HAZARD_SUBTOPIC,
        [ALKANE_FUELS_POLLUTANTS_SUBTOPIC],
    ),
    # Standalone 1.3 & 1.12 questions that test a specific syllabus subtopic
    "wch11_2021_january_q21_c_iv": (
        ALKANE_FUELS_POLLUTANTS_SUBTOPIC,
        [EQUATIONS_SUBTOPIC],
    ),
    "wch11_2026_june_q16_a": (
        ALKENE_ADDITION_SUBTOPIC,
        [NOMENCLATURE_SUBTOPIC],
    ),
    "wch11_2021_june_q14": (
        "1.7-1.8 & 1.11: Reacting Masses, Molar Gas Volume, pV=nRT & Core Practical 1",
        [EQUATIONS_SUBTOPIC],
    ),
    "wch11_a_2025_october_q13": (
        "1.1-1.4: Atoms, Moles, Avogadro Constant & Molar Mass (Ar, Mr, ppm)",
        [],
    ),
    "wch11_2023_january_q16": (
        "1.9-1.10: Percentage Yield, Atom Economy & Experimental Formula Determination",
        [EQUATIONS_SUBTOPIC],
    ),
    # Pure mole / concentration calculations where 1.3 & 1.12 was noisy
    "wch11_2023_october_q20_c_iii": (
        "1.5: Solution Concentrations (mol dm^-3 and g dm^-3)",
        [],
    ),
    "wch11_2022_june_q5": (
        "1.5: Solution Concentrations (mol dm^-3 and g dm^-3)",
        [],
    ),
    "wch11_2022_june_q19_a_iii": (
        "1.1-1.4: Atoms, Moles, Avogadro Constant & Molar Mass (Ar, Mr, ppm)",
        [],
    ),
    # Standalone 4A (4.4-4.8) questions that test specific Topic 4B / Topic 5 concepts
    "wch11_2020_october_q22_b_i": (
        "4B (4.17-4.18): Free Radical Substitution of Alkanes (Initiation, Propagation, Termination)",
        [NOMENCLATURE_SUBTOPIC],
    ),
    "wch11_2020_october_q22_b_ii": (
        "4B (4.17-4.18): Free Radical Substitution of Alkanes (Initiation, Propagation, Termination)",
        [],
    ),
    "wch11_2025_january_q26_a": (
        "5.1-5.3: Alkene Structure (Sigma & Pi Bonds) & Geometric Isomerism (Cis/Trans & E/Z)",
        [],
    ),
    "wch11_a_2026_january_q2_a": (
        "5.1-5.3: Alkene Structure (Sigma & Pi Bonds) & Geometric Isomerism (Cis/Trans & E/Z)",
        [],
    ),
    "wch11_2020_october_q2_a": (
        ALKANE_FUELS_POLLUTANTS_SUBTOPIC,
        [NOMENCLATURE_SUBTOPIC],
    ),
    "wch11_2020_october_q19_a_ii": (
        ALKANE_FUELS_POLLUTANTS_SUBTOPIC,
        [],
    ),
    "wch11_2022_october_q16_e_ii": (
        ALKANE_FUELS_POLLUTANTS_SUBTOPIC,
        [EQUATIONS_SUBTOPIC],
    ),
    "wch11_2022_october_q16_e_iii": (
        ALKANE_FUELS_POLLUTANTS_SUBTOPIC,
        [EQUATIONS_SUBTOPIC],
    ),
    # Pure empirical/molecular formula calculations where 4A (4.4-4.8) was usurping 1.6
    "wch11_2025_january_q21_a_i": (
        "1.6: Empirical & Molecular Formulae from Experimental Data",
        [],
    ),
    "wch11_2023_january_q22_a_ii": (
        "1.6: Empirical & Molecular Formulae from Experimental Data",
        [],
    ),
    "wch11_2022_october_q17_b_iii": (
        "1.6: Empirical & Molecular Formulae from Experimental Data",
        [],
    ),
}


def load_pdf_cache() -> Optional[EdexcelPDFTextCache]:
    manifest_path = ROOT_DIR / "pipeline_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                m = json.load(f)
            pairs = m.get("papers", {})
            if pairs:
                return EdexcelPDFTextCache(pairs)
        except Exception:
            pass
    return None


def run_cleanup() -> None:
    dataset_path = ROOT_DIR / "dataset.json"
    public_path = ROOT_DIR / "frontend" / "public" / "dataset.json"
    cache_path = ROOT_DIR / "pipeline" / "classification_cache_chemistry.json"

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset: List[Dict[str, Any]] = json.load(f)

    cache: Dict[str, Dict[str, Any]] = {}
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            cache = json.load(f)

    pdf_cache = load_pdf_cache()
    resolver = UnitTaxonomyResolver("chemistry")

    cross_unit_stripped = 0
    primary_swapped = 0
    hazard_reclassified = 0
    non_hazard_4a_removed = 0
    secondary_capped = 0
    total_modified = 0

    qid_to_unit_code: Dict[str, str] = {}

    for q in dataset:
        qid = q["id"]
        q_unit = q.get("unit") or "Unit 1"
        pid = q.get("paperId") or q.get("paper_id") or ""
        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)
        qid_to_unit_code[qid] = ucode

        orig_main = q.get("mainSubtopic") or q.get("subtopic") or ""
        orig_subs = list(q.get("subtopics") or ([orig_main] if orig_main else []))
        orig_rels = (
            list(q.get("relatedSubtopics"))
            if isinstance(q.get("relatedSubtopics"), list)
            else [s for s in orig_subs if s != orig_main]
        )

        own_qp, own_ms = (str(q.get("text") or "").strip(), "")
        if pdf_cache and q_unit == "Unit 1":
            own_qp, own_ms = pdf_cache.get_subpart_own_texts(q)

        # Track stats before transformation
        if any(get_unit_for_subtopic(s) != q_unit for s in orig_subs):
            cross_unit_stripped += 1
        if len(orig_rels) > 1:
            secondary_capped += 1

        if qid in CURATED_OVERRIDES:
            new_main_sub, new_rel_subs = CURATED_OVERRIDES[qid]
            new_main_top = get_parent_topic_for_subtopic(new_main_sub)
        else:
            new_main_top, new_main_sub, new_rel_subs = enforce_chemistry_subtopic_hierarchy(
                ucode,
                orig_main,
                orig_rels,
                own_prompt_text=own_qp,
                own_ms_text=own_ms,
            )

        if orig_main != new_main_sub:
            if new_main_sub == HAZARD_SUBTOPIC:
                hazard_reclassified += 1
            else:
                primary_swapped += 1

        if HAZARD_SUBTOPIC in orig_subs and HAZARD_SUBTOPIC not in ([new_main_sub] + new_rel_subs):
            non_hazard_4a_removed += 1

        new_all_subs = [new_main_sub] + [r for r in new_rel_subs if r != new_main_sub]
        new_topics = [new_main_top]
        for r in new_rel_subs:
            pt = get_parent_topic_for_subtopic(r)
            if pt and pt not in new_topics:
                new_topics.append(pt)

        if (
            q.get("mainTopic") != new_main_top
            or q.get("mainSubtopic") != new_main_sub
            or q.get("relatedSubtopics") != new_rel_subs
            or q.get("subtopics") != new_all_subs
            or q.get("topics") != new_topics
        ):
            total_modified += 1

        q["mainTopic"] = new_main_top
        q["mainSubtopic"] = new_main_sub
        q["relatedSubtopics"] = new_rel_subs
        q["topic"] = new_main_top
        q["subtopic"] = new_main_sub
        q["subtopics"] = new_all_subs
        q["topics"] = new_topics

        # Sync into classification cache
        cache[qid] = {
            "unitCode": ucode,
            "mainTopic": new_main_top,
            "mainSubtopic": new_main_sub,
            "relatedSubtopics": new_rel_subs,
            "topic": new_main_top,
            "subtopic": new_main_sub,
            "subtopics": new_all_subs,
            "topics": new_topics,
        }

    # Also sanitize any orphan entries in classification_cache_chemistry.json not currently in dataset.json
    dataset_qids = {q["id"] for q in dataset}
    for c_qid, c_entry in list(cache.items()):
        if c_qid in dataset_qids:
            continue
        c_ucode = c_entry.get("unitCode") or "WCH11"
        c_main = c_entry.get("mainSubtopic") or c_entry.get("subtopic") or ""
        c_rels = c_entry.get("relatedSubtopics") or [
            s for s in c_entry.get("subtopics", []) if s != c_main
        ]
        m_top, m_sub, r_subs = enforce_chemistry_subtopic_hierarchy(c_ucode, c_main, c_rels)
        all_s = [m_sub] + [r for r in r_subs if r != m_sub]
        tops = [m_top]
        for r in r_subs:
            pt = get_parent_topic_for_subtopic(r)
            if pt and pt not in tops:
                tops.append(pt)
        cache[c_qid] = {
            "unitCode": c_ucode,
            "mainTopic": m_top,
            "mainSubtopic": m_sub,
            "relatedSubtopics": r_subs,
            "topic": m_top,
            "subtopic": m_sub,
            "subtopics": all_s,
            "topics": tops,
        }

    with open(dataset_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    if public_path.parent.exists():
        shutil.copy2(dataset_path, public_path)

    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

    print("=" * 78)
    print("PHASE 3: CHEMISTRY DATASET & CACHE CLEANUP COMPLETE")
    print("=" * 78)
    print(f"Total Questions Processed              : {len(dataset):,}")
    print(f"Total Questions Updated                : {total_modified:,}")
    print(f"Cross-Unit Violations Stripped         : {cross_unit_stripped:,}")
    print(f"Primary Topic Hijacks Corrected        : {primary_swapped:,}")
    print(f"Hazard/Risk Questions Reclassified     : {hazard_reclassified:,}")
    print(f"Non-Hazard 4A (4.1-4.3) Bleeds Removed : {non_hazard_4a_removed:,}")
    print(f"Excessive Secondary Tags Capped (<=1)  : {secondary_capped:,}")
    print(f"Synced to                              : {dataset_path.name}, frontend/public/{public_path.name}, {cache_path.name}")
    print("=" * 78)


if __name__ == "__main__":
    run_cleanup()
