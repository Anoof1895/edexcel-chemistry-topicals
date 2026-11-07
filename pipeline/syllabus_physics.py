"""
Pearson Edexcel International Advanced Level (IAL) Physics (Issue 3) Specification Topics & Subtopics.
Covers:
- AS Level: Unit 1 (WPH11), Unit 2 (WPH12), Unit 3 (WPH13)
- A2 Level: Unit 4 (WPH14), Unit 5 (WPH15), Unit 6 (WPH16)
"""

import re
from typing import Dict, List, Any, Tuple

OFFICIAL_PHYSICS_SYLLABUS: Dict[str, Dict[str, Any]] = {
    "WPH11": {
        "unit": "Unit 1",
        "title": "Mechanics and Materials",
        "topics": {
            "Topic 1 (1.3): Mechanics": [
                "1.3.1 (Spec 1-3): Kinematics, SUVAT Equations & Motion Graphs (s-t, v-t, a-t)",
                "1.3.2 (Spec 4-6): Scalars, Vectors, Resolution & Coplanar Vector Addition",
                "1.3.3 (Spec 7): Projectile Motion & Independence of Vertical/Horizontal Motion",
                "1.3.4 (Spec 8-12): Free-Body Diagrams, Newton's Laws of Motion (ΣF=ma), Terminal Velocity & Core Practical 1",
                "1.3.5 (Spec 13-14): Momentum (p=mv) & 1D Conservation of Linear Momentum",
                "1.3.6 (Spec 15-16): Moments, Centre of Gravity & Principle of Moments in Equilibrium",
                "1.3.7 (Spec 17-22): Work Done, Kinetic & Gravitational Potential Energy, Conservation of Energy, Power & Efficiency",
            ],
            "Topic 2 (1.4): Materials": [
                "1.4.1 (Spec 23-24): Density (ρ=m/V), Upthrust & Archimedes' Principle",
                "1.4.2 (Spec 25-26): Laminar vs Turbulent Flow, Viscosity, Stokes' Law (F=6πηrv) & Core Practical 2",
                "1.4.3 (Spec 27, 29, 32): Hooke's Law (ΔF=kΔx), Force-Extension Graphs & Elastic Strain Energy (ΔE_el=½FΔx)",
                "1.4.4 (Spec 28, 30-31): Stress, Strain, Young Modulus, Stress-Strain Graphs (Elastic/Plastic, Yield, Breaking Stress) & Core Practical 3",
            ],
        },
    },
    "WPH12": {
        "unit": "Unit 2",
        "title": "Waves and Electricity",
        "topics": {
            "Topic 3 (2.3): Waves and Particle Nature of Light": [
                "2.3.1 (Spec 33-38): Wave Properties, Wave Equation (v=fλ), Longitudinal vs Transverse Waves & Core Practical 4 (Speed of Sound)",
                "2.3.2 (Spec 39-40): Wavefronts, Coherence, Superposition, Interference & Phase/Path Difference",
                "2.3.3 (Spec 41-43): Stationary Waves, Nodes/Antinodes, Waves on a String (v=√(T/μ)) & Core Practical 5",
                "2.3.4 (Spec 44-48): Intensity (I=P/A), Refraction, Snell's Law, Critical Angle, Total Internal Reflection & Refractive Index",
                "2.3.5 (Spec 49-52): Plane Polarisation, Huygens' Construction, Diffraction Gratings (nλ=d sinθ) & Core Practical 6",
                "2.3.6 (Spec 55-56): Wave Reflection/Transmission at Interfaces & Pulse-Echo Ultrasound Techniques",
                "2.3.7 (Spec 57-62): Photons (E=hf), Electronvolts (eV), Photoelectric Effect (hf=φ+½mv_max²) & Wave-Particle Models",
                "2.3.8 (Spec 53-54, 63): Electron Diffraction, de Broglie Wavelength (λ=h/p) & Atomic Line Spectra / Energy Levels",
            ],
            "Topic 4 (2.4): Electric Circuits": [
                "2.4.1 (Spec 64-66, 69): Electric Current (I=ΔQ/Δt), Potential Difference (V=W/Q), Resistance (R=V/I) & Electrical Power/Energy",
                "2.4.2 (Spec 67-68): Charge & Energy Conservation (Kirchhoff's Laws) & Series/Parallel Resistor Combinations",
                "2.4.3 (Spec 70): Current-Potential Difference (I-V) Characteristics (Ohmic Conductors, Filament Bulbs, Thermistors, Diodes)",
                "2.4.4 (Spec 71-73, 79-80): Resistivity (R=ρl/A), Transport Equation (I=nqvA), Conduction Models (Metals, NTC Thermistors, LDRs) & Core Practical 7",
                "2.4.5 (Spec 74-76): Potential Along a Uniform Wire, Potential Divider Circuits & Sensor Circuits (Thermistors & LDRs)",
                "2.4.6 (Spec 77-78): Electromotive Force (e.m.f.), Internal Resistance, Terminal p.d. (ε=V+Ir) & Core Practical 8",
            ],
        },
    },
    "WPH13": {
        "unit": "Unit 3",
        "title": "Practical Skills in Physics I",
        "topics": {
            "Unit 3 Practical Skills: Experimental Planning, Implementation & Processing (AS)": [
                "3.3: Experimental Planning: Apparatus Selection, Range/Resolution (Vernier, Micrometer), Calibration, Control Variables & Safety",
                "3.4: Implementation & Measurements: Readings, Range, Significant Figures, Anomalous Points & Experimental Improvements",
                "3.5: Processing Results: Graphing, Gradients, Single/Multiple Reading Percentage Uncertainties & Core Practicals 1–8",
            ],
        },
    },
    "WPH14": {
        "unit": "Unit 4",
        "title": "Further Mechanics, Fields and Particles",
        "topics": {
            "Topic 5 (4.3): Further Mechanics": [
                "4.3.1 (Spec 81-82, 86): Impulse (FΔt=Δp), Non-Relativistic Kinetic Energy (E_k=p²/2m) & Core Practical 9",
                "4.3.2 (Spec 83-85): 2D Conservation of Linear Momentum, Elastic vs Inelastic Collisions & Core Practical 10",
                "4.3.3 (Spec 87-91): Circular Motion: Radian Measure, Angular Velocity (v=ωr), Centripetal Acceleration (a=v²/r=rω²) & Centripetal Force",
            ],
            "Topic 6 (4.4): Electric and Magnetic Fields": [
                "4.4.1 (Spec 92-99): Electric Fields, Coulomb's Law, Point/Parallel-Plate Field Strength (E=F/Q, E=V/d), Electric Potential & Equipotentials",
                "4.4.2 (Spec 100-104): Capacitance (C=Q/V), Energy Stored (W=½QV=½CV²), RC Exponential Charging/Discharging (Q=Q0e^(-t/RC), ln plots) & Core Practical 11",
                "4.4.3 (Spec 105-107): Magnetic Flux Density (B), Fleming's Left-Hand Rule & Magnetic Forces on Charged Particles (F=Bqv sinθ) and Conductors (F=BIl sinθ)",
                "4.4.4 (Spec 105, 108-110): Magnetic Flux (Φ), Flux Linkage (NΦ) & Electromagnetic Induction (Faraday's & Lenz's Laws, ε=-d(NΦ)/dt)",
            ],
            "Topic 7 (4.5): Nuclear and Particle Physics": [
                "4.5.1 (Spec 111-112): Nucleon/Proton Numbers, Alpha Particle Scattering & Evolution of the Nuclear Model",
                "4.5.2 (Spec 113-116): Thermionic Emission, Linear Accelerators (Linacs), Cyclotrons, Magnetic Curvature (r=p/BQ) & Particle Detectors/Tracks",
                "4.5.3 (Spec 117-120): High-Energy Probing, Mass-Energy Equivalence (ΔE=c²Δm), Matter-Antimatter Annihilation/Creation, MeV/GeV Units & Relativistic Lifetimes",
                "4.5.4 (Spec 121-124): Standard Quark-Lepton Model (Baryons, Mesons, Leptons, Photons, Antiparticles) & Conservation Laws (Charge, Baryon, Lepton)",
            ],
        },
    },
    "WPH15": {
        "unit": "Unit 5",
        "title": "Thermodynamics, Radiation, Oscillations and Cosmology",
        "topics": {
            "Topic 8 (5.3): Thermodynamics": [
                "5.3.1 (Spec 125-127): Specific Heat Capacity (ΔE=mcΔθ), Specific Latent Heat (ΔE=LΔm) & Core Practicals 12 & 13",
                "5.3.2 (Spec 128-132): Internal Energy, Absolute Zero, Ideal Gas Equation (pV=NkT), Kinetic Theory (½m<c²>=3/2 kT) & Core Practical 14",
            ],
            "Topic 9 (5.4): Nuclear Decay": [
                "5.4.1 (Spec 133-136): Mass Defect, Nuclear Binding Energy (ΔE=c²Δm), Atomic Mass Unit (u), Nuclear Fission & Nuclear Fusion",
                "5.4.2 (Spec 137-140): Background Radiation, Alpha/Beta/Gamma Properties, Nuclear Decay Equations & Core Practical 15 (Gamma Absorption)",
                "5.4.3 (Spec 141-142): Random/Spontaneous Decay, Activity (A=λN), Half-Life (λ=ln2/t_½) & Exponential Decay Equations (N=N0e^(-λt))",
            ],
            "Topic 10 (5.5): Oscillations": [
                "5.5.1 (Spec 143-147, 150): Simple Harmonic Motion (F=-kx, a=-ω²x), SHM Equations & Graphs (x, v, a), Mass-Spring/Pendulum Periods & Energy in SHM",
                "5.5.2 (Spec 148-153): Free vs Forced Oscillations, Damping, Resonance, Plastic Deformation Damping & Core Practical 16",
            ],
            "Topic 11 (5.6): Astrophysics and Cosmology": [
                "5.6.1 (Spec 154-160): Gravitational Fields (g=F/m, g=Gm/r²), Universal Gravitation, Gravitational Potential (V_grav=-Gm/r), Field Comparisons & Orbital Motion",
                "5.6.2 (Spec 161-164, 167-168): Black Body Radiation, Stefan-Boltzmann Law (L=σAT⁴), Wien's Law, Inverse-Square Intensity (I=L/4πd²), H-R Diagrams & Stellar Evolution",
                "5.6.3 (Spec 165-166, 169-171): Astronomical Distances (Trigonometric Parallax & Standard Candles), Doppler Redshift, Hubble's Law (v=H0d), Age/Fate of Universe & Dark Matter",
            ],
        },
    },
    "WPH16": {
        "unit": "Unit 6",
        "title": "Practical Skills in Physics II",
        "topics": {
            "Unit 6 Practical Skills: Advanced Experimental Planning, Implementation & Data Analysis (A2)": [
                "6.3: Advanced Experimental Planning: Apparatus Dimensions/Resolution, Calibration, Control Variables, Repeat Readings & Safety",
                "6.4: Implementation & Measurements: Error Reduction Techniques (Markers, Set Squares), Table Rounding/Units & Inconsistent Readings",
                "6.5: Advanced Data Analysis: Logarithmic/Power-Law Graph Linearisation, Precision/Accuracy/Sensitivity, Compounding Percentage Uncertainties & Core Practicals 9–16",
            ],
        },
    },
}


def get_physics_unit_from_code(code: str) -> str:
    code_upper = (code or "").upper()
    for k, v in OFFICIAL_PHYSICS_SYLLABUS.items():
        if k in code_upper:
            return v["unit"]
        if v["unit"].upper() in code_upper:
            return v["unit"]
        if v["title"].upper() in code_upper:
            return v["unit"]
    m = re.search(r"\b(?:UNIT\s*|U)?([1-6])\b", code_upper)
    if m:
        c = f"WPH1{m.group(1)}"
        if c in OFFICIAL_PHYSICS_SYLLABUS:
            return OFFICIAL_PHYSICS_SYLLABUS[c]["unit"]
    return "Unit 1"


def normalize_physics_unit_code(code_or_identifier: str) -> str:
    norm = (code_or_identifier or "").strip().upper()
    for code, info in OFFICIAL_PHYSICS_SYLLABUS.items():
        if code in norm or info["unit"].upper() in norm or info["title"].upper() in norm:
            return code
    m = re.search(r"\b(?:UNIT\s*|U)?([1-6])\b", norm)
    if m:
        c = f"WPH1{m.group(1)}"
        if c in OFFICIAL_PHYSICS_SYLLABUS:
            return c
    return "WPH11"


def get_physics_unit_full_title(code_or_identifier: str) -> str:
    norm = (code_or_identifier or "").strip().upper()
    for code, info in OFFICIAL_PHYSICS_SYLLABUS.items():
        if code in norm or info["unit"].upper() in norm or info["title"].upper() in norm:
            return f"{info['unit']}: {info['title']}"
    m = re.search(r"\b(?:UNIT\s*|U)?([1-6])\b", norm)
    if m:
        c = f"WPH1{m.group(1)}"
        if c in OFFICIAL_PHYSICS_SYLLABUS:
            info = OFFICIAL_PHYSICS_SYLLABUS[c]
            return f"{info['unit']}: {info['title']}"
    return "Unit 1: Mechanics and Materials"


def get_physics_syllabus_for_unit(identifier: str) -> Dict[str, List[str]]:
    norm = (identifier or "").strip().upper()
    for code, info in OFFICIAL_PHYSICS_SYLLABUS.items():
        if code in norm or info["unit"].upper() in norm or info["title"].upper() in norm:
            return info["topics"]
    m = re.search(r"\b(?:UNIT\s*|U)?([1-6])\b", norm)
    if m:
        code = f"WPH1{m.group(1)}"
        if code in OFFICIAL_PHYSICS_SYLLABUS:
            return OFFICIAL_PHYSICS_SYLLABUS[code]["topics"]
    return OFFICIAL_PHYSICS_SYLLABUS["WPH11"]["topics"]


def get_all_physics_subtopics_for_unit(identifier: str) -> List[str]:
    topics = get_physics_syllabus_for_unit(identifier)
    subtopics = []
    for subs in topics.values():
        subtopics.extend(subs)
    return subtopics


def get_physics_parent_topic_for_subtopic(subtopic: str) -> str:
    for _, unit_data in OFFICIAL_PHYSICS_SYLLABUS.items():
        for top, subs in unit_data["topics"].items():
            if subtopic in subs:
                return top
    return "General Physics"


def get_physics_unit_for_subtopic(subtopic: str) -> str:
    for _, unit_data in OFFICIAL_PHYSICS_SYLLABUS.items():
        for _, subs in unit_data["topics"].items():
            if subtopic in subs:
                return unit_data["unit"]
    return "Unit 1"


# Official total marks per unit paper (Section A MCQ + Section B theory)
EXPECTED_PAPER_MARKS: Dict[str, int] = {
    "WPH11": 80,
    "WPH12": 80,  # 10 Section A + 70 Section B
    "WPH14": 90,
    "WPH15": 90,  # 10 Section A + 80 Section B
    "WPH13": 50,
    "WPH16": 50,  # Practical skills (no MCQs)
}


def get_expected_paper_marks(unit_code: str) -> int:
    m = re.search(r"WPH1([1-6])", (unit_code or "").upper())
    return EXPECTED_PAPER_MARKS.get(f"WPH1{m.group(1)}", 80) if m else 80


# Canonical Physics subtopic constants for hierarchy & disambiguation rules
PHYS_KINEMATICS_SUBTOPIC = (
    "1.3.1 (Spec 1-3): Kinematics, SUVAT Equations & Motion Graphs (s-t, v-t, a-t)"
)
PHYS_SCALARS_VECTORS_SUBTOPIC = (
    "1.3.2 (Spec 4-6): Scalars, Vectors, Resolution & Coplanar Vector Addition"
)
PHYS_NEWTON_LAWS_SUBTOPIC = (
    "1.3.4 (Spec 8-12): Free-Body Diagrams, Newton's Laws of Motion (ΣF=ma), Terminal Velocity & Core Practical 1"
)
PHYS_MOMENTS_SUBTOPIC = (
    "1.3.6 (Spec 15-16): Moments, Centre of Gravity & Principle of Moments in Equilibrium"
)
PHYS_WAVE_BASICS_SUBTOPIC = (
    "2.3.1 (Spec 33-38): Wave Properties, Wave Equation (v=fλ), Longitudinal vs Transverse Waves & Core Practical 4 (Speed of Sound)"
)
PHYS_CIRCUIT_BASICS_SUBTOPIC = (
    "2.4.1 (Spec 64-66, 69): Electric Current (I=ΔQ/Δt), Potential Difference (V=W/Q), Resistance (R=V/I) & Electrical Power/Energy"
)
PHYS_IMPULSE_SUBTOPIC = (
    "4.3.1 (Spec 81-82, 86): Impulse (FΔt=Δp), Non-Relativistic Kinetic Energy (E_k=p²/2m) & Core Practical 9"
)
PHYS_COLLISIONS_SUBTOPIC = (
    "4.3.2 (Spec 83-85): 2D Conservation of Linear Momentum, Elastic vs Inelastic Collisions & Core Practical 10"
)
PHYS_MAG_FORCE_SUBTOPIC = (
    "4.4.3 (Spec 105-107): Magnetic Flux Density (B), Fleming's Left-Hand Rule & Magnetic Forces on Charged Particles (F=Bqv sinθ) and Conductors (F=BIl sinθ)"
)
PHYS_INDUCTION_SUBTOPIC = (
    "4.4.4 (Spec 105, 108-110): Magnetic Flux (Φ), Flux Linkage (NΦ) & Electromagnetic Induction (Faraday's & Lenz's Laws, ε=-d(NΦ)/dt)"
)
PHYS_HIGH_ENERGY_SUBTOPIC = (
    "4.5.3 (Spec 117-120): High-Energy Probing, Mass-Energy Equivalence (ΔE=c²Δm), Matter-Antimatter Annihilation/Creation, MeV/GeV Units & Relativistic Lifetimes"
)

PHYSICS_PURE_SCALAR_VECTOR_PROMPT_RE = re.compile(
    r"\b("
    r"scalar|scalars|"
    r"vector\s+quantity|vector\s+quantities|"
    r"scaled\s+vector\s+diagram|vector\s+triangle|vector\s+diagram|"
    r"speed\s+of\s+the\s+car\s+can\s+remain\s+constant|"
    r"magnitude\s+of\s+the\s+displacement.*less\s+than\s+the\s+distance|"
    r"horizontal\s+and\s+vertical\s+components\s+of\s+(?:its|the|their)\s+velocity"
    r")\b",
    re.I,
)

PHYSICS_VECTOR_COMPONENT_RE = re.compile(
    r"\b("
    r"vector|vectors|scalar|scalars|component|components|resolv\w*|"
    r"sin\s*\d|cos\s*\d|tan\s*\d|sin\s*θ|cos\s*θ|tan\s*θ|sin\s*theta|cos\s*theta|"
    r"trigonometr\w*|pythagoras|parallelogram|angle|horizontal|vertical|perpendicular|direction|east|north"
    r")\b",
    re.I,
)

PHYSICS_MOMENT_KEYWORD_RE = re.compile(
    r"\b("
    r"moment|moments|pivot|hinge|hinges|centre\s+of\s+gravity|center\s+of\s+gravity|centre\s+of\s+mass|"
    r"clockwise|anticlockwise|turning\s+effect|plank|beam|ruler|see-saw|seesaw|lever|fulcrum|"
    r"support|supports|topple|tilt|tipped|door|ladder|bar|shelf|barrier|crane|arm|forearm|"
    r"stand\w*\s+on\s+the\s+wood|centre\s+of\s+the\s+car|screw\s+can\s+withstand"
    r")\b",
    re.I,
)

PHYSICS_MAG_FORCE_KEYWORD_RE = re.compile(
    r"\b("
    r"F\s*=\s*B\s*I\s*l|F\s*=\s*B\s*q\s*v|left[- ]hand\s+rule|motor\s+effect|magnetic\s+force|"
    r"force\s+on\s+(?:the\s+)?(?:wire|rod|conductor|coil|plate|disc|magnet|particles?|electrons?|ions?)|"
    r"experiences?\s+a\s+force|opposing\s+force|reading\s+on\s+the\s+balance|force\s+meter|"
    r"braking|electromagnetic\s+brake|decelerat\w*|copper\s+tube"
    r")\b",
    re.I,
)


def is_physics_subtopic_valid_for_unit(subtopic: str, unit_or_code: str) -> bool:
    """
    Returns True if and only if `subtopic` belongs strictly to `unit_or_code`
    (e.g., 'Unit 1' or 'WPH11'). Enforces zero cross-unit contamination.
    """
    if not subtopic:
        return False
    allowed = set(get_all_physics_subtopics_for_unit(unit_or_code))
    return subtopic in allowed


def enforce_physics_subtopic_hierarchy(
    unit_or_code: str,
    main_subtopic: str,
    related_subtopics: List[str],
    own_prompt_text: str = "",
    own_ms_text: str = "",
) -> Tuple[str, str, List[str]]:
    """
    Enforces strict unit scoping, sub-part isolation, and primary vs. secondary hierarchy
    for a Physics question sub-part:
    1. Strips any cross-unit subtopics that do not belong to `unit_or_code`.
    2. Disambiguates `1.3.6 (Moments)` vs coplanar force equilibrium (`1.3.4` & `1.3.2`) when no moment/pivot is present.
    3. Promotes specific Unit 1 mechanics/materials topics (`1.3.3`–`1.4.4`) over generic `1.3.2 (Scalars & Vectors)`
       unless the prompt explicitly tests scalar/vector definitions or scaled vector diagrams, and strips bled `1.3.2`
       secondary tags on purely 1D/scalar sub-parts.
    4. Promotes specific Wave/Circuit/Collision/Nuclear concepts over introductory `.1` subtopics (`2.3.1`, `2.4.1`, `4.3.1`).
    5. Strips `4.4.3` (`Spec 105-107` Magnetic Force) from pure `4.4.4` (`Spec 105, 108-110` Electromagnetic Induction) questions
       that do not involve magnetic forces.
    6. Caps `related_subtopics` at 1 item (maximum 2 subtopics total per sub-part).
    """
    allowed_list = get_all_physics_subtopics_for_unit(unit_or_code)
    allowed_set = set(allowed_list)
    unit_name = get_physics_unit_from_code(unit_or_code)

    valid_rels: List[str] = []
    for r in related_subtopics or []:
        if r and r in allowed_set and r not in valid_rels:
            valid_rels.append(r)

    if main_subtopic not in allowed_set:
        if valid_rels:
            main_subtopic = valid_rels.pop(0)
        elif allowed_list:
            main_subtopic = allowed_list[0]

    valid_rels = [r for r in valid_rels if r != main_subtopic]
    own_combined = f"{own_prompt_text or ''} {own_ms_text or ''}".strip()

    if unit_name == "Unit 1":
        # 1. Disambiguate 1.3.6 (Moments) vs coplanar tension/rope/pulley equilibrium
        if len(own_combined) >= 15 and not PHYSICS_MOMENT_KEYWORD_RE.search(own_combined):
            if PHYS_MOMENTS_SUBTOPIC in valid_rels:
                valid_rels.remove(PHYS_MOMENTS_SUBTOPIC)
                if main_subtopic == PHYS_SCALARS_VECTORS_SUBTOPIC and PHYS_NEWTON_LAWS_SUBTOPIC not in valid_rels:
                    valid_rels.insert(0, PHYS_NEWTON_LAWS_SUBTOPIC)
            elif main_subtopic == PHYS_MOMENTS_SUBTOPIC:
                if PHYS_SCALARS_VECTORS_SUBTOPIC in valid_rels:
                    main_subtopic = PHYS_NEWTON_LAWS_SUBTOPIC
                elif valid_rels:
                    main_subtopic = valid_rels.pop(0)
                else:
                    main_subtopic = PHYS_NEWTON_LAWS_SUBTOPIC
                    valid_rels.append(PHYS_SCALARS_VECTORS_SUBTOPIC)

        # 2. Strip bled 1.3.2 (Scalars & Vectors) from related_subtopics when sub-part has no vector components/angles
        if PHYS_SCALARS_VECTORS_SUBTOPIC in valid_rels and len(own_combined) >= 15:
            if not PHYSICS_VECTOR_COMPONENT_RE.search(own_combined) or re.search(
                r"\bdetermine\s+the\s+strain\s+in\s+the\s+rope\b", own_prompt_text or "", re.I
            ):
                valid_rels.remove(PHYS_SCALARS_VECTORS_SUBTOPIC)

        # 3. Promote specific Unit 1 concept over generic 1.3.2 (Scalars & Vectors) as mainSubtopic
        if main_subtopic == PHYS_SCALARS_VECTORS_SUBTOPIC and valid_rels:
            specific_u1_rels = [
                r for r in valid_rels if r not in (PHYS_SCALARS_VECTORS_SUBTOPIC, PHYS_KINEMATICS_SUBTOPIC)
            ]
            if specific_u1_rels and not PHYSICS_PURE_SCALAR_VECTOR_PROMPT_RE.search(own_prompt_text or ""):
                promoted = specific_u1_rels[0]
                valid_rels.remove(promoted)
                if len(own_combined) < 15 or PHYSICS_VECTOR_COMPONENT_RE.search(own_combined):
                    valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted

    elif unit_name == "Unit 2":
        # 1. Promote specific wave phenomenon over generic 2.3.1 (Wave Properties & v=fλ)
        if main_subtopic == PHYS_WAVE_BASICS_SUBTOPIC and valid_rels:
            specific_wave_rels = [
                r for r in valid_rels
                if r.startswith(("2.3.2", "2.3.3", "2.3.5", "2.3.6", "2.3.7", "2.3.8"))
            ]
            if specific_wave_rels and not re.search(
                r"\b(longitudinal|transverse|graph.*frequency.*wavelength\s+of\s+photons)\b",
                own_prompt_text or "",
                re.I,
            ):
                promoted = specific_wave_rels[0]
                valid_rels.remove(promoted)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted

        # 2. Promote specific circuit / intensity topic over generic 2.4.1 (I=Q/t, V=IR, P=VI)
        if main_subtopic == PHYS_CIRCUIT_BASICS_SUBTOPIC and valid_rels:
            # Promote when the sub-part specifically tests series/parallel resistor networks, sensor/potential divider,
            # I-V characteristics/graphs, conduction electrons/resistivity, battery chemical energy store, or solar intensity
            if re.search(
                r"\b("
                r"security\s+lamp|switches\s+on|potential\s+divider|"
                r"two\s+resistors|purpose\s+of\s+the\s+resistor|"
                r"read\s+from\s+graph|best\s+fit\s+line|minimum\s+potential\s+difference|ohmic\s+conductor.*varies\s+with|"
                r"conduction\s+electrons|nichrome\s+wire|resistivity|"
                r"chemical\s+energy\s+store|"
                r"solar\s+cell\s+array|I\s*=\s*P\s*/\s*A"
                r")\b",
                own_combined,
                re.I,
            ):
                promoted = valid_rels.pop(0)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted

    elif unit_name == "Unit 4":
        # 1. Promote 4.3.2 (Collisions) or 4.5.3 (GeV units) over 4.3.1 (Impulse) when no impulse equation is used
        if main_subtopic == PHYS_IMPULSE_SUBTOPIC and valid_rels:
            if PHYS_HIGH_ENERGY_SUBTOPIC in valid_rels and re.search(r"\bGeV|MeV\b", own_combined):
                valid_rels.remove(PHYS_HIGH_ENERGY_SUBTOPIC)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = PHYS_HIGH_ENERGY_SUBTOPIC
            elif PHYS_COLLISIONS_SUBTOPIC in valid_rels and not re.search(r"F\s*Δt|Δp|average\s+force", own_combined, re.I):
                valid_rels.remove(PHYS_COLLISIONS_SUBTOPIC)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = PHYS_COLLISIONS_SUBTOPIC

        # 2. Strip Spec 105 collision (4.4.3 Magnetic Force attached to pure 4.4.4 Induction questions)
        if main_subtopic == PHYS_INDUCTION_SUBTOPIC and PHYS_MAG_FORCE_SUBTOPIC in valid_rels:
            if len(own_combined) >= 15 and not PHYSICS_MAG_FORCE_KEYWORD_RE.search(own_combined):
                valid_rels.remove(PHYS_MAG_FORCE_SUBTOPIC)

    valid_rels = [r for r in valid_rels if r != main_subtopic][:1]
    main_topic = get_physics_parent_topic_for_subtopic(main_subtopic)
    return main_topic, main_subtopic, valid_rels
