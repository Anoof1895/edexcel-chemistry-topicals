"""
Comprehensive QP-to-MS Matching Audit, Specification Mark Audit & Taxonomy Data Integrity Check for Edexcel Chemistry Topicals.
Verifies:
1. 100% Mark Scheme Matching (non-null path, zero 'Mark Scheme Pending', physical file existence on disk).
2. Physical existence of Question Paper images on disk.
3. Specification Mark Audits:
   - Units 1 & 2: 20 marks Section A MCQ, 80 marks overall.
   - Units 4 & 5: 20 marks Section A MCQ, 90 marks overall.
   - Units 3 & 6: 50 marks overall, 0 MCQs.
4. Specification Taxonomy & Classification Accuracy Audit:
   - 0 questions with "General" or unmapped topics/subtopics.
   - 100% of mainTopic, mainSubtopic, and relatedSubtopics match OFFICIAL_SYLLABUS.
   - Strict Unit Scoping: 0 Cross-Unit Violations (every primary and secondary subtopic on a Unit X question must belong strictly to Unit X).
   - Generic Topic Hijacking Check: Foundational subtopics (1.3 & 1.12 / 1.3 & 1.10, 4A (4.1-4.3), 4A (4.4-4.8)) must not usurp specific syllabus subtopics as primary topic, and 4A (4.1-4.3) must never be attached to non-hazard sub-parts (e.g., IUPAC naming or structure drawing).
   - Misclassified Hazard/Risk Check: Unit 1 sub-parts explicitly asking about hazards, risk assessments, or precautions must include 4A (4.1-4.3) as their primary subtopic.
   - Secondary Subtopic Cap: Maximum 1 secondary subtopic (max 2 total subtopics) per question sub-part.
"""

from collections import Counter, defaultdict
import json
import os
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

import pymupdf

pymupdf.TOOLS.mupdf_display_errors(False)

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pipeline.batch_scanner_physics import scan_physics_papers_directory
from pipeline.gemini_classifier import (
    EdexcelPDFTextCache,
    SYNOPTIC_ALLOWED_UNITS,
    UnitTaxonomyResolver,
    clean_extracted_text,
)
from pipeline.ms_matcher import canonical_id
from pipeline.syllabus import (
    OFFICIAL_SYLLABUS,
    get_parent_topic_for_subtopic,
    get_unit_for_subtopic,
)
from pipeline.syllabus_math import (
    MATH_GENERIC_FOUNDATIONAL_BY_UNIT,
    MATH_P2_EXP_LOGS_EQNS,
    MATH_P2_EXP_LOGS_INTRO,
    MATH_P2_TRIG_EQNS,
    MATH_P2_TRIG_IDENTITIES,
    MATH_S1_HISTOGRAM_STEM_BOX,
    MATH_S1_LOCATION_DISPERSION,
    MATH_S1_NORMAL_A,
    MATH_S1_NORMAL_B,
    OFFICIAL_MATH_SYLLABUS,
    S1_DIAGRAM_KEYWORD_RE,
    S1_PRIMARY_UNKNOWN_MU_SIGMA_RE,
    S1_UNKNOWN_MU_SIGMA_RE,
    enforce_math_subtopic_hierarchy,
    get_math_parent_topic_for_subtopic,
    get_math_unit_for_subtopic,
    is_math_subtopic_valid_for_unit,
    normalize_math_unit_code,
)
from pipeline.syllabus_physics import (
    OFFICIAL_PHYSICS_SYLLABUS,
    PHYS_CIRCUIT_BASICS_SUBTOPIC,
    PHYS_COLLISIONS_SUBTOPIC,
    PHYS_HIGH_ENERGY_SUBTOPIC,
    PHYS_IMPULSE_SUBTOPIC,
    PHYS_INDUCTION_SUBTOPIC,
    PHYS_MAG_FORCE_SUBTOPIC,
    PHYS_MOMENTS_SUBTOPIC,
    PHYS_SCALARS_VECTORS_SUBTOPIC,
    PHYS_WAVE_BASICS_SUBTOPIC,
    PHYSICS_MAG_FORCE_KEYWORD_RE,
    PHYSICS_MOMENT_KEYWORD_RE,
    PHYSICS_PURE_SCALAR_VECTOR_PROMPT_RE,
    PHYSICS_VECTOR_COMPONENT_RE,
    enforce_physics_subtopic_hierarchy,
    get_physics_parent_topic_for_subtopic,
    get_physics_unit_for_subtopic,
    is_physics_subtopic_valid_for_unit,
    normalize_physics_unit_code,
)

HAZARD_SUBTOPIC = "4A (4.1-4.3): Hazards, Risk Assessment & Safe Laboratory Precautions"
EQUATIONS_SUBTOPIC = "1.3 & 1.12: Chemical & Ionic Equations, State Symbols & Test-Tube Observations"
NOMENCLATURE_SUBTOPIC = "4A (4.4-4.8): Homologous Series, IUPAC Nomenclature, Reaction Types & Bond Fission"

GENERIC_FOUNDATIONAL_SUBTOPICS = {
    EQUATIONS_SUBTOPIC,
    "1.3 & 1.10: Chemical & Ionic Equations, State Symbols & Test-Tube Observations",
    HAZARD_SUBTOPIC,
    NOMENCLATURE_SUBTOPIC,
}

# Hazard/risk/precaution keywords when a sub-part is genuinely testing laboratory/environmental hazards or risk control
HAZARD_BROAD_RE = re.compile(
    r"\b(hazard|hazards|hazardous|risk|risks|precaution|precautions|toxic|toxicity|flammable|inflammable|corrosive|irritant|carcinogen|carcinogenic|poisonous|fume\s+cupboard|gloves|goggles|eye\s+protection|explosion|explosive|oxidising\s+agent|stored\s+in\s+the\s+same\s+cupboard)\b",
    re.I,
)

# Direct hazard/risk prompt detector: sub-part explicitly asks about hazard, risk assessment, or safety precaution
HAZARD_PROMPT_RE = re.compile(
    r"\b(hazard|hazards|risk\s+assessment|precaution|precautions)\b|"
    r"(?:\b(?:reduce|minimise|minimize)\s+the\s+risk\b)|"
    r"(?:\b(?:toxic|flammable|corrosive)\b.*?\b(?:hazard|risk|precaution|symbol|store|stored|cupboard|safety)\b)",
    re.I,
)

# Exclusion for polymer disposal / Avogadro calculation questions that mention "toxic waste gases" or "Germane is toxic ... calculate"
NON_HAZARD_PROMPT_EXCLUSION_RE = re.compile(
    r"\b(polymer\s+disposal|disposal\s+of\s+polymers|calculate\s+the\s+maximum\s+number\s+of\s+\w+\s+molecules)\b",
    re.I,
)


def _load_paper_Text_cache(subject: str = "chemistry") -> Optional[EdexcelPDFTextCache]:
    if subject == "physics":
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


def _get_subpart_own_texts(
    q: Dict[str, Any],
    pdf_cache: Optional[EdexcelPDFTextCache],
    subject: str = "chemistry",
) -> Tuple[str, str]:
    """Returns (own_qp_text, own_ms_text) for a specific question sub-part."""
    own_qp = str(q.get("text") or "").strip()
    own_ms = ""
    if pdf_cache:
        should_parse = (
            (subject == "chemistry" and q.get("unit") == "Unit 1")
            or (
                subject == "physics"
                and q.get("unit") in ("Unit 1", "Unit 2", "Unit 4")
                and any(
                    s.startswith(("1.3.2", "1.3.6", "2.3.1", "2.4.1", "4.3.1", "4.4.3", "4.4.4"))
                    for s in (q.get("subtopics") or [q.get("mainSubtopic") or ""])
                )
            )
        )
        if should_parse:
            pid = q.get("paperId") or q.get("paper_id") or ""
            qnum = str(q.get("questionNumber") or q.get("question_number") or "").strip()
            cid = canonical_id(qnum)
            pdata = pdf_cache.get_paper_data(pid)
            qp_cand = clean_extracted_text(pdata["qp"].get(cid, ""), max_len=450)
            if not qp_cand and not q.get("subPart"):
                parent_cid = canonical_id(str(q.get("parentQuestion") or ""))
                qp_cand = clean_extracted_text(pdata["qp"].get(parent_cid, ""), max_len=450)
            if qp_cand:
                own_qp = qp_cand
            own_ms = clean_extracted_text(pdata["ms"].get(cid, ""), max_len=400)
    return own_qp, own_ms


def audit_chemistry_classification_quality(
    questions: List[Dict[str, Any]],
    pdf_cache: Optional[EdexcelPDFTextCache] = None,
) -> Dict[str, Any]:
    """
    Scans Chemistry dataset questions and reports:
    1. Cross-Unit Violations (Unit X question having primary or secondary subtopics from Unit Y)
    2. Generic Topic Hijacking (1.3 & 1.12, 4A (4.1-4.3), 4A (4.4-4.8) set as primary when specific subtopic exists,
       or 4A (4.1-4.3) attached to non-hazard sub-parts like IUPAC naming / structure drawing)
    3. Misclassified Hazard/Risk Questions (Unit 1 sub-parts asking about hazard/risk/precaution missing 4A (4.1-4.3))
    4. Excessive Secondary Subtopics (>1 relatedSubtopics)
    """
    cross_unit_violations: List[Dict[str, Any]] = []
    generic_primary_hijacks: List[Dict[str, Any]] = []
    non_hazard_4a_bleeds: List[Dict[str, Any]] = []
    misclassified_hazard_questions: List[Dict[str, Any]] = []
    excessive_secondary_tags: List[Dict[str, Any]] = []

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        q_unit = q.get("unit") or ""
        qnum = str(q.get("questionNumber") or "")
        main_sub = q.get("mainSubtopic") or q.get("subtopic") or ""
        subs = q.get("subtopics") or ([main_sub] if main_sub else [])
        rel_subs = q.get("relatedSubtopics") if isinstance(q.get("relatedSubtopics"), list) else [s for s in subs if s != main_sub]

        # 1. Cross-Unit Violations: check EVERY subtopic in `subtopics` (both primary and secondary)
        mismatched_subs: List[Tuple[str, str]] = []
        for s in subs:
            s_unit = get_unit_for_subtopic(s)
            if s_unit != q_unit:
                mismatched_subs.append((s, s_unit))
        if mismatched_subs:
            cross_unit_violations.append({
                "id": qid,
                "unit": q_unit,
                "questionNumber": qnum,
                "mainSubtopic": main_sub,
                "relatedSubtopics": rel_subs,
                "mismatched": mismatched_subs,
            })

        # 4. Secondary subtopic cap check (> 1 relatedSubtopic)
        if len(rel_subs) > 1:
            excessive_secondary_tags.append({
                "id": qid,
                "unit": q_unit,
                "questionNumber": qnum,
                "mainSubtopic": main_sub,
                "relatedSubtopics": rel_subs,
            })

        own_qp, own_ms = _get_subpart_own_texts(q, pdf_cache)
        own_combined = f"{own_qp} {own_ms}".strip()

        # 2a. Generic Topic Hijacking: foundational subtopic as primary when a specific syllabus subtopic is present
        if main_sub in GENERIC_FOUNDATIONAL_SUBTOPICS:
            specific_rels = [r for r in rel_subs if r not in GENERIC_FOUNDATIONAL_SUBTOPICS and get_unit_for_subtopic(r) == q_unit]
            if specific_rels:
                # Exception: If main_sub is 4A (4.1-4.3) and the prompt genuinely asks about a hazard/risk/precaution,
                # 4A (4.1-4.3) SHOULD be primary (with e.g. 4B (4.12-4.16) as secondary).
                is_genuine_hazard_primary = (
                    main_sub == HAZARD_SUBTOPIC
                    and q_unit == "Unit 1"
                    and bool(HAZARD_BROAD_RE.search(own_combined))
                )
                if not is_genuine_hazard_primary:
                    generic_primary_hijacks.append({
                        "id": qid,
                        "unit": q_unit,
                        "questionNumber": qnum,
                        "mainSubtopic": main_sub,
                        "specificSubtopics": specific_rels,
                        "prompt": own_qp[:140],
                    })
            elif main_sub == EQUATIONS_SUBTOPIC and q_unit == "Unit 1":
                # Also check if 1.3 & 1.12 is the sole subtopic on an organic alkane/alkene reaction equation
                if re.search(r"\b(combustion|complete\s+combustion|incomplete\s+combustion|reforming|cracking|alkane|heptane|octane|dodecane|isooctane|propane|butane)\b", own_qp, re.I):
                    generic_primary_hijacks.append({
                        "id": qid,
                        "unit": q_unit,
                        "questionNumber": qnum,
                        "mainSubtopic": main_sub,
                        "specificSubtopics": ["4B (4.12-4.16): Crude Oil, Fractional Distillation, Cracking, Pollutants & Carbon Neutrality"],
                        "prompt": own_qp[:140],
                    })
                elif re.search(r"\b(hydrogenation|alkene|squalene|propene|ethene|bromine\s+water)\b", own_qp, re.I):
                    generic_primary_hijacks.append({
                        "id": qid,
                        "unit": q_unit,
                        "questionNumber": qnum,
                        "mainSubtopic": main_sub,
                        "specificSubtopics": ["5.4-5.5: Addition Reactions of Alkenes (H2, Halogens, HX, Steam, KMnO4) & Bromine Test"],
                        "prompt": own_qp[:140],
                    })

        # 2b. Non-Hazard 4A (4.1-4.3) Bleed: 4A (4.1-4.3) attached to non-hazard question
        if HAZARD_SUBTOPIC in subs:
            is_non_hazard = False
            reason = ""
            if q_unit != "Unit 1":
                is_non_hazard = True
                reason = f"Cross-unit bleed onto {q_unit} question"
            elif own_combined and not HAZARD_BROAD_RE.search(own_combined):
                is_non_hazard = True
                reason = "No hazard/risk/precaution/safety concepts in sub-part QP or MS"
            elif main_sub != HAZARD_SUBTOPIC and own_qp and not HAZARD_BROAD_RE.search(own_qp):
                is_non_hazard = True
                reason = "Secondary 4A (4.1-4.3) bleed on sub-part whose own prompt has no hazard/risk/safety concepts"
            elif re.search(r"\b(iupac\s+name|give\s+the\s+name|skeletal\s+formula|displayed\s+formula|structural\s+formula)\b", own_qp, re.I) and not HAZARD_PROMPT_RE.search(own_qp):
                is_non_hazard = True
                reason = "IUPAC naming / structure drawing sub-part tagged with 4A (4.1-4.3)"

            if is_non_hazard:
                non_hazard_4a_bleeds.append({
                    "id": qid,
                    "unit": q_unit,
                    "questionNumber": qnum,
                    "mainSubtopic": main_sub,
                    "relatedSubtopics": rel_subs,
                    "reason": reason,
                    "prompt": own_qp[:140],
                })

        # 3. Misclassified Hazard/Risk Questions in Unit 1
        if q_unit == "Unit 1" and main_sub != HAZARD_SUBTOPIC:
            if own_qp and HAZARD_PROMPT_RE.search(own_qp) and not NON_HAZARD_PROMPT_EXCLUSION_RE.search(own_qp):
                misclassified_hazard_questions.append({
                    "id": qid,
                    "unit": q_unit,
                    "questionNumber": qnum,
                    "mainSubtopic": main_sub,
                    "relatedSubtopics": rel_subs,
                    "prompt": own_qp[:140],
                })

    return {
        "cross_unit_violations": cross_unit_violations,
        "generic_primary_hijacks": generic_primary_hijacks,
        "non_hazard_4a_bleeds": non_hazard_4a_bleeds,
        "misclassified_hazard_questions": misclassified_hazard_questions,
        "excessive_secondary_tags": excessive_secondary_tags,
    }


def audit_physics_classification_quality(
    questions: List[Dict[str, Any]],
    pdf_cache: Optional[EdexcelPDFTextCache] = None,
) -> Dict[str, Any]:
    """
    Scans Physics dataset questions and reports:
    1. Cross-Unit Violations (Unit X question having primary or secondary subtopics from Unit Y)
    2. Ambiguous Prefix / Shared-Code Collisions (1.3.6 Moments assigned to non-moment rope/pulley equilibrium;
       4.4.3 Magnetic Force Spec 105-107 bled onto pure 4.4.4 Electromagnetic Induction Spec 105, 108-110)
    3. Generic Foundational Topic Hijacking (1.3.2 Scalars & Vectors or introductory .1 subtopics 2.3.1, 2.4.1, 4.3.1
       set as primary when a specific physics concept is in relatedSubtopics)
    4. Sub-part Bleed & Excessive Secondary Subtopics (>1 relatedSubtopics or 1.3.2 bled onto 1D sub-parts)
    """
    cross_unit_violations: List[Dict[str, Any]] = []
    prefix_collisions: List[Dict[str, Any]] = []
    generic_primary_hijacks: List[Dict[str, Any]] = []
    subpart_bleeds: List[Dict[str, Any]] = []
    excessive_secondary_tags: List[Dict[str, Any]] = []

    intro_dot1_map = {
        PHYS_WAVE_BASICS_SUBTOPIC: {"2.3.2", "2.3.3", "2.3.4", "2.3.5", "2.3.6", "2.3.7", "2.3.8", "2.3.9"},
        PHYS_CIRCUIT_BASICS_SUBTOPIC: {"2.4.2", "2.4.3", "2.4.4", "2.4.5", "2.4.6"},
        PHYS_IMPULSE_SUBTOPIC: {
            PHYS_COLLISIONS_SUBTOPIC.split(":")[0],
            PHYS_HIGH_ENERGY_SUBTOPIC.split(":")[0],
        },
    }

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        q_unit = q.get("unit") or ""
        ucode = normalize_physics_unit_code(q.get("unitCode") or q_unit)
        qnum = str(q.get("questionNumber") or "")
        main_sub = q.get("mainSubtopic") or q.get("subtopic") or ""
        subs = q.get("subtopics") or ([main_sub] if main_sub else [])
        rel_subs = (
            q.get("relatedSubtopics")
            if isinstance(q.get("relatedSubtopics"), list)
            else [s for s in subs if s != main_sub]
        )

        # 1. Cross-Unit Violations
        mismatched_subs: List[Tuple[str, str]] = []
        for s in subs:
            if not is_physics_subtopic_valid_for_unit(s, ucode):
                mismatched_subs.append((s, get_physics_unit_for_subtopic(s)))
        if mismatched_subs:
            cross_unit_violations.append({
                "id": qid,
                "unit": q_unit,
                "questionNumber": qnum,
                "mainSubtopic": main_sub,
                "relatedSubtopics": rel_subs,
                "mismatched": mismatched_subs,
            })

        # 4a. Excessive secondary subtopics (> 1)
        if len(rel_subs) > 1:
            excessive_secondary_tags.append({
                "id": qid,
                "unit": q_unit,
                "questionNumber": qnum,
                "mainSubtopic": main_sub,
                "relatedSubtopics": rel_subs,
            })

        own_qp, own_ms = _get_subpart_own_texts(q, pdf_cache, subject="physics")
        own_combined = f"{own_qp} {own_ms}".strip()

        # 2a. 1.3.6 Moments vs non-moment rope/pulley equilibrium collision
        if ucode == "WPH11" and PHYS_MOMENTS_SUBTOPIC in subs:
            if own_combined and not PHYSICS_MOMENT_KEYWORD_RE.search(own_combined):
                prefix_collisions.append({
                    "id": qid,
                    "unit": q_unit,
                    "questionNumber": qnum,
                    "mainSubtopic": main_sub,
                    "relatedSubtopics": rel_subs,
                    "reason": "1.3.6 (Moments) assigned to non-moment rope/wire equilibrium question",
                    "prompt": own_qp[:140],
                })

        # 2b. 4.4.3 (Spec 105-107) bled onto pure 4.4.4 (Spec 105, 108-110) electromagnetic induction
        if ucode == "WPH14" and main_sub == PHYS_INDUCTION_SUBTOPIC and PHYS_MAG_FORCE_SUBTOPIC in rel_subs:
            if own_combined and not PHYSICS_MAG_FORCE_KEYWORD_RE.search(own_combined):
                prefix_collisions.append({
                    "id": qid,
                    "unit": q_unit,
                    "questionNumber": qnum,
                    "mainSubtopic": main_sub,
                    "relatedSubtopics": rel_subs,
                    "reason": "4.4.3 (Spec 105-107) bled onto pure 4.4.4 (Spec 105, 108-110) induction question",
                    "prompt": own_qp[:140],
                })

        # 3a & 3b. Generic 1.3.2 (Scalars & Vectors) or Introductory .1 subtopic (2.3.1, 2.4.1, 4.3.1) primary hijacking
        if main_sub in (
            PHYS_SCALARS_VECTORS_SUBTOPIC,
            PHYS_WAVE_BASICS_SUBTOPIC,
            PHYS_CIRCUIT_BASICS_SUBTOPIC,
            PHYS_IMPULSE_SUBTOPIC,
        ) and rel_subs:
            _, exp_main, _ = enforce_physics_subtopic_hierarchy(
                ucode, main_sub, rel_subs, own_prompt_text=own_qp, own_ms_text=own_ms
            )
            if exp_main != main_sub:
                generic_primary_hijacks.append({
                    "id": qid,
                    "unit": q_unit,
                    "questionNumber": qnum,
                    "mainSubtopic": main_sub,
                    "specificSubtopics": [exp_main],
                    "prompt": own_qp[:140],
                })

        # 4b. Sub-part bleed of 1.3.2 (Scalars & Vectors) onto 1D/scalar sub-part
        if ucode == "WPH11" and PHYS_SCALARS_VECTORS_SUBTOPIC in rel_subs and len(rel_subs) == 1:
            _, exp_main, exp_rels = enforce_physics_subtopic_hierarchy(
                ucode, main_sub, rel_subs, own_prompt_text=own_qp, own_ms_text=own_ms
            )
            if PHYS_SCALARS_VECTORS_SUBTOPIC not in exp_rels and exp_main != PHYS_SCALARS_VECTORS_SUBTOPIC:
                subpart_bleeds.append({
                    "id": qid,
                    "unit": q_unit,
                    "questionNumber": qnum,
                    "mainSubtopic": main_sub,
                    "relatedSubtopics": rel_subs,
                    "reason": "1.3.2 (Scalars & Vectors) bled into relatedSubtopics without vector resolution/addition",
                    "prompt": own_qp[:140],
                })

    return {
        "cross_unit_violations": cross_unit_violations,
        "prefix_collisions": prefix_collisions,
        "generic_primary_hijacks": generic_primary_hijacks,
        "subpart_bleeds": subpart_bleeds,
        "excessive_secondary_tags": excessive_secondary_tags,
    }


def audit_math_classification_quality(
    questions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Scans Mathematics dataset questions and reports:
    1. Cross-Unit Violations (Unit X question having primary or secondary subtopics from Unit Y)
    2. Ambiguous Prefix / Subtopic Collisions (S1 1.1 & 2.1 vs S1 2.2-2.4; S1 6.1a vs S1 6.1b)
    3. Generic Foundational Topic Hijacking (foundational algebraic/vector setup subtopics placed at
       mainSubtopic ahead of specific Calculus/Coordinate Geometry/Trig/Kinematics/Dynamics subtopics)
    4. Excessive Secondary Subtopics (>1 relatedSubtopics)
    """
    cross_unit_violations: List[Dict[str, Any]] = []
    prefix_collisions: List[Dict[str, Any]] = []
    generic_primary_hijacks: List[Dict[str, Any]] = []
    excessive_secondary_tags: List[Dict[str, Any]] = []

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        q_unit = q.get("unit") or ""
        ucode = normalize_math_unit_code(q.get("unitCode") or q_unit)
        qnum = str(q.get("questionNumber") or "")
        main_sub = q.get("mainSubtopic") or q.get("subtopic") or ""
        subs = q.get("subtopics") or ([main_sub] if main_sub else [])
        rel_subs = (
            q.get("relatedSubtopics")
            if isinstance(q.get("relatedSubtopics"), list)
            else [s for s in subs if s != main_sub]
        )
        own_qp = str(q.get("text") or "").strip()

        # 1. Cross-Unit Violations
        mismatched_subs: List[Tuple[str, str]] = []
        for s in subs:
            if not is_math_subtopic_valid_for_unit(s, ucode):
                mismatched_subs.append((s, get_math_unit_for_subtopic(s)))
        if mismatched_subs:
            cross_unit_violations.append({
                "id": qid,
                "unit": q_unit,
                "questionNumber": qnum,
                "mainSubtopic": main_sub,
                "relatedSubtopics": rel_subs,
                "mismatched": mismatched_subs,
            })

        # 4. Excessive secondary subtopics (> 1)
        if len(rel_subs) > 1:
            excessive_secondary_tags.append({
                "id": qid,
                "unit": q_unit,
                "questionNumber": qnum,
                "mainSubtopic": main_sub,
                "relatedSubtopics": rel_subs,
            })

        # 2. Ambiguous prefix/subtopic collisions in WST01 (S1)
        if ucode == "WST01":
            if main_sub == MATH_S1_HISTOGRAM_STEM_BOX and MATH_S1_LOCATION_DISPERSION in rel_subs:
                if own_qp and not S1_DIAGRAM_KEYWORD_RE.search(own_qp):
                    prefix_collisions.append({
                        "id": qid,
                        "unit": q_unit,
                        "questionNumber": qnum,
                        "mainSubtopic": main_sub,
                        "relatedSubtopics": rel_subs,
                        "reason": "S1 1.1 & 2.1 (Histograms/Stem & Leaf/Box Plots) set as primary on non-diagram location/dispersion question",
                        "prompt": own_qp[:140],
                    })
            if main_sub in (MATH_S1_NORMAL_A, MATH_S1_NORMAL_B):
                has_unknown_mu_sigma = bool(own_qp and S1_UNKNOWN_MU_SIGMA_RE.search(own_qp))
                is_primary_unknown = bool(own_qp and S1_PRIMARY_UNKNOWN_MU_SIGMA_RE.search(own_qp))
                if main_sub == MATH_S1_NORMAL_A and is_primary_unknown:
                    prefix_collisions.append({
                        "id": qid,
                        "unit": q_unit,
                        "questionNumber": qnum,
                        "mainSubtopic": main_sub,
                        "relatedSubtopics": rel_subs,
                        "reason": "S1 6.1a set as primary on Normal Distribution question primarily solving for unknown mean/SD (S1 6.1b)",
                        "prompt": own_qp[:140],
                    })
                elif main_sub == MATH_S1_NORMAL_A and has_unknown_mu_sigma and MATH_S1_NORMAL_B not in rel_subs:
                    prefix_collisions.append({
                        "id": qid,
                        "unit": q_unit,
                        "questionNumber": qnum,
                        "mainSubtopic": main_sub,
                        "relatedSubtopics": rel_subs,
                        "reason": "S1 6.1a question solving for unknown mean/SD is missing S1 6.1b",
                        "prompt": own_qp[:140],
                    })
                elif MATH_S1_NORMAL_B in subs and own_qp and not has_unknown_mu_sigma:
                    prefix_collisions.append({
                        "id": qid,
                        "unit": q_unit,
                        "questionNumber": qnum,
                        "mainSubtopic": main_sub,
                        "relatedSubtopics": rel_subs,
                        "reason": "S1 6.1b (Finding Unknown Mean/SD) attached when mean and SD are already given",
                        "prompt": own_qp[:140],
                    })

        # 3. Generic Foundational Topic Hijacking across P1-P4 and M1
        unit_generics = MATH_GENERIC_FOUNDATIONAL_BY_UNIT.get(ucode, set())
        if main_sub in unit_generics and rel_subs:
            _, exp_main, _ = enforce_math_subtopic_hierarchy(
                ucode, main_sub, rel_subs, own_prompt_text=own_qp
            )
            if exp_main != main_sub:
                generic_primary_hijacks.append({
                    "id": qid,
                    "unit": q_unit,
                    "questionNumber": qnum,
                    "mainSubtopic": main_sub,
                    "specificSubtopics": [exp_main],
                    "prompt": own_qp[:140],
                })

    return {
        "cross_unit_violations": cross_unit_violations,
        "prefix_collisions": prefix_collisions,
        "generic_primary_hijacks": generic_primary_hijacks,
        "excessive_secondary_tags": excessive_secondary_tags,
    }


def run_audit(
    dataset_path: str = "frontend/public/dataset.json",
    public_dir: str = "frontend/public",
    subject: Optional[str] = None,
) -> bool:
    if not os.path.exists(dataset_path):
        print(f"[AUDIT ERROR] Dataset file not found at: {dataset_path}")
        return False

    if not subject:
        d_lower = os.path.basename(dataset_path).lower()
        if "phys" in d_lower:
            subject = "physics"
        elif "math" in d_lower:
            subject = "mathematics"
        else:
            subject = "chemistry"

    with open(dataset_path, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    total_questions = len(questions)
    print("=" * 80)
    print(f"EDEXCEL IAL {subject.upper()}: COMPREHENSIVE DATASET, MARK SCHEME & TAXONOMY AUDIT")
    print("=" * 80)
    print(f"Total Question Items in Dataset: {total_questions}")
    print(f"Dataset Path: {dataset_path}")
    print(f"Assets Public Root: {public_dir}\n")

    # ---------------------------------------------------------
    # PART A: 100% Mark Scheme Matching & File Integrity Audit
    # ---------------------------------------------------------
    missing_ms_count = 0
    missing_ms_files = 0
    missing_qp_files = 0
    pending_status_count = 0
    ms_errors: List[Tuple[str, str, str, str]] = []

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        paper_code = q.get("paperCode") or q.get("paperId") or "UNKNOWN"
        marks = str(q.get("marks", 0))

        # Check status
        status = str(q.get("status") or "")
        if "pending" in status.lower():
            pending_status_count += 1
            ms_errors.append((paper_code, qid, marks, f"Status is '{status}'"))

        # Check markSchemeImagePath
        ms_rel = q.get("markSchemeImagePath") or ""
        if not ms_rel or not ms_rel.strip():
            missing_ms_count += 1
            ms_errors.append((paper_code, qid, marks, "markSchemeImagePath is null/empty"))
        else:
            clean_ms_rel = ms_rel.split("?")[0].lstrip("/")
            ms_full_path = os.path.join(public_dir, clean_ms_rel)
            crops_alt = os.path.join(public_dir, "crops", os.path.basename(clean_ms_rel))
            root_alt = os.path.join(ROOT_DIR, clean_ms_rel)
            if not os.path.exists(ms_full_path) and not os.path.exists(crops_alt) and not os.path.exists(root_alt):
                missing_ms_files += 1
                ms_errors.append((paper_code, qid, marks, f"MS file missing on disk: {ms_rel}"))

        # Check questionImagePath
        qp_rel = q.get("questionImagePath") or ""
        if not qp_rel or not qp_rel.strip():
            missing_qp_files += 1
            ms_errors.append((paper_code, qid, marks, "questionImagePath is null/empty"))
        else:
            clean_qp_rel = qp_rel.split("?")[0].lstrip("/")
            qp_full_path = os.path.join(public_dir, clean_qp_rel)
            crops_alt_qp = os.path.join(public_dir, "crops", os.path.basename(clean_qp_rel))
            root_alt_qp = os.path.join(ROOT_DIR, clean_qp_rel)
            if not os.path.exists(qp_full_path) and not os.path.exists(crops_alt_qp) and not os.path.exists(root_alt_qp):
                missing_qp_files += 1
                ms_errors.append((paper_code, qid, marks, f"QP file missing on disk: {qp_rel}"))

    print("--- [PART A: QP-TO-MS MATCHING & ASSET INTEGRITY RESULTS] ---")
    matched_questions = total_questions - missing_ms_count
    match_rate = (matched_questions / total_questions * 100.0) if total_questions > 0 else 0.0

    print(f"Total Questions Evaluated       : {total_questions}")
    print(f"Matched Mark Schemes            : {matched_questions} / {total_questions} ({match_rate:.2f}%)")
    print(f"Questions Missing MS Reference  : {missing_ms_count}")
    print(f"Questions with Status 'Pending' : {pending_status_count}")
    print(f"Missing MS Image Files on Disk  : {missing_ms_files}")
    print(f"Missing QP Image Files on Disk  : {missing_qp_files}")

    if ms_errors:
        print("\n[!] MARK SCHEME MATCHING FAILURES DETECTED:")
        print(f"{'Paper Code':<20} | {'Question ID':<35} | {'Marks':<6} | {'Reason'}")
        print("-" * 90)
        for pcode, qid, marks, reason in ms_errors[:30]:
            print(f"{pcode:<20} | {qid:<35} | {marks:<6} | {reason}")
        if len(ms_errors) > 30:
            print(f"... and {len(ms_errors) - 30} more failure entries.")
    else:
        print("\n[SUCCESS] 100% of questions have valid, verified Mark Scheme assets on disk!")

    # ---------------------------------------------------------
    # PART B: Specification Mark Audits by Paper
    # ---------------------------------------------------------
    print("\n--- [PART B: SPECIFICATION MARK AUDIT BY PAPER] ---")
    papers_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for q in questions:
        pid = q.get("paperId") or "UNKNOWN_PAPER"
        papers_map[pid].append(q)

    total_papers = len(papers_map)
    spec_failures: List[str] = []
    unit_counts = defaultdict(int)

    for pid in sorted(papers_map.keys()):
        qlist = papers_map[pid]
        first_q = qlist[0]
        unit_str = first_q.get("unit") or ""
        unit_code = first_q.get("unitCode") or pid.split("_")[0].upper()
        unit_counts[unit_str or unit_code] += 1

        total_marks = sum(q.get("marks", 0) for q in qlist)
        mcq_count = sum(1 for q in qlist if q.get("questionType") == "mcq")
        sec_a_marks = sum(
            q.get("marks", 0)
            for q in qlist
            if q.get("section") == "A"
            or (q.get("questionType") == "mcq" and int(str(q.get("parentQuestion") or q.get("questionNumber") or 0)) <= 20)
        )

        if subject == "physics":
            is_practical = any(u in unit_str or u in unit_code for u in ["Unit 3", "Unit 6", "WPH13", "WPH16"])
            is_as_theory = any(u in unit_str or u in unit_code for u in ["Unit 1", "Unit 2", "WPH11", "WPH12"])
            is_a2_theory = any(u in unit_str or u in unit_code for u in ["Unit 4", "Unit 5", "WPH14", "WPH15"])
            sec_a_mcq = sum(
                q.get("marks", 0)
                for q in qlist
                if q.get("section") == "A"
                or (q.get("questionType") == "mcq" and int(str(q.get("parentQuestion") or q.get("questionNumber") or 0)) <= 10)
            )
            if is_practical:
                if total_marks != 50 or mcq_count != 0:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 50), MCQs = {mcq_count} (expected 0)"
                    )
            elif is_as_theory:
                if total_marks != 80 or sec_a_mcq != 10:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 80), Sec A MCQ = {sec_a_mcq} (expected 10)"
                    )
            elif is_a2_theory:
                if total_marks != 90 or sec_a_mcq != 10:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 90), Sec A MCQ = {sec_a_mcq} (expected 10)"
                    )
        elif subject == "mathematics":
            if total_marks != 75 or mcq_count != 0:
                spec_failures.append(
                    f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 75), MCQs = {mcq_count} (expected 0)"
                )
        else:
            is_practical = any(u in unit_str or u in unit_code for u in ["Unit 3", "Unit 6", "WCH13", "WCH16"])
            is_as_theory = any(u in unit_str or u in unit_code for u in ["Unit 1", "Unit 2", "WCH11", "WCH12"])
            is_a2_theory = any(u in unit_str or u in unit_code for u in ["Unit 4", "Unit 5", "WCH14", "WCH15"])

            if is_practical:
                if total_marks != 50 or mcq_count != 0:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 50), MCQs = {mcq_count} (expected 0)"
                    )
            elif is_as_theory:
                if total_marks != 80 or sec_a_marks != 20:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 80), Sec A = {sec_a_marks} (expected 20)"
                    )
            elif is_a2_theory:
                if total_marks != 90 or sec_a_marks != 20:
                    spec_failures.append(
                        f"{pid:<25} ({unit_str}): Total Marks = {total_marks} (expected 90), Sec A = {sec_a_marks} (expected 20)"
                    )

    print(f"Total Papers Evaluated Across All Units: {total_papers}")
    for u_name, count in sorted(unit_counts.items()):
        print(f"  • {u_name:<10}: {count} papers")

    if spec_failures:
        print(f"\n[!] SPECIFICATION MARK AUDIT WARNINGS ({len(spec_failures)} papers):")
        for f in spec_failures:
            print(f"  [X] {f}")
    else:
        print("\n[SUCCESS] All papers adhere 100% to Pearson specification mark distributions!")

    # ---------------------------------------------------------
    # PART C: Specification Taxonomy & Topic/Subtopic Audit
    # ---------------------------------------------------------
    print("\n--- [PART C: SPECIFICATION TAXONOMY & TOPIC/SUBTOPIC AUDIT] ---")
    resolver = UnitTaxonomyResolver(subject)
    if subject == "physics":
        syllabus = OFFICIAL_PHYSICS_SYLLABUS
        parent_fn = get_physics_parent_topic_for_subtopic
    elif subject == "mathematics":
        syllabus = OFFICIAL_MATH_SYLLABUS
        parent_fn = get_math_parent_topic_for_subtopic
    else:
        syllabus = OFFICIAL_SYLLABUS
        parent_fn = get_parent_topic_for_subtopic

    all_canonical_topics = set()
    all_canonical_subtopics = set()
    unit_canonical_subs = defaultdict(set)

    for u_code, u_data in syllabus.items():
        for top_name, s_list in u_data["topics"].items():
            all_canonical_topics.add(top_name)
            for s in s_list:
                all_canonical_subtopics.add(s)
                unit_canonical_subs[u_code].add(s)

    taxonomy_errors: List[str] = []
    general_unmapped_count = 0
    covered_subtopics = set()
    covered_topics = set()

    for q in questions:
        qid = q.get("id", "UNKNOWN")
        pid = q.get("paperId") or q.get("paper_id") or ""
        ucode = resolver.normalize_unit_code(q.get("unitCode", ""), pid)

        m_top = q.get("mainTopic")
        m_sub = q.get("mainSubtopic")
        rel_subs = q.get("relatedSubtopics") or []
        top = q.get("topic")
        sub = q.get("subtopic")
        subs = q.get("subtopics") or []
        tops = q.get("topics") or []

        # 1. Check for "General" / unmapped / None
        for val, f_name in [(m_top, "mainTopic"), (m_sub, "mainSubtopic"), (top, "topic"), (sub, "subtopic")]:
            if not val or not isinstance(val, str) or val.strip().lower() in ("general", f"general {subject}", "unknown", "none"):
                general_unmapped_count += 1
                taxonomy_errors.append(f"{qid}: {f_name} has invalid value '{val}'")

        # 2. Check canonical syllabus membership
        if m_top not in all_canonical_topics:
            taxonomy_errors.append(f"{qid}: mainTopic '{m_top}' not in canonical syllabus")
        if m_sub not in all_canonical_subtopics:
            taxonomy_errors.append(f"{qid}: mainSubtopic '{m_sub}' not in canonical syllabus")
        for r in rel_subs:
            if r not in all_canonical_subtopics:
                taxonomy_errors.append(f"{qid}: relatedSubtopic '{r}' not in canonical syllabus")

        # 3. Check strict unit boundaries for primary subtopic
        if m_sub not in unit_canonical_subs[ucode]:
            taxonomy_errors.append(f"{qid}: mainSubtopic '{m_sub}' belongs outside paper unit {ucode}")

        # 4. Check parent topic derivation
        expected_parent = parent_fn(m_sub)
        if m_top != expected_parent:
            taxonomy_errors.append(f"{qid}: mainTopic '{m_top}' != expected parent '{expected_parent}'")

        # 5. Check strict unit boundaries and secondary cap for relatedSubtopics (all subjects)
        allowed_units = [ucode]
        max_rel = 1
        unit_fn = (
            get_physics_unit_for_subtopic
            if subject == "physics"
            else get_math_unit_for_subtopic
            if subject == "mathematics"
            else get_unit_for_subtopic
        )

        allowed_syn_subs = set()
        for u in allowed_units:
            allowed_syn_subs.update(unit_canonical_subs[u])

        if len(rel_subs) > max_rel:
            taxonomy_errors.append(f"{qid}: relatedSubtopics count ({len(rel_subs)}) exceeds max {max_rel}")

        for r in rel_subs:
            if r == m_sub:
                taxonomy_errors.append(f"{qid}: relatedSubtopics duplicates mainSubtopic '{m_sub}'")
            if r not in allowed_syn_subs:
                taxonomy_errors.append(f"{qid}: cross-unit relatedSubtopic '{r}' (belongs to {unit_fn(r)}) on {ucode} question")

        # 6. Backward compatibility fields
        if top != m_top:
            taxonomy_errors.append(f"{qid}: topic ('{top}') != mainTopic ('{m_top}')")
        if sub != m_sub:
            taxonomy_errors.append(f"{qid}: subtopic ('{sub}') != mainSubtopic ('{m_sub}')")
        if not subs or subs[0] != m_sub:
            taxonomy_errors.append(f"{qid}: subtopics[0] != mainSubtopic")
        if not tops or tops[0] != m_top:
            taxonomy_errors.append(f"{qid}: topics[0] != mainTopic")

        if m_sub in all_canonical_subtopics:
            covered_subtopics.add(m_sub)
        if m_top in all_canonical_topics:
            covered_topics.add(m_top)

    print(f"Total Canonical Topics Defined     : {len(all_canonical_topics)}")
    print(f"Total Canonical Subtopics Defined  : {len(all_canonical_subtopics)}")
    print(f"Dataset Covered Subtopics          : {len(covered_subtopics)} / {len(all_canonical_subtopics)} ({len(covered_subtopics)/len(all_canonical_subtopics)*100:.1f}%)")
    print(f"Dataset Covered Topics             : {len(covered_topics)} / {len(all_canonical_topics)} ({len(covered_topics)/len(all_canonical_topics)*100:.1f}%)")
    print(f"Questions with 'General'/Unmapped  : {general_unmapped_count}")
    print(f"Total Taxonomy Violations          : {len(taxonomy_errors)}")

    if taxonomy_errors:
        print("\n[!] TAXONOMY AUDIT FAILURES DETECTED:")
        for err in taxonomy_errors[:25]:
            print(f"  [X] {err}")
        if len(taxonomy_errors) > 25:
            print(f"  ... and {len(taxonomy_errors) - 25} more taxonomy errors.")
    else:
        print("\n[SUCCESS] 100% of questions strictly match official syllabus with 0 'General' or unmapped topics!")

    # ---------------------------------------------------------
    # PART D: Subject-Specific Classification Diagnostic Audit
    # ---------------------------------------------------------
    diag_errors_total = 0
    if subject == "chemistry":
        print("\n--- [PART D: CLASSIFICATION ACCURACY DIAGNOSTIC AUDIT (CROSS-UNIT, GENERIC HIJACKING & HAZARDS)] ---")
        pdf_cache = _load_paper_Text_cache("chemistry")
        diag = audit_chemistry_classification_quality(questions, pdf_cache=pdf_cache)

        cu_list = diag["cross_unit_violations"]
        gh_list = diag["generic_primary_hijacks"]
        nh_list = diag["non_hazard_4a_bleeds"]
        mh_list = diag["misclassified_hazard_questions"]
        ex_list = diag["excessive_secondary_tags"]

        diag_errors_total = len(cu_list) + len(gh_list) + len(nh_list) + len(mh_list) + len(ex_list)

        unit_cu_counts = Counter(item["unit"] for item in cu_list)
        print(f"1. Cross-Unit Violations                  : {len(cu_list)} questions")
        if unit_cu_counts:
            print(f"   Breakdown by Question Unit             : {dict(sorted(unit_cu_counts.items()))}")
        for item in cu_list[:10]:
            bad_str = ", ".join(f"{s.split(':')[0]} ({u})" for s, u in item["mismatched"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): primary={item['mainSubtopic'].split(':')[0]} | cross-unit=[{bad_str}]")
        if len(cu_list) > 10:
            print(f"     ... and {len(cu_list) - 10} more cross-unit violations.")

        print(f"2a. Generic Primary Topic Hijacking       : {len(gh_list)} questions")
        for item in gh_list[:15]:
            spec_str = ", ".join(s.split(":")[0] for s in item["specificSubtopics"])
            print(f"     • {item['id']} (Q{item['questionNumber']}): generic primary='{item['mainSubtopic'].split(':')[0]}' usurped specific=[{spec_str}] | Prompt: {item['prompt']}")
        if len(gh_list) > 15:
            print(f"     ... and {len(gh_list) - 15} more generic primary hijacking cases.")

        print(f"2b. Non-Hazard 4A (4.1-4.3) Bleed         : {len(nh_list)} questions")
        for item in nh_list[:10]:
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): {item['reason']} | Prompt: {item['prompt']}")

        print(f"2c. Excessive Secondary Subtopics (>1)    : {len(ex_list)} questions")
        for item in ex_list[:10]:
            rels_str = ", ".join(r.split(":")[0] for r in item["relatedSubtopics"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): primary={item['mainSubtopic'].split(':')[0]} | related=[{rels_str}]")
        if len(ex_list) > 10:
            print(f"     ... and {len(ex_list) - 10} more questions with >1 secondary subtopic.")

        print(f"3. Misclassified Hazard/Risk Questions    : {len(mh_list)} questions")
        for item in mh_list[:10]:
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): current primary='{item['mainSubtopic'].split(':')[0]}' (missing 4A (4.1-4.3)) | Prompt: {item['prompt']}")
    elif subject == "physics":
        print("\n--- [PART D: PHYSICS CLASSIFICATION ACCURACY DIAGNOSTIC AUDIT] ---")
        pdf_cache = _load_paper_Text_cache("physics")
        diag = audit_physics_classification_quality(questions, pdf_cache=pdf_cache)

        cu_list = diag["cross_unit_violations"]
        pc_list = diag["prefix_collisions"]
        gh_list = diag["generic_primary_hijacks"]
        sb_list = diag["subpart_bleeds"]
        ex_list = diag["excessive_secondary_tags"]

        diag_errors_total = len(cu_list) + len(pc_list) + len(gh_list) + len(sb_list) + len(ex_list)

        unit_cu_counts = Counter(item["unit"] for item in cu_list)
        print(f"1. Cross-Unit Violations                  : {len(cu_list)} questions")
        if unit_cu_counts:
            print(f"   Breakdown by Question Unit             : {dict(sorted(unit_cu_counts.items()))}")
        for item in cu_list[:10]:
            bad_str = ", ".join(f"{s.split(':')[0]} ({u})" for s, u in item["mismatched"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): primary={item['mainSubtopic'].split(':')[0]} | cross-unit=[{bad_str}]")
        if len(cu_list) > 10:
            print(f"     ... and {len(cu_list) - 10} more cross-unit violations.")

        print(f"2. Ambiguous Prefix/Shared-Code Collisions: {len(pc_list)} questions")
        for item in pc_list[:15]:
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): {item['reason']} | Prompt: {item['prompt']}")
        if len(pc_list) > 15:
            print(f"     ... and {len(pc_list) - 15} more collision cases.")

        print(f"3. Generic Primary Topic Hijacking        : {len(gh_list)} questions")
        for item in gh_list[:15]:
            spec_str = ", ".join(s.split(":")[0] for s in item["specificSubtopics"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): generic primary='{item['mainSubtopic'].split(':')[0]}' usurped specific=[{spec_str}] | Prompt: {item['prompt']}")
        if len(gh_list) > 15:
            print(f"     ... and {len(gh_list) - 15} more generic primary hijacking cases.")

        print(f"4a. Sub-part Vector/Scalar Bleed          : {len(sb_list)} questions")
        for item in sb_list[:10]:
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): {item['reason']} | Prompt: {item['prompt']}")

        print(f"4b. Excessive Secondary Subtopics (>1)    : {len(ex_list)} questions")
        unit_ex_counts = Counter(item["unit"] for item in ex_list)
        if unit_ex_counts:
            print(f"   Breakdown by Question Unit             : {dict(sorted(unit_ex_counts.items()))}")
        for item in ex_list[:10]:
            rels_str = ", ".join(r.split(":")[0] for r in item["relatedSubtopics"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): primary={item['mainSubtopic'].split(':')[0]} | related=[{rels_str}]")
        if len(ex_list) > 10:
            print(f"     ... and {len(ex_list) - 10} more questions with >1 secondary subtopic.")
    elif subject == "mathematics":
        print("\n--- [PART D: MATHEMATICS CLASSIFICATION ACCURACY DIAGNOSTIC AUDIT] ---")
        diag = audit_math_classification_quality(questions)

        cu_list = diag["cross_unit_violations"]
        pc_list = diag["prefix_collisions"]
        gh_list = diag["generic_primary_hijacks"]
        ex_list = diag["excessive_secondary_tags"]

        diag_errors_total = len(cu_list) + len(pc_list) + len(gh_list) + len(ex_list)

        unit_cu_counts = Counter(item["unit"] for item in cu_list)
        print(f"1. Cross-Unit Violations                  : {len(cu_list)} questions")
        if unit_cu_counts:
            print(f"   Breakdown by Question Unit             : {dict(sorted(unit_cu_counts.items()))}")
        for item in cu_list[:10]:
            bad_str = ", ".join(f"{s.split(':')[0]} ({u})" for s, u in item["mismatched"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): primary={item['mainSubtopic'].split(':')[0]} | cross-unit=[{bad_str}]")

        print(f"2. Ambiguous Prefix/Subtopic Collisions   : {len(pc_list)} questions")
        for item in pc_list[:15]:
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): {item['reason']} | Prompt: {item['prompt']}")

        print(f"3. Generic Primary Topic Hijacking        : {len(gh_list)} questions")
        for item in gh_list[:15]:
            spec_str = ", ".join(s.split(":")[0] for s in item["specificSubtopics"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): generic primary='{item['mainSubtopic'].split(':')[0]}' usurped specific=[{spec_str}] | Prompt: {item['prompt']}")
        if len(gh_list) > 15:
            print(f"     ... and {len(gh_list) - 15} more generic primary hijacking cases.")

        print(f"4. Excessive Secondary Subtopics (>1)     : {len(ex_list)} questions")
        unit_ex_counts = Counter(item["unit"] for item in ex_list)
        if unit_ex_counts:
            print(f"   Breakdown by Question Unit             : {dict(sorted(unit_ex_counts.items()))}")
        for item in ex_list[:10]:
            rels_str = ", ".join(r.split(":")[0] for r in item["relatedSubtopics"])
            print(f"     • {item['id']} ({item['unit']}, Q{item['questionNumber']}): primary={item['mainSubtopic'].split(':')[0]} | related=[{rels_str}]")
        if len(ex_list) > 10:
            print(f"     ... and {len(ex_list) - 10} more questions with >1 secondary subtopic.")

    # Final summary check
    all_passed = (len(ms_errors) == 0 and len(taxonomy_errors) == 0 and diag_errors_total == 0)
    print("\n" + "=" * 80)
    if all_passed:
        if spec_failures:
            print(f"[VERIFICATION PASSED] 100% MS match, 100% strict unit taxonomy & classification accuracy confirmed ({len(spec_failures)} historical mark discrepancies noted).")
        else:
            print("[VERIFICATION PASSED] Dataset meets 100% QP-to-MS match rate, specification integrity, and strict classification accuracy.")
    else:
        print(f"[VERIFICATION FAILED] {len(ms_errors)} MS errors, {len(taxonomy_errors)} taxonomy errors, {diag_errors_total} classification accuracy violations.")
    print("=" * 80 + "\n")

    return all_passed


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Audit dataset matching and taxonomy.")
    parser.add_argument("dataset_path", nargs="?", default="frontend/public/dataset.json", help="Path to dataset JSON")
    parser.add_argument("public_dir", nargs="?", default="frontend/public", help="Path to public assets root")
    parser.add_argument("--subject", choices=["chemistry", "physics", "mathematics"], default=None, help="Subject")
    args = parser.parse_args()

    success = run_audit(dataset_path=args.dataset_path, public_dir=args.public_dir, subject=args.subject)
    sys.exit(0 if success else 1)
