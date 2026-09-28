"""
Pearson Edexcel International Advanced Level (IAL) Chemistry Specification Topics & Subtopics.
Covers:
- AS Level: Unit 1 (WCH11), Unit 2 (WCH12), Unit 3 (WCH13)
- A2 Level (Stubs): Unit 4 (WCH14), Unit 5 (WCH15), Unit 6 (WCH16)
"""

from typing import Dict, List, Any

OFFICIAL_SYLLABUS: Dict[str, Dict[str, Any]] = {
    "WCH11": {
        "unit": "Unit 1",
        "title": "Structure, Bonding and Introduction to Organic Chemistry",
        "topics": {
            "Topic 1: Formulae, Equations and Amount of Substance": [
                "1.1-1.4: Moles, Avogadro Constant & Molar Mass",
                "1.5-1.6: Empirical & Molecular Formulae",
                "1.7-1.8: Reacting Masses, Gas Volumes & pV=nRT",
                "1.9-1.10: Solutions, Concentrations & Titration Calculations",
                "1.11-1.12: Atom Economy & Percentage Yield"
            ],
            "Topic 2: Atomic Structure and the Periodic Table": [
                "2.1-2.2: Subatomic Particles, Isotopes & Relative Masses",
                "2.3-2.5: Mass Spectrometry & Isotope Abundances",
                "2.6-2.7: Atomic Orbitals & Electronic Configurations",
                "2.8-2.9: Ionisation Energies & Evidence for Quantum Shells",
                "2.10-2.11: Periodic Trends across Periods 2 & 3"
            ],
            "Topic 3: Bonding and Structure": [
                "3A: Ionic Bonding & Nature of Ionic Lattices",
                "3B: Covalent & Dative Covalent Bonding",
                "3C: Shapes of Molecules & Electron-Pair Repulsion Theory",
                "3D: Electronegativity & Bond Polarity",
                "3E: Metallic Bonding & Giant Structures"
            ],
            "Topic 4: Introductory Organic Chemistry and Alkanes": [
                "4.1-4.3: IUPAC Nomenclature & Functional Groups",
                "4.4-4.5: Structural Isomerism (Chain, Position, Functional)",
                "4.6-4.7: Fractional Distillation, Cracking & Fuel Economics",
                "4.8-4.9: Combustion & Environmental Impact (Pollutants)",
                "4.10-4.11: Free Radical Substitution of Alkanes & Reaction Steps"
            ],
            "Topic 5: Alkenes": [
                "5.1-5.2: Structure & Bonding in Alkenes (Sigma & Pi Bonds)",
                "5.3-5.4: Geometric Isomerism (E/Z & CIP Priority Rules)",
                "5.5: Addition Reactions of Alkenes (Halogens, Hydrogen Halides, Steam, KMnO4)",
                "5.6: Electrophilic Addition Mechanism & Carbocation Stability",
                "5.7-5.8: Addition Polymers & Waste Polymer Management"
            ]
        }
    },
    "WCH12": {
        "unit": "Unit 2",
        "title": "Energetics, Group Chemistry, Halogenoalkanes and Alcohols",
        "topics": {
            "Topic 6: Energetics": [
                "6.1-6.3: Standard Enthalpy Changes (Reaction, Formation, Combustion, Neutralisation)",
                "6.4-6.5: Calorimetry & Experimental Enthalpy Determinations",
                "6.6-6.8: Hess's Law & Enthalpy Cycles",
                "6.9-6.10: Bond Enthalpies & Mean Bond Enthalpies"
            ],
            "Topic 7: Intermolecular Forces": [
                "7.1-7.2: London Dispersion Forces & Dipole-Dipole Interactions",
                "7.3-7.4: Hydrogen Bonding & Anomalous Properties of Water",
                "7.5-7.6: Physical Properties & Solvent Interactions"
            ],
            "Topic 8: Redox Chemistry and Groups 1, 2 and 7": [
                "8.1-8.3: Oxidation Numbers & Redox Half-Equations",
                "8.4-8.6: Group 2 Physical & Chemical Trends (Reactivity, Hydroxides, Sulfates)",
                "8.7-8.9: Thermal Stability of Nitrates & Carbonates",
                "8.10-8.11: Flame Tests & Origin of Flame Colours",
                "8.12-8.15: Group 7 Trends & Halogen-Halide Displacement",
                "8.16-8.18: Reactions of Halide Ions with H2SO4 & Silver Nitrate Testing",
                "8.19-8.20: Disproportionation of Chlorine & Water Treatment"
            ],
            "Topic 9: Introduction to Kinetics and Equilibria": [
                "9.1-9.3: Collision Theory, Activation Energy & Catalyst Action",
                "9.4-9.5: Maxwell-Boltzmann Distribution & Temperature Effects",
                "9.6-9.8: Dynamic Chemical Equilibrium & Le Chatelier's Principle",
                "9.9-9.10: Industrial Equilibrium Compromise (Haber & Contact Processes)"
            ],
            "Topic 10: Organic Chemistry: Halogenoalkanes, Alcohols and Spectra": [
                "10A: Classification & Reactions of Halogenoalkanes (Nucleophilic Substitution)",
                "10B: SN1 and SN2 Reaction Mechanisms",
                "10C: Elimination Reactions of Halogenoalkanes",
                "10D: Mass Spectrometry & Infrared (IR) Spectroscopy",
                "10E: Alcohols: Classification, Combustion & Oxidation (Primary, Secondary, Tertiary)",
                "10F: Halogenation & Dehydration of Alcohols"
            ]
        }
    },
    "WCH13": {
        "unit": "Unit 3",
        "title": "Practical Skills in Chemistry I",
        "topics": {
            "Topic 11: Core Practicals & Laboratory Techniques": [
                "11.1: Volumetric Analysis (Standard Solutions & Acid-Base Titrations)",
                "11.2: Enthalpy Determination in the Laboratory (Solution & Combustion)",
                "11.3: Qualitative Inorganic Analysis (Flame Tests, Halides, Cations, Gases)",
                "11.4: Qualitative Organic Analysis (Tests for Alkenes, Haloalkanes, Alcohols)",
                "11.5: Preparation & Purification of Organic Liquids (Reflux, Distillation, Drying)",
                "11.6: Measurement Errors, Uncertainties & Accuracy Analysis"
            ]
        }
    },
    "WCH14": {
        "unit": "Unit 4",
        "title": "Rates, Equilibria and Further Organic Chemistry",
        "topics": {
            "Topic 12: Kinetics": [
                "12.1-12.3: Rate Equations, Orders of Reaction & Rate Constant (k)",
                "12.4-12.5: Arrhenius Equation & Activation Energy Calculations"
            ],
            "Topic 13: Entropy and Energetics": [
                "13.1-13.3: Lattice Energy & Born-Haber Cycles",
                "13.4-13.6: Entropy & Gibbs Free Energy"
            ],
            "Topic 14: Chemical Equilibria": [
                "14.1-14.3: Equilibrium Constants Kc and Kp"
            ],
            "Topic 15: Acid-Base Equilibria": [
                "15.1-15.3: Brønsted-Lowry Acids, pH, Kw, Ka and Buffer Solutions"
            ],
            "Topic 16: Carbonyls, Carboxylic Acids and Chiral Molecules": [
                "16.1-16.3: Optical Isomerism & Chirality",
                "16.4-16.6: Aldehydes, Ketones & Nucleophilic Addition",
                "16.7-16.9: Carboxylic Acids, Esters & Acyl Chlorides"
            ]
        }
    },
    "WCH15": {
        "unit": "Unit 5",
        "title": "Transition Metals and Organic Nitrogen Chemistry",
        "topics": {
            "Topic 17: Redox and Electrode Potentials": [
                "17.1-17.3: Standard Electrode Potentials & Electrochemical Cells"
            ],
            "Topic 18: Transition Metals and their Chemistry": [
                "18.1-18.4: Transition Metal Characteristics, Complexes & Ligands",
                "18.5-18.7: Color, Catalysis & Redox Titrations (MnO4-, Cr2O7 2-)"
            ],
            "Topic 19: Organic Nitrogen Chemistry": [
                "19.1-19.3: Arenes (Benzene Structure & Electrophilic Aromatic Substitution)",
                "19.4-19.6: Amines, Amides, Amino Acids & Proteins",
                "19.7-19.8: Organic Synthesis & Multi-step Reaction Pathways"
            ]
        }
    },
    "WCH16": {
        "unit": "Unit 6",
        "title": "Practical Skills in Chemistry II",
        "topics": {
            "Topic 20: Advanced Practical Techniques": [
                "20.1: Transition Metal Ion Qualitative Analysis & Precipitation",
                "20.2: Organic Synthesis, Recrystallisation & Melting Point Determination",
                "20.3: Electrochemical & Spectrophotometric Techniques",
                "20.4: Advanced Spectroscopic Analysis (1H and 13C NMR, IR, Mass Spec)"
            ]
        }
    }
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

def get_parent_topic_for_subtopic(subtopic: str) -> str:
    for _, unit_data in OFFICIAL_SYLLABUS.items():
        for top, subs in unit_data["topics"].items():
            if subtopic in subs:
                return top
    return "General Chemistry"

def get_unit_for_subtopic(subtopic: str) -> str:
    for _, unit_data in OFFICIAL_SYLLABUS.items():
        for _, subs in unit_data["topics"].items():
            if subtopic in subs:
                return unit_data["unit"]
    return "Unit 1"