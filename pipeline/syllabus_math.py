"""
Pearson Edexcel International Advanced Level (IAL) Mathematics Specification Topics & Subtopics.
Covers:
- WMA11: Unit 1: Pure Mathematics 1 (P1)
- WMA12: Unit 2: Pure Mathematics 2 (P2)
- WMA13: Unit 3: Pure Mathematics 3 (P3)
- WMA14: Unit 4: Pure Mathematics 4 (P4)
- WME01: Unit 5: Mechanics 1 (M1)
- WST01: Unit 6: Statistics 1 (S1)
"""

import re
from typing import Dict, List, Any

OFFICIAL_MATH_SYLLABUS: Dict[str, Dict[str, Any]] = {
    "WMA11": {
        "unit": "Unit 1",
        "title": "Pure Mathematics 1 (P1)",
        "code": "WMA11",
        "topics": {
            "Topic 1: Algebra and Functions": [
                "1.1: Laws of Indices & Surds",
                "1.2: Quadratic Functions, Discriminant & Completing the Square",
                "1.3: Simultaneous Equations & Inequalities",
                "1.4: Polynomials, Curve Sketching & Transformations",
            ],
            "Topic 2: Coordinate Geometry in the (x, y) Plane": [
                "2.1: Straight Lines, Gradients, Parallel & Perpendicular Lines",
            ],
            "Topic 3: Trigonometry": [
                "3.1: Sine & Cosine Rules, Area of a Triangle",
                "3.2: Radian Measure, Arc Length & Sector Area",
                "3.3: Trigonometric Graphs & Periodicity",
            ],
            "Topic 4: Differentiation": [
                "4.1: Derivatives of x^n, First & Second Order Derivatives",
                "4.2: Gradients, Tangents, Normals & Rates of Change",
            ],
            "Topic 5: Integration": [
                "5.1: Indefinite Integration of x^n & Finding Equations of Curves",
            ],
        },
    },
    "WMA12": {
        "unit": "Unit 2",
        "title": "Pure Mathematics 2 (P2)",
        "code": "WMA12",
        "topics": {
            "Topic 1: Proof": [
                "1.1: Structure of Proof, Proof by Exhaustion & Counter-Example",
            ],
            "Topic 2: Algebra and Functions": [
                "2.1: Algebraic Division, Factor & Remainder Theorems",
            ],
            "Topic 3: Coordinate Geometry in the (x, y) Plane": [
                "3.1: Coordinate Geometry of the Circle",
            ],
            "Topic 4: Sequences and Series": [
                "4.1: Nth Term & Recurrence Relations",
                "4.2: Arithmetic Sequences & Series",
                "4.3: Geometric Sequences, Series & Sum to Infinity",
                "4.4: Binomial Expansion for Positive Integer n",
            ],
            "Topic 5: Exponentials and Logarithms": [
                "5.1: Exponential Functions, Laws of Logarithms & Equations a^x = b",
            ],
            "Topic 6: Trigonometry": [
                "6.1: Trigonometric Identities & Equations in a Given Interval",
            ],
            "Topic 7: Differentiation": [
                "7.1: Stationary Points, Maxima/Minima & Increasing/Decreasing Functions",
            ],
            "Topic 8: Integration": [
                "8.1: Definite Integrals & Area Under/Between Curves",
                "8.2: Trapezium Rule",
            ],
        },
    },
    "WMA13": {
        "unit": "Unit 3",
        "title": "Pure Mathematics 3 (P3)",
        "code": "WMA13",
        "topics": {
            "Topic 1: Algebra and Functions": [
                "1.1: Rational Expressions & Algebraic Division",
                "1.2: Functions, Domain/Range, Composite & Inverse Functions",
                "1.3: Modulus Function & Combinations of Transformations",
            ],
            "Topic 2: Trigonometry": [
                "2.1: Secant, Cosecant, Cotangent & Inverse Trig Functions",
                "2.2: Compound Angle, Double Angle & R sin/cos(θ ± α) Formulae",
            ],
            "Topic 3: Exponentials and Logarithms": [
                "3.1: e^x, ln x & Logarithmic Graphs (Linear Reduction)",
            ],
            "Topic 4: Differentiation": [
                "4.1: Differentiating e^kx, ln x, Trig Functions",
                "4.2: Product, Quotient, Chain Rules & dx/dy",
                "4.3: Exponential Growth & Decay Modelling",
            ],
            "Topic 5: Integration": [
                "5.1: Integrating e^kx, 1/x, Trig Functions & Reverse Chain Rule",
            ],
            "Topic 6: Numerical Methods": [
                "6.1: Change of Sign & Fixed-Point Iteration x_{n+1} = f(x_n)",
            ],
        },
    },
    "WMA14": {
        "unit": "Unit 4",
        "title": "Pure Mathematics 4 (P4)",
        "code": "WMA14",
        "topics": {
            "Topic 1: Proof": [
                "1.1: Proof by Contradiction",
            ],
            "Topic 2: Algebra and Functions": [
                "2.1: Partial Fractions",
            ],
            "Topic 3: Coordinate Geometry in the (x, y) Plane": [
                "3.1: Parametric Equations & Cartesian Conversion",
            ],
            "Topic 4: Binomial Expansion": [
                "4.1: Binomial Series for Rational n & Partial Fraction Expansions",
            ],
            "Topic 5: Differentiation": [
                "5.1: Implicit & Parametric Differentiation",
                "5.2: Connected Rates of Change & Differential Equations",
            ],
            "Topic 6: Integration": [
                "6.1: Volumes of Revolution & Parametric Area",
                "6.2: Integration by Substitution, Parts & Partial Fractions",
                "6.3: First-Order Separable Differential Equations",
            ],
            "Topic 7: Vectors": [
                "7.1: 2D/3D Vectors, Magnitude, Position Vectors & Distance",
                "7.2: Vector Equations of Lines, Intersecting/Skew Lines & Scalar Product",
            ],
        },
    },
    "WME01": {
        "unit": "Unit 5",
        "title": "Mechanics 1 (M1)",
        "code": "WME01",
        "topics": {
            "Topic 1: Mathematical Models & Vectors in Mechanics": [
                "1.1: Modelling Assumptions & 2D Vectors (Velocity, Acceleration, Force)",
            ],
            "Topic 2: Kinematics of a Particle Moving in a Straight Line": [
                "2.1: Constant Acceleration Formulae (SUVAT) & Motion Graphs",
            ],
            "Topic 3: Dynamics of a Particle": [
                "3.1: Newton's Laws, Inclined Planes, Friction & Connected Particles/Pulleys",
                "3.2: Momentum, Impulse & Conservation of Linear Momentum",
            ],
            "Topic 4: Statics of a Particle": [
                "4.1: Equilibrium of Coplanar Forces, Tension, Thrust & Limiting Friction",
            ],
            "Topic 5: Moments": [
                "5.1: Moments of Coplanar Parallel Forces & Equilibrium of Rigid Rods",
            ],
        },
    },
    "WST01": {
        "unit": "Unit 6",
        "title": "Statistics 1 (S1)",
        "code": "WST01",
        "topics": {
            "Topic 1: Representation and Summary of Data": [
                "1.1: Histograms, Stem & Leaf Diagrams, Box Plots & Outliers",
                "1.2: Measures of Location & Dispersion, Coding & Skewness",
            ],
            "Topic 2: Probability": [
                "2.1: Elementary & Conditional Probability, Tree & Venn Diagrams, Independence",
            ],
            "Topic 3: Correlation and Regression": [
                "3.1: Scatter Diagrams, Least Squares Linear Regression & PMCC",
            ],
            "Topic 4: Discrete Random Variables": [
                "4.1: Probability & Cumulative Distribution Functions, E(X), Var(X) & Discrete Uniform",
            ],
            "Topic 5: The Normal Distribution": [
                "5.1: Standardisation Z = (X - μ)/σ & Cumulative Normal Tables",
            ],
        },
    },
}

# Unit alias mappings for fast lookup
MATH_UNIT_ALIASES: Dict[str, str] = {
    "WMA11": "WMA11", "P1": "WMA11", "P1A": "WMA11", "P1R": "WMA11", "UNIT 1": "WMA11", "UNIT1": "WMA11", "PURE 1": "WMA11",
    "WMA12": "WMA12", "P2": "WMA12", "P2A": "WMA12", "P2R": "WMA12", "UNIT 2": "WMA12", "UNIT2": "WMA12", "PURE 2": "WMA12",
    "WMA13": "WMA13", "P3": "WMA13", "P3A": "WMA13", "P3R": "WMA13", "UNIT 3": "WMA13", "UNIT3": "WMA13", "PURE 3": "WMA13",
    "WMA14": "WMA14", "P4": "WMA14", "P4A": "WMA14", "P4R": "WMA14", "UNIT 4": "WMA14", "UNIT4": "WMA14", "PURE 4": "WMA14",
    "WME01": "WME01", "M1": "WME01", "M1A": "WME01", "M1R": "WME01", "UNIT 5": "WME01", "UNIT5": "WME01", "MECHANICS 1": "WME01",
    "WST01": "WST01", "S1": "WST01", "S1A": "WST01", "S1R": "WST01", "UNIT 6": "WST01", "UNIT6": "WST01", "STATISTICS 1": "WST01",
}


def normalize_math_unit_code(code: str) -> str:
    """Normalizes any code/alias (e.g. 'P1', 'wma11-01a', 'Unit 1') to standard 'WMA11'."""
    raw = (code or "").strip().upper()
    if raw in MATH_UNIT_ALIASES:
        return MATH_UNIT_ALIASES[raw]

    # Check direct substring
    for alias, canon in MATH_UNIT_ALIASES.items():
        if alias in raw:
            return canon

    # Regex patterns
    if re.search(r"\bWMA11\b|\bP1\b|\bP1A\b|\bP1R\b", raw):
        return "WMA11"
    if re.search(r"\bWMA12\b|\bP2\b|\bP2A\b|\bP2R\b", raw):
        return "WMA12"
    if re.search(r"\bWMA13\b|\bP3\b|\bP3A\b|\bP3R\b", raw):
        return "WMA13"
    if re.search(r"\bWMA14\b|\bP4\b|\bP4A\b|\bP4R\b", raw):
        return "WMA14"
    if re.search(r"\bWME01\b|\bM1\b|\bM1A\b|\bM1R\b", raw):
        return "WME01"
    if re.search(r"\bWST01\b|\bS1\b|\bS1A\b|\bS1R\b", raw):
        return "WST01"

    m = re.search(r"\b(?:UNIT\s*|U)?([1-6])\b", raw)
    if m:
        u_map = {"1": "WMA11", "2": "WMA12", "3": "WMA13", "4": "WMA14", "5": "WME01", "6": "WST01"}
        return u_map.get(m.group(1), "WMA11")

    return "WMA11"


def get_math_unit_from_code(code: str) -> str:
    """Returns 'Unit 1', 'Unit 2', etc. for a given code/identifier."""
    canon = normalize_math_unit_code(code)
    return OFFICIAL_MATH_SYLLABUS.get(canon, OFFICIAL_MATH_SYLLABUS["WMA11"])["unit"]


def get_math_unit_full_title(code_or_identifier: str) -> str:
    """Returns full title e.g. 'Unit 1: Pure Mathematics 1 (P1)'."""
    canon = normalize_math_unit_code(code_or_identifier)
    info = OFFICIAL_MATH_SYLLABUS.get(canon, OFFICIAL_MATH_SYLLABUS["WMA11"])
    return f"{info['unit']}: {info['title']}"


def get_math_syllabus_for_unit(identifier: str) -> Dict[str, List[str]]:
    """Returns the dictionary of Topics -> Subtopics for the given unit."""
    canon = normalize_math_unit_code(identifier)
    return OFFICIAL_MATH_SYLLABUS.get(canon, OFFICIAL_MATH_SYLLABUS["WMA11"])["topics"]


def get_all_math_subtopics_for_unit(identifier: str) -> List[str]:
    """Returns a flat list of all official subtopics for the given unit."""
    topics = get_math_syllabus_for_unit(identifier)
    subtopics = []
    for subs in topics.values():
        subtopics.extend(subs)
    return subtopics


def get_math_parent_topic_for_subtopic(subtopic: str) -> str:
    """Given an official subtopic string, finds its parent Topic title."""
    for _, unit_data in OFFICIAL_MATH_SYLLABUS.items():
        for top, subs in unit_data["topics"].items():
            if subtopic in subs:
                return top
    return "General Mathematics"


def get_math_unit_for_subtopic(subtopic: str) -> str:
    """Given an official subtopic string, finds its Unit ('Unit 1', etc.)."""
    for _, unit_data in OFFICIAL_MATH_SYLLABUS.items():
        for _, subs in unit_data["topics"].items():
            if subtopic in subs:
                return unit_data["unit"]
    return "Unit 1"


def get_expected_paper_marks(unit_code: str = "") -> int:
    """Every IAL Mathematics unit has 75 expected marks."""
    return 75
