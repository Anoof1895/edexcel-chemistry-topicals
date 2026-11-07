"""
Pearson Edexcel International Advanced Level (IAL) Chemistry Specification Topics & Subtopics.
Covers:
- AS Level: Unit 1 (WCH11), Unit 2 (WCH12), Unit 3 (WCH13)
- A2 Level: Unit 4 (WCH14), Unit 5 (WCH15), Unit 6 (WCH16)
Strictly aligned with Pearson Edexcel IAL Chemistry Specification (Topics 1–20 + Unit 3 & Unit 6 Practical Skills).
"""

from typing import Any, Dict, List, Set, Tuple
import re

HAZARD_SUBTOPIC = "4A (4.1-4.3): Hazards, Risk Assessment & Safe Laboratory Precautions"
EQUATIONS_SUBTOPIC = "1.3 & 1.12: Chemical & Ionic Equations, State Symbols & Test-Tube Observations"
EQUATIONS_SUBTOPIC_ALIAS = "1.3 & 1.10: Chemical & Ionic Equations, State Symbols & Test-Tube Observations"
NOMENCLATURE_SUBTOPIC = "4A (4.4-4.8): Homologous Series, IUPAC Nomenclature, Reaction Types & Bond Fission"
ALKANE_FUELS_POLLUTANTS_SUBTOPIC = "4B (4.12-4.16): Crude Oil, Fractional Distillation, Cracking, Pollutants & Carbon Neutrality"
ALKENE_ADDITION_SUBTOPIC = "5.4-5.5: Addition Reactions of Alkenes (H2, Halogens, HX, Steam, KMnO4) & Bromine Test"

SUBTOPIC_ALIASES: Dict[str, str] = {
    EQUATIONS_SUBTOPIC_ALIAS: EQUATIONS_SUBTOPIC,
    "1.3 & 1.10": EQUATIONS_SUBTOPIC,
}

FOUNDATIONAL_GENERIC_SUBTOPICS: Set[str] = {
    EQUATIONS_SUBTOPIC,
    EQUATIONS_SUBTOPIC_ALIAS,
    HAZARD_SUBTOPIC,
    NOMENCLATURE_SUBTOPIC,
}

# Broad hazard/risk/precaution vocabulary
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

NON_HAZARD_PROMPT_EXCLUSION_RE = re.compile(
    r"\b(polymer\s+disposal|disposal\s+of\s+polymers|calculate\s+the\s+maximum\s+number\s+of\s+\w+\s+molecules)\b",
    re.I,
)

OFFICIAL_SYLLABUS: Dict[str, Dict[str, Any]] = {
    "WCH11": {
        "unit": "Unit 1",
        "title": "Structure, Bonding and Introduction to Organic Chemistry",
        "topics": {
            "Topic 1: Formulae, Equations and Amount of Substance": [
                "1.1-1.4: Atoms, Moles, Avogadro Constant & Molar Mass (Ar, Mr, ppm)",
                "1.3 & 1.12: Chemical & Ionic Equations, State Symbols & Test-Tube Observations",
                "1.5: Solution Concentrations (mol dm^-3 and g dm^-3)",
                "1.6: Empirical & Molecular Formulae from Experimental Data",
                "1.7-1.8 & 1.11: Reacting Masses, Molar Gas Volume, pV=nRT & Core Practical 1",
                "1.9-1.10: Percentage Yield, Atom Economy & Experimental Formula Determination",
            ],
            "Topic 2: Atomic Structure and the Periodic Table": [
                "2.1-2.5: Subatomic Particles, Atomic/Mass Numbers & Isotopes",
                "2.6-2.7: Mass Spectrometry, Relative Atomic Mass & Diatomic Spectra",
                "2.8, 2.10-2.11: Ionisation Energies & Evidence for Quantum Shells and Sub-shells",
                "2.9, 2.12-2.16: Atomic Orbitals (s, p, d), Electronic Configurations & Periodic Blocks",
                "2.17-2.18: Periodicity: Melting/Boiling Point & Ionisation Energy Trends (Periods 2 & 3)",
            ],
            "Topic 3: Bonding and Structure": [
                "3A (3.1-3.7): Ionic Bonding, Lattices, Evidence for Ions & Isoelectronic Ionic Radii",
                "3A (3.8-3.9): Ion Polarisation, Polarising Power & Polarisability",
                "3B (3.10-3.12): Covalent & Dative Bonding, Dot-and-Cross & Giant Carbon Lattices",
                "3B (3.13-3.15): Electronegativity, Bond Polarity & Polar vs Non-Polar Molecules",
                "3C (3.16-3.19): Shapes of Molecules & Ions and Electron-Pair Repulsion Theory",
                "3D (3.20-3.22): Metallic Bonding, Lattices & Physical Properties of Metals",
            ],
            "Topic 4: Introductory Organic Chemistry and Alkanes": [
                "4A (4.1-4.3): Hazards, Risk Assessment & Safe Laboratory Precautions",
                "4A (4.4-4.8): Homologous Series, IUPAC Nomenclature, Reaction Types & Bond Fission",
                "4B (4.9-4.11): Alkanes & Cycloalkanes: General Formulae & Structural Isomerism",
                "4B (4.12-4.16): Crude Oil, Fractional Distillation, Cracking, Pollutants & Carbon Neutrality",
                "4B (4.17-4.18): Free Radical Substitution of Alkanes (Initiation, Propagation, Termination)",
            ],
            "Topic 5: Alkenes": [
                "5.1-5.3: Alkene Structure (Sigma & Pi Bonds) & Geometric Isomerism (Cis/Trans & E/Z)",
                "5.4-5.5: Addition Reactions of Alkenes (H2, Halogens, HX, Steam, KMnO4) & Bromine Test",
                "5.6: Electrophilic Addition Mechanisms & Carbocation Stability",
                "5.7-5.8: Addition Polymerisation, Repeat Units & Polymer Waste Management",
            ],
        },
    },
    "WCH12": {
        "unit": "Unit 2",
        "title": "Energetics, Group Chemistry, Halogenoalkanes and Alcohols",
        "topics": {
            "Topic 6: Energetics": [
                "6.1-6.4: Enthalpy Changes, Standard Definitions & Enthalpy Level Diagrams",
                "6.5 & 6.8: Calorimetry (q=mcΔT), Cooling Curves & Experimental Uncertainties",
                "6.6-6.7: Hess's Law, Enthalpy Cycles & Core Practical 2",
                "6.9-6.11: Bond Enthalpies, Mean Bond Enthalpies & Reaction Rate Links",
            ],
            "Topic 7: Intermolecular Forces": [
                "7.1-7.4: London Forces, Permanent Dipoles, Hydrogen Bonding & Anomalous Properties of Water",
                "7.5: Intermolecular Forces & Physical Properties (Boiling Points of Alkanes, Alcohols & HX)",
                "7.6: Solubility & Choice of Solvents (Hydration of Ions, Aqueous vs Non-Aqueous)",
            ],
            "Topic 8: Redox Chemistry and Groups 1, 2 and 7": [
                "8A (8.1-8.10): Oxidation Numbers, Redox Reactions, Disproportionation & Ionic Half-Equations",
                "8B (8.11-8.15): Group 1 & 2 Reactivity Trends, Reactions with O2/Cl2/H2O & Hydroxide/Sulfate Solubility",
                "8B (8.16-8.18): Thermal Stability of Group 1 & 2 Nitrates and Carbonates & Flame Tests",
                "8B (8.19): Qualitative Tests for Carbonate, Hydrogencarbonate, Sulfate & Ammonium Ions",
                "8B (8.20-8.23): Acid-Base Titrations, Standard Solutions & Volumetric Uncertainties (Core Practicals 3 & 4)",
                "8C (8.24-8.26 & 8.28): Group 7 Physical Trends, Displacement Reactions & Chlorine Disproportionation",
                "8C (8.27): Reactions of Halide Ions (Conc. H2SO4, Silver Nitrate/Ammonia & Hydrogen Halides)",
            ],
            "Topic 9: Introduction to Kinetics and Equilibria": [
                "9A (9.1-9.3): Collision Theory, Activation Energy & Graphical Rate Calculations",
                "9A (9.4-9.8): Maxwell-Boltzmann Distribution, Reaction Profiles & Role of Catalysts",
                "9B (9.9-9.11): Dynamic Equilibrium, Le Chatelier's Principle & Industrial Compromises",
            ],
            "Topic 10: Organic Chemistry: Halogenoalkanes, Alcohols and Spectra": [
                "10A (10.1-10.5): General Principles: Reaction Classification, Mechanisms, Nucleophiles & Bond Polarity",
                "10B (10.6-10.9): Halogenoalkanes: Nomenclature, Nucleophilic Substitution (OH-, NH3, CN-) & Elimination",
                "10B (10.10-10.14): Rates of Hydrolysis of Halogenoalkanes, Bond Enthalpy Effects & Core Practicals 5 & 6",
                "10C (10.15-10.17): Alcohols: Classification, Combustion, Halogenation (PCl5, KBr/H2SO4, P/I2) & Dehydration",
                "10C (10.18-10.20): Oxidation of Alcohols, Organic Liquid Purification (Reflux, Distillation) & Core Practical 7",
                "10D (10.21-10.23): Organic Mass Spectrometry (Fragmentation), Infrared (IR) Spectroscopy & Core Practical 8",
            ],
        },
    },
    "WCH13": {
        "unit": "Unit 3",
        "title": "Practical Skills in Chemistry I",
        "topics": {
            "Unit 3 Practical Skills: Core Practicals 1–8 & Laboratory Techniques I": [
                "U3.1: Quantitative & Volumetric Practicals (Molar Gas Volume CP1 & Acid-Base Titrations CP3, CP4)",
                "U3.2: Thermochemistry & Kinetics Practicals (Hess's Law CP2, Rates & Haloalkane Hydrolysis CP5)",
                "U3.3: Qualitative Inorganic Analysis (Tests for Cations, Anions, Gases & Flame Tests CP8)",
                "U3.4: Qualitative Organic Analysis & Spectroscopy in Practical Contexts (Functional Group Tests CP8)",
                "U3.5: Organic Preparation & Purification Techniques (Reflux, Distillation, Separating Funnel, Drying CP6, CP7)",
                "U3.6: Experimental Planning, Apparatus, Safety, Uncertainties & Graphical Data Analysis",
            ],
        },
    },
    "WCH14": {
        "unit": "Unit 4",
        "title": "Rates, Equilibria and Further Organic Chemistry",
        "topics": {
            "Topic 11: Kinetics": [
                "11.1-11.5: Rate Equations, Orders of Reaction, Half-Life & Experimental Rate Methods (Initial & Continuous)",
                "11.6-11.9 & 11.12: Rate-Determining Step, Reaction Mechanisms (Iodine-Propanone, SN1/SN2) & Core Practicals 9a/9b",
                "11.10-11.11 & 11.13: Activation Energy, Arrhenius Equation, Heterogeneous Catalysis & Core Practical 10",
            ],
            "Topic 12: Entropy and Energetics": [
                "12A (12.1-12.5): Entropy (ΔS), Disorder, State/Mole Changes & Spontaneous Processes",
                "12A (12.6-12.11): System, Surroundings & Total Entropy (ΔS_total), Feasibility & Thermodynamic vs Kinetic Stability",
                "12B (12.12-12.15): Lattice Energy, Born-Haber Cycles, Ion Polarisation & Experimental vs Theoretical Lattice Energy",
                "12B (12.16-12.19): Enthalpy of Solution & Hydration, Ionic Charge/Radius Effects & Solubility Predictions",
            ],
            "Topic 13: Chemical Equilibria": [
                "13.1-13.3: Equilibrium Constants Kc and Kp (Homogeneous & Heterogeneous) & Calculations",
                "13.4-13.9: Effects of Temperature, Pressure & Catalysts on Equilibrium, Kc/Kp & ΔS_total = R ln K",
            ],
            "Topic 14: Acid-base Equilibria": [
                "14.1-14.7 & 14.10-14.13: Brønsted-Lowry Theory, pH of Strong Acids & Strong Bases, Kw & Dilution Effects",
                "14.8-14.9, 14.14 & 14.23: Weak Acids, Acid Dissociation Constant (Ka, pKa) Calculations & Core Practical 11",
                "14.15-14.16 & 14.21: Acid-Base Titration Curves (Monoprotic & Diprotic), Indicator Selection & Half-Neutralisation",
                "14.17-14.20 & 14.22: Buffer Solutions: Action, pH Calculations, Preparation & Biological Importance",
            ],
            "Topic 15: Organic Chemistry: Carbonyls, Carboxylic Acids and Chirality": [
                "15A (15.1-15.5): Chirality, Optical Isomerism, Plane-Polarised Light, Racemic Mixtures & SN1/SN2 Stereochemistry",
                "15B (15.6-15.8): Aldehydes & Ketones: Properties, Oxidation/Reduction, HCN Nucleophilic Addition, 2,4-DNPH & Iodoform",
                "15C (15.9-15.12): Carboxylic Acids: Properties, Preparation (Oxidation, Nitrile Hydrolysis) & Reactions",
                "15D (15.13-15.16): Acyl Chlorides, Esters (Acid/Alkaline Hydrolysis) & Condensation Polyesters",
                "15E (15.17-15.20): High-Resolution Mass Spectrometry, Carbon-13 (13C) NMR & Proton (1H) NMR Spectroscopy",
                "15E (15.21-15.23): Chromatography: Paper/TLC (Rf Values), HPLC & Gas Chromatography (GC-MS)",
            ],
        },
    },
    "WCH15": {
        "unit": "Unit 5",
        "title": "Transition Metals and Organic Nitrogen Chemistry",
        "topics": {
            "Topic 16: Redox Equilibria": [
                "16.1-16.9: Standard Electrode Potentials (E°), Standard Hydrogen Electrode, Cell Diagrams & Core Practical 12",
                "16.10-16.14: Thermodynamic Feasibility, Disproportionation, E°_cell vs ΔS_total/ln K & Kinetic Limitations",
                "16.15-16.17: Redox Titrations (MnO4- / Fe2+ and I2 / S2O3 2-), Uncertainties & Core Practicals 13a/13b",
                "16.18-16.19: Fuel Cells (Hydrogen-Oxygen Acidic & Alkaline Electrolytes and Hydrogen-Rich Fuels)",
            ],
            "Topic 17: Transition Metals and their Chemistry": [
                "17.1-17.6 & 17.10-17.17: Transition Metal Properties, Electronic Configurations, Ligands, Complex Shapes & Cis-Platin/Haemoglobin",
                "17.7-17.9 & 17.11: Origin of Colour in Complexes (d-Orbital Splitting) & Factors Affecting Colour",
                "17.18-17.21: Vanadium (+5 to +2) Redox Chemistry & Chromium (Cr2O7 2- / CrO4 2- / Cr3+ / Cr2+) Reactions",
                "17.22-17.25 & 17.33: Aqueous Metal Ion Reactions (NaOH & NH3), Deprotonation, Ligand Exchange, Chelate Effect & Core Practical 14",
                "17.26-17.32: Heterogeneous & Homogeneous Catalysis (V2O5 Contact Process, Catalytic Converters, Fe2+ & Mn2+ Autocatalysis)",
            ],
            "Topic 18: Organic Chemistry - Arenes": [
                "18.1-18.3: Benzene Structure, Thermochemical/X-Ray/IR Evidence, Delocalised Pi-System & Resistance to Bromination",
                "18.4-18.5: Reactions of Benzene & Electrophilic Substitution Mechanisms (Halogenation, Nitration, Sulfonation, Friedel-Crafts)",
                "18.6: Phenol: Reaction with Bromine Water & Relative Reactivity vs Benzene",
            ],
            "Topic 19: Organic Nitrogen Compounds: Amines, Amides, Amino Acids and Proteins": [
                "19.1-19.5: Amines: Nomenclature, Basicity (Aliphatic vs Aromatic), Preparation & Reactions",
                "19.6: Aromatic Amines with Nitrous Acid (Diazotisation) & Azo Dye Coupling Reactions",
                "19.7-19.10: Amides, Polyamides (Condensation Polymerisation) & Addition Polymers (Poly(propenamide), Poly(ethenol))",
                "19.11-19.12: Amino Acids (Zwitterions, Acidity/Basicity, Optical Activity, Peptide Bonds), Proteins & Core Practical 15",
            ],
            "Topic 20: Organic Synthesis": [
                "20.1: Structure Elucidation from Combined Analytical Data (Combustion, % Composition, Chemical Tests, IR, MS, 13C & 1H NMR)",
                "20.2-20.3: Multi-Step Organic Synthesis, Carbon-Chain Extension (Grignard Reagents & Nitriles) & Hazard Control",
                "20.4-20.5: Advanced Organic Preparation & Purification (Recrystallisation, Steam Distillation, Melting Point & Aspirin CP16)",
            ],
        },
    },
    "WCH16": {
        "unit": "Unit 6",
        "title": "Practical Skills in Chemistry II",
        "topics": {
            "Unit 6 Practical Skills: Core Practicals 9–16 & Laboratory Techniques II": [
                "U6.1: Transition Metal & Inorganic Qualitative Analysis (NaOH, NH3, Redox & Precipitation Tests CP14, CP15)",
                "U6.2: Advanced Organic Qualitative Analysis & Structure Deduction (Functional Group Tests & Spectroscopy CP15)",
                "U6.3: Quantitative Kinetics, Equilibria & pH/Ka Practicals (Clock/Titrimetric Rates CP9, Arrhenius CP10, Ka/Buffers CP11)",
                "U6.4: Electrochemical Cells & Redox Titration Practicals (Cell EMF CP12, MnO4- & Iodine-Thiosulfate Titrations CP13a/b)",
                "U6.5: Organic Synthesis, Recrystallisation & Purity Determination (Aspirin Preparation CP16, Melting Point, Washing/Drying)",
            ],
        },
    },
}

def get_unit_from_code(code: str) -> str:
    code_upper = code.upper()
    for k, v in OFFICIAL_SYLLABUS.items():
        if k in code_upper:
            return v["unit"]
    return "Unit 1"

def get_syllabus_for_unit(unit_name: str) -> Dict[str, List[str]]:
    for _, info in OFFICIAL_SYLLABUS.items():
        if info["unit"] == unit_name:
            return info["topics"]
    return OFFICIAL_SYLLABUS["WCH11"]["topics"]

def get_all_subtopics_for_unit(unit_name: str) -> List[str]:
    topics = get_syllabus_for_unit(unit_name)
    subtopics = []
    for subs in topics.values():
        subtopics.extend(subs)
    return subtopics

def normalize_subtopic_name(subtopic: str) -> str:
    s = (subtopic or "").strip()
    return SUBTOPIC_ALIASES.get(s, s)


def get_parent_topic_for_subtopic(subtopic: str) -> str:
    s = normalize_subtopic_name(subtopic)
    for _, unit_data in OFFICIAL_SYLLABUS.items():
        for top, subs in unit_data["topics"].items():
            if s in subs:
                return top
    return "General Chemistry"


def get_unit_for_subtopic(subtopic: str) -> str:
    s = normalize_subtopic_name(subtopic)
    for _, unit_data in OFFICIAL_SYLLABUS.items():
        for _, subs in unit_data["topics"].items():
            if s in subs:
                return unit_data["unit"]
    return "Unit 1"


def is_subtopic_valid_for_unit(subtopic: str, unit_or_code: str) -> bool:
    """Returns True if and only if `subtopic` belongs strictly to `unit_or_code` (e.g. 'Unit 1' or 'WCH11')."""
    s = normalize_subtopic_name(subtopic)
    if not s:
        return False
    u_raw = (unit_or_code or "").strip()
    target_unit = u_raw if u_raw.startswith("Unit ") else get_unit_from_code(u_raw)
    allowed_subs = set(get_all_subtopics_for_unit(target_unit))
    return s in allowed_subs


def enforce_chemistry_subtopic_hierarchy(
    unit_or_code: str,
    main_subtopic: str,
    related_subtopics: List[str],
    own_prompt_text: str = "",
    own_ms_text: str = "",
) -> Tuple[str, str, List[str]]:
    """
    Enforces strict Edexcel IAL Chemistry classification rules:
    1. Strict Unit Scoping: A question from Unit X can ONLY be assigned primary & secondary subtopics from Unit X.
    2. Sub-part Isolation & Hazard/Risk Assessment Rules:
       - `4A (4.1-4.3)` is strictly a Unit 1 subtopic.
       - Any Unit 1 sub-part explicitly asking about a hazard, risk, risk assessment, or safety precaution
         must have `4A (4.1-4.3)` as its primary subtopic (with `4B (4.12-4.16)` as secondary when involving alkane pollutants).
       - Strip `4A (4.1-4.3)` if attached to non-hazard sub-parts (e.g., IUPAC naming, structure drawing, or sub-parts with no hazard/risk concepts).
    3. Primary vs. Secondary Subtopic Hierarchy:
       - Foundational generic skills (`1.3 & 1.12` / `1.3 & 1.10`, `4A (4.4-4.8)`) must not usurp a specific Topic 1-5 subtopic as primary.
    4. Secondary Subtopic Cap:
       - Maximum 1 secondary subtopic (`len(related_subtopics) <= 1`, max 2 subtopics total).
    """
    u_raw = (unit_or_code or "").strip()
    unit_name = u_raw if u_raw.startswith("Unit ") else get_unit_from_code(u_raw)
    allowed_unit_subs = get_all_subtopics_for_unit(unit_name)
    allowed_set = set(allowed_unit_subs)

    main_sub = normalize_subtopic_name(main_subtopic)
    raw_rels = [normalize_subtopic_name(r) for r in (related_subtopics or []) if r]

    # 1. Strict Unit Scoping on primary and secondary subtopics
    valid_rels: List[str] = []
    for r in raw_rels:
        if r in allowed_set and r not in valid_rels:
            valid_rels.append(r)

    if main_sub not in allowed_set:
        if valid_rels:
            main_sub = valid_rels.pop(0)
        else:
            main_sub = allowed_unit_subs[0]

    valid_rels = [r for r in valid_rels if r != main_sub]

    own_qp = (own_prompt_text or "").strip()
    own_ms = (own_ms_text or "").strip()
    own_combined = f"{own_qp} {own_ms}".strip()

    # 2. Hazard & Risk Assessment (`4A (4.1-4.3)`) Rules (Unit 1 only)
    if unit_name == "Unit 1":
        # Strip non-hazard 4A (4.1-4.3) bleed
        is_iupac_or_structure_prompt = bool(
            re.search(
                r"\b(iupac\s+name|give\s+the\s+name|skeletal\s+formula|displayed\s+formula|structural\s+formula)\b",
                own_qp,
                re.I,
            )
            and not HAZARD_PROMPT_RE.search(own_qp)
        )
        if HAZARD_SUBTOPIC in valid_rels:
            if (own_qp and not HAZARD_BROAD_RE.search(own_qp)) or is_iupac_or_structure_prompt:
                valid_rels = [r for r in valid_rels if r != HAZARD_SUBTOPIC]

        if main_sub == HAZARD_SUBTOPIC and valid_rels:
            if (own_combined and not HAZARD_BROAD_RE.search(own_combined)) or is_iupac_or_structure_prompt:
                main_sub = valid_rels.pop(0)

        # Promote 4A (4.1-4.3) to primary when Unit 1 sub-part explicitly asks about hazard/risk/precaution
        if (
            main_sub != HAZARD_SUBTOPIC
            and own_qp
            and HAZARD_PROMPT_RE.search(own_qp)
            and not NON_HAZARD_PROMPT_EXCLUSION_RE.search(own_qp)
        ):
            prev_main = main_sub
            main_sub = HAZARD_SUBTOPIC
            valid_rels = [r for r in valid_rels if r != HAZARD_SUBTOPIC]
            if prev_main in allowed_set and prev_main != HAZARD_SUBTOPIC:
                valid_rels.insert(0, prev_main)

    # 3. Primary vs. Secondary Subtopic Hierarchy (prevent generic subtopic hijacking)
    if main_sub in (EQUATIONS_SUBTOPIC, NOMENCLATURE_SUBTOPIC):
        specific_rels = [r for r in valid_rels if r not in FOUNDATIONAL_GENERIC_SUBTOPICS]
        if specific_rels:
            promoted = specific_rels[0]
            demoted = main_sub
            remaining = [r for r in valid_rels if r != promoted]
            main_sub = promoted
            # Keep the demoted generic subtopic as secondary only if no other specific subtopic takes priority
            valid_rels = [demoted] + remaining
        elif main_sub == EQUATIONS_SUBTOPIC and unit_name == "Unit 1" and own_qp:
            if re.search(
                r"\b(combustion|complete\s+combustion|incomplete\s+combustion|reforming|cracking|alkane|heptane|octane|dodecane|isooctane|propane|butane)\b",
                own_qp,
                re.I,
            ):
                main_sub = ALKANE_FUELS_POLLUTANTS_SUBTOPIC
                valid_rels = [EQUATIONS_SUBTOPIC]
            elif re.search(
                r"\b(hydrogenation|alkene|squalene|propene|ethene|bromine\s+water)\b",
                own_qp,
                re.I,
            ):
                main_sub = ALKENE_ADDITION_SUBTOPIC
                valid_rels = [EQUATIONS_SUBTOPIC]

    # 4. Cap secondary subtopics at max 1 (total max 2 subtopics per sub-part)
    valid_rels = [r for r in valid_rels if r != main_sub and r in allowed_set][:1]
    main_topic = get_parent_topic_for_subtopic(main_sub)
    return main_topic, main_sub, valid_rels

