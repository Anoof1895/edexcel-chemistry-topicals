"""
Pearson Edexcel International Advanced Level (IAL) Mathematics (Issue 3) Specification Topics & Subtopics.
Covers:
- WMA11: Unit 1: Pure Mathematics 1 (P1)
- WMA12: Unit 2: Pure Mathematics 2 (P2)
- WMA13: Unit 3: Pure Mathematics 3 (P3)
- WMA14: Unit 4: Pure Mathematics 4 (P4)
- WME01: Unit 5: Mechanics 1 (M1)
- WST01: Unit 6: Statistics 1 (S1)

Note: Every Topic and Subtopic is prefixed with its unit identifier (P1, P2, P3, P4, M1, S1)
so that getParentTopicForSubtopic and getUnitForSubtopic are 100% collision-free across units.
"""

import re
from typing import Dict, List, Any, Tuple

OFFICIAL_MATH_SYLLABUS: Dict[str, Dict[str, Any]] = {
    "WMA11": {
        "unit": "Unit 1: Pure Mathematics 1 (P1)",
        "title": "Pure Mathematics 1 (P1)",
        "code": "WMA11",
        "topics": {
            "P1 Topic 1: Algebra and Functions": [
                "P1 1.1-1.2: Laws of Indices & Manipulation/Rationalisation of Surds",
                "P1 1.3-1.5: Quadratic Functions, Graphs, Discriminant (b²-4ac) & Completing the Square",
                "P1 1.6-1.9: Simultaneous Equations (Linear/Quadratic) & Linear/Quadratic Inequalities (Algebraic & Graphical Shading)",
                "P1 1.10-1.11: Polynomial Manipulation/Factorisation & Sketching Cubic and Reciprocal Curves (y=k/x, y=k/x², Asymptotes)",
                "P1 1.12: Single Graph Transformations (y=af(x), y=f(x)+a, y=f(x+a), y=f(ax))",
            ],
            "P1 Topic 2: Coordinate Geometry in the (x, y) Plane": [
                "P1 2.1: Equations of Straight Lines (y-y1=m(x-x1), ax+by+c=0), Gradients & Intercepts",
                "P1 2.2: Parallel & Perpendicular Straight Lines and Geometric Line Intersection Problems",
            ],
            "P1 Topic 3: Trigonometry": [
                "P1 3.1: Sine Rule (including Ambiguous Case), Cosine Rule & Area of a Triangle (½ab sinC)",
                "P1 3.2: Radian Measure, Arc Length (s=rθ) & Area of a Sector (A=½r²θ)",
                "P1 3.3: Sine, Cosine & Tangent Graphs, Symmetries, Periodicity & Transformed Trig Sketching",
            ],
            "P1 Topic 4: Differentiation": [
                "P1 4.1-4.2: Differentiating x^n (Sums, Differences, Multiples), First/Second Derivatives (f'(x), f''(x)) & Rates of Change",
                "P1 4.3: Gradients, Equations of Tangents and Normals to Curves",
            ],
            "P1 Topic 5: Integration": [
                "P1 5.1-5.2a: Indefinite Integration of x^n (n ≠ -1) & Simplifying Expressions Before Integrating",
                "P1 5.2b: Finding the Equation of a Curve y=f(x) Given f'(x) and a Point on the Curve",
            ],
        },
    },
    "WMA12": {
        "unit": "Unit 2: Pure Mathematics 2 (P2)",
        "title": "Pure Mathematics 2 (P2)",
        "code": "WMA12",
        "topics": {
            "P2 Topic 1: Proof": [
                "P2 1.1-1.3: Structure of Mathematical Proof, Proof by Exhaustion & Disproof by Counter-Example",
            ],
            "P2 Topic 2: Algebra and Functions": [
                "P2 2.1: Algebraic Division by (ax±b), Factor Theorem, Remainder Theorem & Factorising Cubics",
            ],
            "P2 Topic 3: Coordinate Geometry in the (x, y) Plane": [
                "P2 3.1: Coordinate Geometry of the Circle ((x-a)²+(y-b)²=r²) & Circle Theorems (Semicircle, Chord Bisector, Radius-Tangent)",
            ],
            "P2 Topic 4: Sequences and Series": [
                "P2 4.1 & 4.3: Nth Term Formulae, Recurrence Relations x_{n+1}=f(x_n) & Increasing, Decreasing and Periodic Sequences",
                "P2 4.2: Arithmetic Sequences & Series (Nth Term, Sum of n Terms, Sum Proof & Sigma Σ Notation)",
                "P2 4.4: Geometric Sequences & Series (Nth Term, Finite Sum, Sum Proof & Sum to Infinity for |r|<1)",
                "P2 4.5: Binomial Expansion of (a+bx)^n for Positive Integer n",
            ],
            "P2 Topic 5: Exponentials and Logarithms": [
                "P2 5.1-5.2: Exponential Functions/Graphs (y=a^x) & Laws of Logarithms",
                "P2 5.3: Solving Exponential & Logarithmic Equations (a^x=b) and Change of Base",
            ],
            "P2 Topic 6: Trigonometry": [
                "P2 6.1: Trigonometric Identities (tanθ ≡ sinθ/cosθ and sin²θ + cos²θ ≡ 1) & Proofs",
                "P2 6.2: Solving Trigonometric Equations in a Given Interval (Linear, Multiple-Angle & Quadratic Trig Equations)",
            ],
            "P2 Topic 7: Differentiation": [
                "P2 7.1a: Increasing & Decreasing Functions, Stationary Points & Nature of Turning Points (Maxima/Minima)",
                "P2 7.1b: Practical Optimisation & Modelling Problems Using Maxima and Minima",
            ],
            "P2 Topic 8: Integration": [
                "P2 8.1-8.2: Definite Integration & Area Bounded by Curves and Straight Lines",
                "P2 8.3: Numerical Integration Using the Trapezium Rule & Overestimate/Underestimate Analysis",
            ],
        },
    },
    "WMA13": {
        "unit": "Unit 3: Pure Mathematics 3 (P3)",
        "title": "Pure Mathematics 3 (P3)",
        "code": "WMA13",
        "topics": {
            "P3 Topic 1: Algebra and Functions": [
                "P3 1.1: Simplifying Rational Expressions, Factorising/Cancelling & Algebraic Division",
                "P3 1.2: Functions: Domain & Range, One-to-One/Many-to-One Mappings, Composite (fg) & Inverse Functions (f^-1)",
                "P3 1.3-1.4: Modulus Function (y=|f(x)|, y=f(|x|), |ax+b| Equations/Inequalities) & Combined Transformations",
            ],
            "P3 Topic 2: Trigonometry": [
                "P3 2.1-2.2: Secant, Cosecant, Cotangent, Inverse Trig (arcsin, arccos, arctan) & Pythagorean Identities (sec²θ, cosec²θ)",
                "P3 2.3a: Compound Angle (sin(A±B), cos(A±B), tan(A±B)) & Double/Half Angle Formulae",
                "P3 2.3b: Harmonic Form Expressions (a cosθ + b sinθ ≡ R cos(θ±α) or R sin(θ±α)), Maxima/Minima & Equations",
            ],
            "P3 Topic 3: Exponentials and Logarithms": [
                "P3 3.1-3.2: Functions e^x and ln x, Graphs of y=e^(ax+b)+c, Inverse Relationship & Exact Equations",
                "P3 3.3: Logarithmic Graphs & Linear Reduction for Power Laws (y=ax^n) and Exponential Models (y=kb^x)",
            ],
            "P3 Topic 4: Differentiation": [
                "P3 4.1 & 4.3: Differentiating e^(kx), ln(kx), a^x, sin(kx), cos(kx), tan(kx) & Using dy/dx = 1/(dx/dy)",
                "P3 4.2: Product Rule, Quotient Rule, Chain Rule & Differentiating sec x, cosec x, cot x",
                "P3 4.4: Exponential Growth and Decay Modelling, Rates of Change & Model Limitations",
            ],
            "P3 Topic 5: Integration": [
                "P3 5.1: Integrating Standard Functions (e^(kx), 1/x, sin(kx), cos(kx), sec²(kx), a^x)",
                "P3 5.2: Reverse Chain Rule (∫f'(x)/f(x) dx = ln|f(x)|, ∫f'(x)[f(x)]^n dx) & Trig Identity Integration (sin²x, cos²x, tan²x)",
            ],
            "P3 Topic 6: Numerical Methods": [
                "P3 6.1-6.2: Locating Roots by Change of Sign, Fixed-Point Iteration x_{n+1}=f(x_n) & Cobweb/Staircase Diagrams",
            ],
        },
    },
    "WMA14": {
        "unit": "Unit 4: Pure Mathematics 4 (P4)",
        "title": "Pure Mathematics 4 (P4)",
        "code": "WMA14",
        "topics": {
            "P4 Topic 1: Proof": [
                "P4 1.1: Proof by Contradiction (Irrationality of √2, Infinity of Primes & Unfamiliar Proofs)",
            ],
            "P4 Topic 2: Algebra and Functions": [
                "P4 2.1: Partial Fractions (Distinct Linear Factors, Repeated Linear Factors & Improper Rational Functions)",
            ],
            "P4 Topic 3: Coordinate Geometry in the (x, y) Plane": [
                "P4 3.1: Parametric Equations of Curves, Parametric-to-Cartesian Conversion & Curve Intersections",
            ],
            "P4 Topic 4: Binomial Expansion": [
                "P4 4.1: Binomial Series Expansion of (ax+b)^n for Rational n, Validity (|x|<b/a) & Partial Fraction Expansions",
            ],
            "P4 Topic 5: Differentiation": [
                "P4 5.1: Implicit Differentiation & Parametric Differentiation (including Tangents, Normals & Stationary Points)",
                "P4 5.2: Connected Rates of Change & Forming Differential Equations",
            ],
            "P4 Topic 6: Integration": [
                "P4 6.1 & 6.5: Area Under Parametric Curves & Volumes of Revolution (π∫y² dx, Cartesian & Parametric)",
                "P4 6.2a: Integration by Substitution",
                "P4 6.2b: Integration by Parts (Single & Repeated Applications, including ∫ln x dx)",
                "P4 6.3: Integration Using Partial Fractions",
                "P4 6.4: Analytical Solution of First-Order Separable Differential Equations (General & Particular Solutions)",
            ],
            "P4 Topic 7: Vectors": [
                "P4 7.1-7.5: 2D & 3D Vectors, Magnitude, Unit Vectors, Position Vectors & Distance Between Points",
                "P4 7.6: Vector Equations of Straight Lines (r=a+tb) & Parallel, Intersecting or Skew Lines",
                "P4 7.7: Scalar (Dot) Product, Angle Between Two Vectors/Lines, Perpendicularity & Shortest Distance",
            ],
        },
    },
    "WME01": {
        "unit": "Unit 5: Mechanics 1 (M1)",
        "title": "Mechanics 1 (M1)",
        "code": "WME01",
        "topics": {
            "M1 Topic 1 & 2: Mathematical Models and Vectors in Mechanics": [
                "M1 1.1 & 2.1-2.2: Modelling Assumptions & 2D Vectors (Magnitude, Direction, i/j Components, Velocity/Force Resultants)",
            ],
            "M1 Topic 3: Kinematics of a Particle Moving in a Straight Line": [
                "M1 3.1a: Constant Acceleration Formulae (SUVAT) in Horizontal & Vertical Free-Fall Motion",
                "M1 3.1b: Kinematics Graphs (Displacement-Time, Velocity-Time, Speed-Time & Acceleration-Time Graphs)",
            ],
            "M1 Topic 4: Dynamics of a Particle Moving in a Straight Line or Plane": [
                "M1 4.1 & 4.4: Newton's Laws of Motion (F=ma), Resolving Forces, Inclined Planes & Dynamic Friction (F=μR)",
                "M1 4.2: Connected Particles: Tow-Bars, Lift Problems & Smooth Fixed Pulleys/Pegs",
                "M1 4.3: Momentum, Impulse (I=mv-mu) & Direct Collisions (Conservation of Linear Momentum)",
            ],
            "M1 Topic 5: Statics of a Particle": [
                "M1 5.1-5.3: Equilibrium of a Particle Under Coplanar Forces, Tension, Thrust & Limiting Friction (F ≤ μR)",
            ],
            "M1 Topic 6: Moments": [
                "M1 6.1: Moments of Coplanar Parallel Forces, Uniform/Non-Uniform Rigid Rods in Equilibrium & Tilting/Point of Slipping",
            ],
        },
    },
    "WST01": {
        "unit": "Unit 6: Statistics 1 (S1)",
        "title": "Statistics 1 (S1)",
        "code": "WST01",
        "topics": {
            "S1 Topic 1 & 2: Mathematical Models and Representation & Summary of Data": [
                "S1 1.1 & 2.1: Statistical Modelling, Histograms, Stem & Leaf Diagrams (including Back-to-Back) & Box Plots",
                "S1 2.2-2.4: Mean, Median, Quartiles (Interpolation), Variance, Standard Deviation, Linear Coding, Outliers & Skewness",
            ],
            "S1 Topic 3: Probability": [
                "S1 3.1-3.3: Sample Spaces, Venn Diagrams, Mutually Exclusive & Independent Events, Addition & Conditional Probability Laws",
                "S1 3.4: Tree Diagrams & Sampling With and Without Replacement",
            ],
            "S1 Topic 4: Correlation and Regression": [
                "S1 4.1-4.2: Scatter Diagrams, Explanatory/Response Variables, Least Squares Linear Regression (y on x, Coding) & Interpolation/Extrapolation",
                "S1 4.3: Product Moment Correlation Coefficient (PMCC r), Calculation, Interpretation & Limitations",
            ],
            "S1 Topic 5: Discrete Random Variables": [
                "S1 5.1-5.2: Probability Distribution Function p(x) & Cumulative Distribution Function F(x0)",
                "S1 5.3-5.4: Expectation E(X), E(X²), Variance Var(X), Linear Transformations E(aX+b)/Var(aX+b) & Discrete Uniform Distribution",
            ],
            "S1 Topic 6: The Normal Distribution": [
                "S1 6.1a: Normal Distribution N(μ, σ²), Standardisation Z=(X-μ)/σ & Finding Probabilities/Values Using Normal Tables",
                "S1 6.1b: Finding Unknown Mean (μ), Standard Deviation (σ), or Both Using Simultaneous Equations from Percentage Points",
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
        num = m.group(1)
        mapping = {"1": "WMA11", "2": "WMA12", "3": "WMA13", "4": "WMA14", "5": "WME01", "6": "WST01"}
        return mapping.get(num, "WMA11")

    return "WMA11"


def get_math_unit_from_code(code: str) -> str:
    canon = normalize_math_unit_code(code)
    return OFFICIAL_MATH_SYLLABUS.get(canon, {}).get("unit", "Unit 1: Pure Mathematics 1 (P1)")


def get_math_unit_full_title(code_or_identifier: str) -> str:
    canon = normalize_math_unit_code(code_or_identifier)
    info = OFFICIAL_MATH_SYLLABUS.get(canon, OFFICIAL_MATH_SYLLABUS["WMA11"])
    return f"{info['unit']}"


def get_math_syllabus_for_unit(identifier: str) -> Dict[str, List[str]]:
    canon = normalize_math_unit_code(identifier)
    return OFFICIAL_MATH_SYLLABUS.get(canon, OFFICIAL_MATH_SYLLABUS["WMA11"])["topics"]


def get_all_math_subtopics_for_unit(identifier: str) -> List[str]:
    topics = get_math_syllabus_for_unit(identifier)
    subtopics = []
    for subs in topics.values():
        subtopics.extend(subs)
    return subtopics


def get_math_parent_topic_for_subtopic(subtopic: str) -> str:
    for _, unit_data in OFFICIAL_MATH_SYLLABUS.items():
        for top, subs in unit_data["topics"].items():
            if subtopic in subs:
                return top
    return "General Mathematics"


def get_math_unit_for_subtopic(subtopic: str) -> str:
    for _, unit_data in OFFICIAL_MATH_SYLLABUS.items():
        for _, subs in unit_data["topics"].items():
            if subtopic in subs:
                return unit_data["unit"]
    return "Unit 1: Pure Mathematics 1 (P1)"


EXPECTED_MATH_PAPER_MARKS: Dict[str, int] = {
    "WMA11": 75, "WMA12": 75, "WMA13": 75, "WMA14": 75, "WME01": 75, "WST01": 75,
}


def get_expected_paper_marks(unit_code: str = "") -> int:
    canon = normalize_math_unit_code(unit_code)
    return EXPECTED_MATH_PAPER_MARKS.get(canon, 75)


# Canonical Mathematics subtopic constants for hierarchy & disambiguation rules
MATH_P1_INDICES_SURDS = (
    "P1 1.1-1.2: Laws of Indices & Manipulation/Rationalisation of Surds"
)
MATH_P1_QUADRATICS = (
    "P1 1.3-1.5: Quadratic Functions, Graphs, Discriminant (b²-4ac) & Completing the Square"
)
MATH_P1_SIMULTANEOUS_INEQ = (
    "P1 1.6-1.9: Simultaneous Equations (Linear/Quadratic) & Linear/Quadratic Inequalities (Algebraic & Graphical Shading)"
)
MATH_P2_ALGEBRA_DIV = (
    "P2 2.1: Algebraic Division by (ax±b), Factor Theorem, Remainder Theorem & Factorising Cubics"
)
MATH_P2_EXP_LOGS_INTRO = (
    "P2 5.1-5.2: Exponential Functions/Graphs (y=a^x) & Laws of Logarithms"
)
MATH_P2_EXP_LOGS_EQNS = (
    "P2 5.3: Solving Exponential & Logarithmic Equations (a^x=b) and Change of Base"
)
MATH_P2_TRIG_IDENTITIES = (
    "P2 6.1: Trigonometric Identities (tanθ ≡ sinθ/cosθ and sin²θ + cos²θ ≡ 1) & Proofs"
)
MATH_P2_TRIG_EQNS = (
    "P2 6.2: Solving Trigonometric Equations in a Given Interval (Linear, Multiple-Angle & Quadratic Trig Equations)"
)
MATH_P3_ALGEBRA_DIV = (
    "P3 1.1: Simplifying Rational Expressions, Factorising/Cancelling & Algebraic Division"
)
MATH_P3_EXP_LN_INTRO = (
    "P3 3.1-3.2: Functions e^x and ln x, Graphs of y=e^(ax+b)+c, Inverse Relationship & Exact Equations"
)
MATH_P4_PARTIAL_FRACTIONS = (
    "P4 2.1: Partial Fractions (Distinct Linear Factors, Repeated Linear Factors & Improper Rational Functions)"
)
MATH_P4_VECTORS_INTRO = (
    "P4 7.1-7.5: 2D & 3D Vectors, Magnitude, Unit Vectors, Position Vectors & Distance Between Points"
)
MATH_M1_VECTORS_MODELS = (
    "M1 1.1 & 2.1-2.2: Modelling Assumptions & 2D Vectors (Magnitude, Direction, i/j Components, Velocity/Force Resultants)"
)
MATH_S1_HISTOGRAM_STEM_BOX = (
    "S1 1.1 & 2.1: Statistical Modelling, Histograms, Stem & Leaf Diagrams (including Back-to-Back) & Box Plots"
)
MATH_S1_LOCATION_DISPERSION = (
    "S1 2.2-2.4: Mean, Median, Quartiles (Interpolation), Variance, Standard Deviation, Linear Coding, Outliers & Skewness"
)
MATH_S1_NORMAL_A = (
    "S1 6.1a: Normal Distribution N(μ, σ²), Standardisation Z=(X-μ)/σ & Finding Probabilities/Values Using Normal Tables"
)
MATH_S1_NORMAL_B = (
    "S1 6.1b: Finding Unknown Mean (μ), Standard Deviation (σ), or Both Using Simultaneous Equations from Percentage Points"
)

MATH_GENERIC_FOUNDATIONAL_BY_UNIT: Dict[str, set] = {
    "WMA11": {MATH_P1_INDICES_SURDS, MATH_P1_QUADRATICS, MATH_P1_SIMULTANEOUS_INEQ},
    "WMA12": {MATH_P2_ALGEBRA_DIV, MATH_P2_EXP_LOGS_INTRO, MATH_P2_TRIG_IDENTITIES},
    "WMA13": {MATH_P3_ALGEBRA_DIV, MATH_P3_EXP_LN_INTRO},
    "WMA14": {MATH_P4_PARTIAL_FRACTIONS, MATH_P4_VECTORS_INTRO},
    "WME01": {MATH_M1_VECTORS_MODELS},
    "WST01": set(),
}

S1_DIAGRAM_KEYWORD_RE = re.compile(
    r"\b(histogram|histograms|stem\s+and\s+leaf|stem-and-leaf|back-to-back|box\s+plot|box\s+plots|boxplot|whisker)\b",
    re.I,
)

S1_UNKNOWN_MU_SIGMA_RE = re.compile(
    r"("
    r"value\s+of\s+μ\s+and\s+the\s+value\s+of\s+σ|"
    r"calculate\s+the\s+mean\s+and\s+standard\s+deviation|"
    r"find\s+two\s+equations\s+in\s+terms\s+of\s+μ\s+and\s+σ|"
    r"show\s+that.*σ\s*=\s*\d+|"
    r"changes\s+the\s+mean\s+to\s+m\b.*find\s+the\s+value\s+of\s+m|"
    r"σ\s*=\s*k\b.*find\s+the\s+value\s+of\s+r\s+and\s+the\s+value\s+of\s+k"
    r")",
    re.I | re.S,
)

S1_PRIMARY_UNKNOWN_MU_SIGMA_RE = re.compile(
    r"("
    r"\(a\)\s*(?:find|calculate)[^\(]{0,60}value\s+of\s+μ\s+and\s+the\s+value\s+of\s+σ|"
    r"2\s*μ\s*=\s*3\s*σ"
    r")",
    re.I | re.S,
)


def is_math_subtopic_valid_for_unit(subtopic: str, unit_or_code: str) -> bool:
    """
    Returns True if and only if `subtopic` belongs strictly to `unit_or_code`
    (e.g., 'WMA11', 'P1', or 'Unit 1: Pure Mathematics 1 (P1)').
    """
    if not subtopic:
        return False
    allowed = set(get_all_math_subtopics_for_unit(unit_or_code))
    return subtopic in allowed


def enforce_math_subtopic_hierarchy(
    unit_or_code: str,
    main_subtopic: str,
    related_subtopics: List[str],
    own_prompt_text: str = "",
    own_ms_text: str = "",
) -> Tuple[str, str, List[str]]:
    """
    Enforces strict unit scoping, subtopic disambiguation, and primary vs. secondary hierarchy
    for a Mathematics question:
    1. Strips any cross-unit subtopics that do not belong to `unit_or_code`.
    2. Promotes specific target syllabus topics (Calculus, Coordinate Geometry, Trig Equations,
       Log/Exp Equations, Exponential Modelling, Partial Fraction Integration/Binomial/ODEs,
       Dot Product, M1 Kinematics/Dynamics) over foundational algebraic/vector setup skills
       (`P1 1.1-1.2`, `P1 1.3-1.5`, `P1 1.6-1.9`, `P2 2.1`, `P2 5.1-5.2`, `P2 6.1`, `P3 1.1`,
       `P3 3.1-3.2`, `P4 2.1`, `P4 7.1-7.5`, `M1 1.1 & 2.1-2.2`).
    3. Disambiguates `S1 1.1 & 2.1` vs `S1 2.2-2.4` and `S1 6.1a` vs `S1 6.1b` in Statistics 1 (`WST01`).
    4. Caps `related_subtopics` at 1 item (maximum 2 subtopics total per question).
    """
    ucode = normalize_math_unit_code(unit_or_code)
    allowed_list = get_all_math_subtopics_for_unit(ucode)
    allowed_set = set(allowed_list)

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

    if ucode == "WMA11":
        # Promote P1 Topic 2-5 (Coordinate Geometry, Trig, Differentiation, Integration) over P1 1.1-1.9,
        # and P1 1.3-1.9 (Quadratics/Simultaneous/Inequalities) over P1 1.1-1.2 (Indices/Surds)
        if main_subtopic in (MATH_P1_INDICES_SURDS, MATH_P1_QUADRATICS, MATH_P1_SIMULTANEOUS_INEQ) and valid_rels:
            calculus_rels = [r for r in valid_rels if r.startswith(("P1 4.", "P1 5."))]
            other_spec_rels = [r for r in valid_rels if r.startswith(("P1 2.", "P1 3."))]
            alg_rels = (
                [r for r in valid_rels if r in (MATH_P1_QUADRATICS, MATH_P1_SIMULTANEOUS_INEQ)]
                if main_subtopic == MATH_P1_INDICES_SURDS
                else []
            )
            target_rels = calculus_rels or other_spec_rels or alg_rels
            if target_rels:
                # Exception: If main_subtopic is P1 1.6-1.9 and the question explicitly tests graphical inequality shading
                is_graphical_ineq = (
                    main_subtopic == MATH_P1_SIMULTANEOUS_INEQ
                    and bool(re.search(r"\b(defined\s+by\s+the\s+inequalities|region\s+R\d?\b.*shaded|inequalities\s+that\s+define)\b", own_combined, re.I))
                )
                if not is_graphical_ineq:
                    promoted = target_rels[0]
                    valid_rels.remove(promoted)
                    valid_rels.insert(0, main_subtopic)
                    main_subtopic = promoted

    elif ucode == "WMA12":
        if main_subtopic == MATH_P2_ALGEBRA_DIV and valid_rels:
            target_rels = [r for r in valid_rels if not r.startswith("P2 2.1")]
            if target_rels:
                promoted = target_rels[0]
                valid_rels.remove(promoted)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted
        elif main_subtopic == MATH_P2_EXP_LOGS_INTRO and MATH_P2_EXP_LOGS_EQNS in valid_rels:
            valid_rels.remove(MATH_P2_EXP_LOGS_EQNS)
            valid_rels.insert(0, main_subtopic)
            main_subtopic = MATH_P2_EXP_LOGS_EQNS
        elif main_subtopic == MATH_P2_TRIG_IDENTITIES and MATH_P2_TRIG_EQNS in valid_rels:
            # Keep P2 6.1 as primary when the question explicitly asks to prove a trigonometric identity (≡)
            if "≡" not in own_combined:
                valid_rels.remove(MATH_P2_TRIG_EQNS)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = MATH_P2_TRIG_EQNS
        elif main_subtopic == MATH_P2_TRIG_EQNS and MATH_P2_TRIG_IDENTITIES in valid_rels:
            if "≡" in own_combined:
                valid_rels.remove(MATH_P2_TRIG_IDENTITIES)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = MATH_P2_TRIG_IDENTITIES

    elif ucode == "WMA13":
        if main_subtopic == MATH_P3_ALGEBRA_DIV and valid_rels:
            target_rels = [r for r in valid_rels if r.startswith(("P3 2.", "P3 3.3", "P3 4.", "P3 5.", "P3 6."))]
            if target_rels:
                promoted = target_rels[0]
                valid_rels.remove(promoted)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted
        elif main_subtopic.startswith("P3 1.2") and MATH_P3_ALGEBRA_DIV in valid_rels:
            valid_rels.remove(MATH_P3_ALGEBRA_DIV)
            valid_rels.insert(0, main_subtopic)
            main_subtopic = MATH_P3_ALGEBRA_DIV
        elif main_subtopic == MATH_P3_EXP_LN_INTRO and valid_rels:
            target_rels = [r for r in valid_rels if r.startswith(("P3 3.3", "P3 4.", "P3 5.", "P3 6."))]
            if target_rels:
                promoted = target_rels[0]
                valid_rels.remove(promoted)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted

    elif ucode == "WMA14":
        if main_subtopic == MATH_P4_PARTIAL_FRACTIONS and valid_rels:
            target_rels = [r for r in valid_rels if r.startswith(("P4 3.", "P4 4.", "P4 5.", "P4 6."))]
            if target_rels:
                promoted = target_rels[0]
                valid_rels.remove(promoted)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted
        elif main_subtopic == MATH_P4_VECTORS_INTRO and valid_rels:
            target_rels = [r for r in valid_rels if r.startswith(("P4 7.6", "P4 7.7"))]
            if target_rels:
                promoted = target_rels[0]
                valid_rels.remove(promoted)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted

    elif ucode == "WME01":
        # Promote M1 Topic 3-6 (Kinematics SUVAT/Graphs, Dynamics F=ma, Statics, Moments) over M1 1.1 & 2.1-2.2 (2D Vectors)
        if main_subtopic == MATH_M1_VECTORS_MODELS and valid_rels:
            # Only keep M1 1.1 & 2.1-2.2 as main if the question is purely about vector resultant/direction without mass/acceleration/time
            has_kinematics_or_dynamics = bool(
                re.search(r"\b(mass|acceleration|moves|moving|speed\s+of\s+P\s+at\s+time|velocity\s+of\s+P\s+at\s+time|at\s+rest)\b", own_combined, re.I)
            )
            if has_kinematics_or_dynamics or len(own_combined) < 20:
                promoted = valid_rels.pop(0)
                valid_rels.insert(0, main_subtopic)
                main_subtopic = promoted

    elif ucode == "WST01":
        # 1. Disambiguate S1 1.1 & 2.1 (Histograms/Stem & Leaf/Box Plots) vs S1 2.2-2.4 (Mean/SD/Quartiles/Coding)
        if main_subtopic == MATH_S1_HISTOGRAM_STEM_BOX and len(own_combined) >= 20:
            if not S1_DIAGRAM_KEYWORD_RE.search(own_combined):
                # Prefer S1 4.1-4.2 if scatter diagram is mentioned, otherwise S1 2.2-2.4
                scatter_rels = [r for r in valid_rels if r.startswith("S1 4.")]
                if scatter_rels and re.search(r"\bscatter\s+diagram|regression\b", own_combined, re.I):
                    promoted = scatter_rels[0]
                    valid_rels.remove(promoted)
                    main_subtopic = promoted
                elif MATH_S1_LOCATION_DISPERSION in valid_rels:
                    valid_rels.remove(MATH_S1_LOCATION_DISPERSION)
                    main_subtopic = MATH_S1_LOCATION_DISPERSION

        # 2. Disambiguate S1 6.1a vs S1 6.1b (Finding Unknown Mean μ / Standard Deviation σ)
        if main_subtopic in (MATH_S1_NORMAL_A, MATH_S1_NORMAL_B) and len(own_combined) >= 20:
            has_unknown_mu_sigma = bool(S1_UNKNOWN_MU_SIGMA_RE.search(own_combined))
            if has_unknown_mu_sigma:
                if S1_PRIMARY_UNKNOWN_MU_SIGMA_RE.search(own_combined):
                    main_subtopic = MATH_S1_NORMAL_B
                    if MATH_S1_NORMAL_A not in valid_rels:
                        valid_rels.insert(0, MATH_S1_NORMAL_A)
                else:
                    main_subtopic = MATH_S1_NORMAL_A
                    if MATH_S1_NORMAL_B not in valid_rels:
                        valid_rels.insert(0, MATH_S1_NORMAL_B)
            else:
                if MATH_S1_NORMAL_B in valid_rels:
                    valid_rels.remove(MATH_S1_NORMAL_B)
                if main_subtopic == MATH_S1_NORMAL_B:
                    main_subtopic = MATH_S1_NORMAL_A

    valid_rels = [r for r in valid_rels if r != main_subtopic][:1]
    main_topic = get_math_parent_topic_for_subtopic(main_subtopic)
    return main_topic, main_subtopic, valid_rels
