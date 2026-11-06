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
from typing import Dict, List, Any

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
