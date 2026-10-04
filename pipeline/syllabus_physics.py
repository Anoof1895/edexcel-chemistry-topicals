"""
Pearson Edexcel International Advanced Level (IAL) Physics Specification Topics & Subtopics.
Covers:
- AS Level: Unit 1 (WPH11), Unit 2 (WPH12), Unit 3 (WPH13)
- A2 Level: Unit 4 (WPH14), Unit 5 (WPH15), Unit 6 (WPH16)
"""

import re
from typing import Dict, List, Any

OFFICIAL_PHYSICS_SYLLABUS: Dict[str, Dict[str, Any]] = {
    "WPH11": {
        "unit": "Unit 1",
        "title": "Mechanics and Materials",
        "topics": {
            "Topic 1: Mechanics": [
                "1.1: Physical Quantities, SI Units & Vectors",
                "1.2: Kinematics, Motion Graphs & SUVAT Equations",
                "1.3: Projectile Motion & Trajectory Analysis",
                "1.4: Newton's Laws of Motion, Momentum & Impulse",
                "1.5: Forces in Equilibrium, Moments & Centre of Gravity",
                "1.6: Work, Kinetic & Potential Energy, Power & Efficiency"
            ],
            "Topic 2: Materials": [
                "2.1: Density, Upthrust, Archimedes' Principle & Fluid Flow",
                "2.2: Viscosity, Temperature Effects, Stokes' Law & Terminal Velocity",
                "2.3: Hooke's Law, Elastic & Plastic Deformation",
                "2.4: Stress, Strain, Young Modulus & Force-Extension Graphs",
                "2.5: Material Properties (Brittle, Ductile, Tough, Hard, Malleable)"
            ]
        }
    },
    "WPH12": {
        "unit": "Unit 2",
        "title": "Waves and Electricity",
        "topics": {
            "Topic 3: Waves and the Particle Nature of Light": [
                "3.1: Wave Properties (Transverse & Longitudinal, Amplitude, Frequency, Wavelength, Wave Equation)",
                "3.2: Refraction, Reflection & Total Internal Reflection (Snell's Law, Critical Angle)",
                "3.3: Superposition & Interference (Path Difference, Phase Difference, Two-Source Interference, Young's Double Slit)",
                "3.4: Stationary Waves (Nodes, Antinodes, Harmonics on strings and in air columns)",
                "3.5: Diffraction (Diffraction gratings, Single slit, n*lambda = d*sin(theta))",
                "3.6: Polarization (Malus' Law, Applications of polarized light)",
                "3.7: Pulse-Echo Techniques & Ultrasound",
                "3.8: Photons & The Photoelectric Effect (Work function, Threshold frequency, Einstein's Photoelectric Equation)",
                "3.9: Wave-Particle Duality & De Broglie Wavelength",
                "3.10: Atomic Line Spectra & Energy Levels (Photon emission/absorption, Transition equations)"
            ],
            "Topic 4: Electric Circuits": [
                "4.1: Electric Current, Charge & Drift Velocity (I = nqvA)",
                "4.2: Potential Difference, EMF & Electrical Energy/Power (P = VI, P = I^2*R, W = VQ)",
                "4.3: Resistance, Ohm's Law & I-V Characteristics (Ohmic conductors, Filament lamps, Diodes)",
                "4.4: Resistivity & Temperature Effects (R = rho*L/A, Thermistors, Superconductivity)",
                "4.5: Series and Parallel Circuits (Kirchhoff's First and Second Laws, Equivalent resistance)",
                "4.6: Potential Dividers & Sensor Circuits (LDRs, NTC thermistors, Potentiometers)",
                "4.7: Internal Resistance & Terminal Potential Difference (E = V + Ir, Load resistance matching)"
            ]
        }
    },
    "WPH13": {
        "unit": "Unit 3",
        "title": "Practical Skills in Physics I",
        "topics": {
            "Topic 5: Practical Skills and Techniques I": [
                "5.1: Experimental Planning, Apparatus & Core Practicals (AS)",
                "5.2: Measurement Uncertainties, Errors & Percentage Uncertainties",
                "5.3: Graphical Analysis, Error Propagation & Evaluation of Results"
            ]
        }
    },
    "WPH14": {
        "unit": "Unit 4",
        "title": "Further Mechanics, Fields and Particles",
        "topics": {
            "Topic 6: Further Mechanics": [
                "6.1: 2D Momentum, Elastic & Inelastic Collisions",
                "6.2: Circular Motion, Centripetal Acceleration & Centripetal Force"
            ],
            "Topic 7: Electric and Magnetic Fields": [
                "7.1: Electric Fields, Coulomb's Law, Field Strength & Potential",
                "7.2: Capacitors, Charging/Discharging & Energy Stored",
                "7.3: Magnetic Fields, Force on Moving Charges & Fleming's Left-Hand Rule",
                "7.4: Electromagnetic Induction, Magnetic Flux, Faraday's & Lenz's Laws"
            ],
            "Topic 8: Particle Physics": [
                "8.1: Particle Accelerators (Linacs, Cyclotrons) & Detectors",
                "8.2: Standard Model (Quarks, Leptons, Hadrons) & Conservation Laws"
            ]
        }
    },
    "WPH15": {
        "unit": "Unit 5",
        "title": "Thermodynamics, Radiation, Oscillations and Cosmology",
        "topics": {
            "Topic 9: Thermodynamics": [
                "9.1: Specific Heat Capacity, Latent Heat & Internal Energy",
                "9.2: Ideal Gas Laws, pV = NkT & Kinetic Theory Model"
            ],
            "Topic 10: Nuclear Radiation and Decay": [
                "10.1: Alpha, Beta & Gamma Radiation, Radioactive Decay & Half-life",
                "10.2: Nuclear Binding Energy, Mass Defect, Fission & Fusion"
            ],
            "Topic 11: Oscillations": [
                "11.1: Simple Harmonic Motion (SHM) Kinematics & Energy Transfers",
                "11.2: Free & Forced Oscillations, Damping & Resonance"
            ],
            "Topic 12: Astrophysics and Cosmology": [
                "12.1: Gravitational Fields, Newton's Law of Gravitation & Gravitational Potential",
                "12.2: Stellar Radii, Luminosity, Black Body Radiation & Hertzsprung-Russell Diagrams",
                "12.3: Astronomical Distances (Standard Candles, Hubble's Law) & Cosmic Expansion"
            ]
        }
    },
    "WPH16": {
        "unit": "Unit 6",
        "title": "Practical Skills in Physics II",
        "topics": {
            "Topic 13: Practical Skills and Techniques II": [
                "13.1: Advanced Core Practicals & Experimental Methods (A2)",
                "13.2: Instrument Calibration, Systematic & Random Error Analysis",
                "13.3: Logarithmic & Power-Law Graph Linearisation and Verification"
            ]
        }
    }
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
    "WPH11": 80, "WPH12": 80,   # 10 Section A + 70 Section B
    "WPH14": 90, "WPH15": 90,   # 10 Section A + 80 Section B
    "WPH13": 50, "WPH16": 50,   # Practical skills (no MCQs)
}

def get_expected_paper_marks(unit_code: str) -> int:
    m = re.search(r"WPH1([1-6])", (unit_code or "").upper())
    return EXPECTED_PAPER_MARKS.get(f"WPH1{m.group(1)}", 80) if m else 80

