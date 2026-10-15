export interface PhysicalConstant {
  name: string;
  symbol: string;
  symbolLatex?: string;
  value: string;
  unit: string;
  notes?: string;
}

export interface EquationItem {
  id: string;
  topic: string;
  unit: string; // 'Unit 1' | 'Unit 2' | 'Unit 4' | 'Unit 5' | 'Physical'
  title: string;
  formula: string;
  latex: string;
  description?: string;
}

export interface IndicatorItem {
  name: string;
  pKin: string;
  acidColour: string;
  phRange: string;
  alkalineColour: string;
}

export interface SpectroscopyItem {
  group: string;
  bond?: string;
  environment: string;
  range: string;
  notes?: string;
}

export interface ChemicalShiftItem {
  type: string; // '1H' | '13C'
  structure: string;
  shiftRange: string;
  minShift?: number;
  maxShift?: number;
  example?: string;
  notes?: string;
}

export interface ElectrodePotentialItem {
  id: number;
  equation: string;
  latex?: string;
  potential: string; // E° / V
  numericValue: number;
}

export interface PeriodicElement {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: string;
  electronegativity?: number;
  period: number;
  group: number | string;
  category: 'alkali' | 'alkaline-earth' | 'transition' | 'post-transition' | 'metalloid' | 'nonmetal' | 'halogen' | 'noble-gas' | 'lanthanide' | 'actinide';
}

// =============================================================================
// PHYSICS DATA SHEET (Appendix 8)
// =============================================================================
export const PHYSICS_CONSTANTS: PhysicalConstant[] = [
  { name: 'Acceleration of free fall', symbol: 'g', symbolLatex: 'g', value: '9.81', unit: 'm s⁻²', notes: "close to Earth's surface" },
  { name: 'Boltzmann constant', symbol: 'k', symbolLatex: 'k', value: '1.38 × 10⁻²³', unit: 'J K⁻¹' },
  { name: 'Coulomb law constant', symbol: 'k = 1/(4πε₀)', symbolLatex: 'k = \\frac{1}{4\\pi\\varepsilon_0}', value: '8.99 × 10⁹', unit: 'N m² C⁻²' },
  { name: 'Electron charge', symbol: 'e', symbolLatex: 'e', value: '-1.60 × 10⁻¹⁹', unit: 'C' },
  { name: 'Electron mass', symbol: 'm_e', symbolLatex: 'm_e', value: '9.11 × 10⁻³¹', unit: 'kg' },
  { name: 'Electronvolt', symbol: '1 eV', symbolLatex: '1\\text{ eV}', value: '1.60 × 10⁻¹⁹', unit: 'J' },
  { name: 'Gravitational constant', symbol: 'G', symbolLatex: 'G', value: '6.67 × 10⁻¹¹', unit: 'N m² kg⁻²' },
  { name: 'Gravitational field strength', symbol: 'g', symbolLatex: 'g', value: '9.81', unit: 'N kg⁻¹', notes: "close to Earth's surface" },
  { name: 'Planck constant', symbol: 'h', symbolLatex: 'h', value: '6.63 × 10⁻³⁴', unit: 'J s' },
  { name: 'Permittivity of free space', symbol: 'ε₀', symbolLatex: '\\varepsilon_0', value: '8.85 × 10⁻¹²', unit: 'F m⁻¹' },
  { name: 'Proton mass', symbol: 'm_p', symbolLatex: 'm_p', value: '1.67 × 10⁻²⁷', unit: 'kg' },
  { name: 'Speed of light in a vacuum', symbol: 'c', symbolLatex: 'c', value: '3.00 × 10⁸', unit: 'm s⁻¹' },
  { name: 'Stefan-Boltzmann constant', symbol: 'σ', symbolLatex: '\\sigma', value: '5.67 × 10⁻⁸', unit: 'W m⁻² K⁻⁴' },
  { name: 'Unified atomic mass unit', symbol: 'u', symbolLatex: 'u', value: '1.66 × 10⁻²⁷', unit: 'kg' },
];

// =============================================================================
// IAS PHYSICS FORMULAE (Units 1 & 2 - Appendix 8)
// =============================================================================
export const IAS_PHYSICS_EQUATIONS: EquationItem[] = [
  // Unit 1: Mechanics
  { id: 'u1-suvat-1', unit: 'Unit 1', topic: 'Mechanics', title: 'Kinematic equation of motion', formula: 's = ½(u + v)t', latex: 's = \\frac{(u + v)t}{2}' },
  { id: 'u1-suvat-2', unit: 'Unit 1', topic: 'Mechanics', title: 'Velocity-Time relation', formula: 'v = u + at', latex: 'v = u + at' },
  { id: 'u1-suvat-3', unit: 'Unit 1', topic: 'Mechanics', title: 'Displacement with acceleration', formula: 's = ut + ½at²', latex: 's = ut + \\frac{1}{2}at^2' },
  { id: 'u1-suvat-4', unit: 'Unit 1', topic: 'Mechanics', title: 'Timeless kinematic equation', formula: 'v² = u² + 2as', latex: 'v^2 = u^2 + 2as' },
  { id: 'u1-newton2', unit: 'Unit 1', topic: 'Mechanics', title: "Newton's second law", formula: 'ΣF = ma', latex: '\\Sigma F = ma' },
  { id: 'u1-gfield', unit: 'Unit 1', topic: 'Mechanics', title: 'Gravitational field strength', formula: 'g = F / m', latex: 'g = \\frac{F}{m}' },
  { id: 'u1-weight', unit: 'Unit 1', topic: 'Mechanics', title: 'Weight', formula: 'W = mg', latex: 'W = mg' },
  { id: 'u1-momentum', unit: 'Unit 1', topic: 'Mechanics', title: 'Linear momentum', formula: 'p = mv', latex: 'p = mv' },
  { id: 'u1-moment', unit: 'Unit 1', topic: 'Mechanics', title: 'Moment of a force', formula: 'moment = Fx', latex: '\\text{moment} = Fx', description: 'x = perpendicular distance from pivot' },
  { id: 'u1-work', unit: 'Unit 1', topic: 'Mechanics', title: 'Work done', formula: 'ΔW = FΔs', latex: '\\Delta W = F\\Delta s' },
  { id: 'u1-ke', unit: 'Unit 1', topic: 'Mechanics', title: 'Kinetic energy', formula: 'E_k = ½mv²', latex: 'E_k = \\frac{1}{2}mv^2' },
  { id: 'u1-gpe', unit: 'Unit 1', topic: 'Mechanics', title: 'Gravitational potential energy', formula: 'ΔE_grav = mgΔh', latex: '\\Delta E_{\\text{grav}} = mg\\Delta h' },
  { id: 'u1-power', unit: 'Unit 1', topic: 'Mechanics', title: 'Power', formula: 'P = E / t = W / t', latex: 'P = \\frac{E}{t} = \\frac{W}{t}' },
  { id: 'u1-efficiency', unit: 'Unit 1', topic: 'Mechanics', title: 'Efficiency', formula: 'efficiency = useful / total', latex: '\\text{efficiency} = \\frac{\\text{useful energy output}}{\\text{total energy input}}' },

  // Unit 1: Materials
  { id: 'u1-density', unit: 'Unit 1', topic: 'Materials', title: 'Density', formula: 'ρ = m / V', latex: '\\rho = \\frac{m}{V}' },
  { id: 'u1-stokes', unit: 'Unit 1', topic: 'Materials', title: "Stokes' law", formula: 'F = 6πηrv', latex: 'F = 6\\pi\\eta rv', description: 'laminar flow around small spherical object' },
  { id: 'u1-hooke', unit: 'Unit 1', topic: 'Materials', title: "Hooke's law", formula: 'ΔF = kΔx', latex: '\\Delta F = k\\Delta x' },
  { id: 'u1-stress', unit: 'Unit 1', topic: 'Materials', title: 'Tensile stress', formula: 'σ = F / A', latex: '\\sigma = \\frac{F}{A}' },
  { id: 'u1-strain', unit: 'Unit 1', topic: 'Materials', title: 'Tensile strain', formula: 'ε = Δx / x', latex: '\\varepsilon = \\frac{\\Delta x}{x}' },
  { id: 'u1-young', unit: 'Unit 1', topic: 'Materials', title: 'Young modulus', formula: 'E = σ / ε', latex: 'E = \\frac{\\sigma}{\\varepsilon}' },
  { id: 'u1-strain-energy', unit: 'Unit 1', topic: 'Materials', title: 'Elastic strain energy', formula: 'ΔE_el = ½FΔx', latex: '\\Delta E_{\\text{el}} = \\frac{1}{2}F\\Delta x' },

  // Unit 2: Waves and particle nature of light
  { id: 'u2-wavespeed', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'Wave equation', formula: 'v = fλ', latex: 'v = f\\lambda' },
  { id: 'u2-stringspeed', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'Speed of a transverse wave on a string', formula: 'v = √(T / μ)', latex: 'v = \\sqrt{\\frac{T}{\\mu}}', description: 'T = tension, μ = mass per unit length' },
  { id: 'u2-intensity', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'Intensity of radiation', formula: 'I = P / A', latex: 'I = \\frac{P}{A}' },
  { id: 'u2-snell', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: "Refractive index & Snell's law", formula: 'n₁ sin θ₁ = n₂ sin θ₂', latex: 'n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2' },
  { id: 'u2-refractive', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'Refractive index definition', formula: 'n = c / v', latex: 'n = \\frac{c}{v}' },
  { id: 'u2-critical', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'Critical angle', formula: 'sin C = 1 / n', latex: '\\sin C = \\frac{1}{n}' },
  { id: 'u2-grating', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'Diffraction grating', formula: 'nλ = d sin θ', latex: 'n\\lambda = d \\sin\\theta' },
  { id: 'u2-debroglie', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'de Broglie wavelength', formula: 'λ = h / p', latex: '\\lambda = \\frac{h}{p}' },
  { id: 'u2-photon', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: 'Photon model', formula: 'E = hf', latex: 'E = hf' },
  { id: 'u2-photoelectric', unit: 'Unit 2', topic: 'Waves and particle nature of light', title: "Einstein's photoelectric equation", formula: 'hf = φ + ½mv_max²', latex: 'hf = \\phi + \\frac{1}{2}mv_{\\text{max}}^2' },

  // Unit 2: Electricity
  { id: 'u2-current', unit: 'Unit 2', topic: 'Electricity', title: 'Electric current', formula: 'I = ΔQ / Δt', latex: 'I = \\frac{\\Delta Q}{\\Delta t}' },
  { id: 'u2-pd', unit: 'Unit 2', topic: 'Electricity', title: 'Potential difference', formula: 'V = W / Q', latex: 'V = \\frac{W}{Q}' },
  { id: 'u2-resistance', unit: 'Unit 2', topic: 'Electricity', title: "Resistance / Ohm's law", formula: 'R = V / I', latex: 'R = \\frac{V}{I}' },
  { id: 'u2-power-vi', unit: 'Unit 2', topic: 'Electricity', title: 'Electrical power', formula: 'P = VI = I²R = V² / R', latex: 'P = VI = I^2R = \\frac{V^2}{R}' },
  { id: 'u2-energy', unit: 'Unit 2', topic: 'Electricity', title: 'Electrical energy', formula: 'W = VIt', latex: 'W = VIt' },
  { id: 'u2-resistivity', unit: 'Unit 2', topic: 'Electricity', title: 'Resistivity', formula: 'R = ρl / A', latex: 'R = \\frac{\\rho l}{A}' },
  { id: 'u2-drift', unit: 'Unit 2', topic: 'Electricity', title: 'Current transport equation', formula: 'I = nqvA', latex: 'I = nqvA', description: 'v = drift velocity, n = carrier density' },
];

// =============================================================================
// IA2 PHYSICS FORMULAE (Units 4 & 5 - Appendix 8)
// =============================================================================
export const IA2_PHYSICS_EQUATIONS: EquationItem[] = [
  // Unit 4: Further mechanics
  { id: 'u4-impulse', unit: 'Unit 4', topic: 'Further mechanics', title: 'Impulse', formula: 'FΔt = Δp', latex: 'F\\Delta t = \\Delta p' },
  { id: 'u4-ke-momentum', unit: 'Unit 4', topic: 'Further mechanics', title: 'Kinetic energy of non-relativistic particle', formula: 'E_k = p² / 2m', latex: 'E_k = \\frac{p^2}{2m}' },
  { id: 'u4-circle-v', unit: 'Unit 4', topic: 'Further mechanics', title: 'Linear and angular speed', formula: 'v = ωr,  T = 2π / ω', latex: 'v = \\omega r, \\quad T = \\frac{2\\pi}{\\omega}' },
  { id: 'u4-circle-a', unit: 'Unit 4', topic: 'Further mechanics', title: 'Centripetal acceleration', formula: 'a = v² / r = rω²', latex: 'a = \\frac{v^2}{r} = r\\omega^2' },
  { id: 'u4-circle-f', unit: 'Unit 4', topic: 'Further mechanics', title: 'Centripetal force', formula: 'F = mv² / r = mrω²', latex: 'F = \\frac{mv^2}{r} = mr\\omega^2' },

  // Unit 4: Electric and magnetic fields
  { id: 'u4-efield-def', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Electric field strength', formula: 'E = F / Q', latex: 'E = \\frac{F}{Q}' },
  { id: 'u4-efield-point', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Radial electric field strength', formula: 'E = Q / (4πε₀r²)', latex: 'E = \\frac{Q}{4\\pi\\varepsilon_0 r^2}' },
  { id: 'u4-efield-uniform', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Uniform electric field strength', formula: 'E = V / d', latex: 'E = \\frac{V}{d}' },
  { id: 'u4-coulomb', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: "Coulomb's law", formula: 'F = Q₁Q₂ / (4πε₀r²)', latex: 'F = \\frac{Q_1Q_2}{4\\pi\\varepsilon_0 r^2}' },
  { id: 'u4-epotential', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Electrical potential', formula: 'V = Q / (4πε₀r)', latex: 'V = \\frac{Q}{4\\pi\\varepsilon_0 r}' },
  { id: 'u4-capacitance', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Capacitance', formula: 'C = Q / V', latex: 'C = \\frac{Q}{V}' },
  { id: 'u4-cap-energy', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Energy stored in capacitor', formula: 'W = ½QV = ½CV² = ½Q² / C', latex: 'W = \\frac{1}{2}QV = \\frac{1}{2}CV^2 = \\frac{Q^2}{2C}' },
  { id: 'u4-cap-discharge', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Capacitor discharge', formula: 'Q = Q₀ e^(-t/RC)', latex: 'Q = Q_0 e^{-\\frac{t}{RC}}, \\quad I = I_0 e^{-\\frac{t}{RC}}' },
  { id: 'u4-cap-ln', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Logarithmic discharge', formula: 'ln Q = ln Q₀ - t/RC', latex: '\\ln Q = \\ln Q_0 - \\frac{t}{RC}' },
  { id: 'u4-bfield-charge', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Force on moving charge in B-field', formula: 'F = Bqv sin θ', latex: 'F = Bqv \\sin\\theta' },
  { id: 'u4-bfield-wire', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: 'Force on current-carrying wire', formula: 'F = BIl sin θ', latex: 'F = BIl \\sin\\theta' },
  { id: 'u4-faraday', unit: 'Unit 4', topic: 'Electric and magnetic fields', title: "Faraday's and Lenz's laws", formula: 'ℰ = -d(NΦ) / dt', latex: '\\mathcal{E} = -\\frac{d(N\\Phi)}{dt}' },

  // Unit 4: Nuclear and particle physics
  { id: 'u4-cyclotron', unit: 'Unit 4', topic: 'Nuclear and particle physics', title: 'Charged particle in magnetic field', formula: 'r = p / BQ', latex: 'r = \\frac{p}{BQ}' },
  { id: 'u4-mass-energy', unit: 'Unit 4', topic: 'Nuclear and particle physics', title: 'Mass-energy equivalence', formula: 'ΔE = c²Δm', latex: '\\Delta E = c^2\\Delta m' },

  // Unit 5: Thermodynamics
  { id: 'u5-heat-specific', unit: 'Unit 5', topic: 'Thermodynamics', title: 'Specific heat capacity', formula: 'ΔE = mcΔθ', latex: '\\Delta E = mc\\Delta\\theta' },
  { id: 'u5-heat-latent', unit: 'Unit 5', topic: 'Thermodynamics', title: 'Specific latent heat', formula: 'ΔE = LΔm', latex: '\\Delta E = L\\Delta m' },
  { id: 'u5-idealgas', unit: 'Unit 5', topic: 'Thermodynamics', title: 'Ideal gas equation', formula: 'pV = NkT = nRT', latex: 'pV = NkT = nRT' },
  { id: 'u5-kinetic-theory', unit: 'Unit 5', topic: 'Thermodynamics', title: 'Molecular kinetic theory', formula: '½m⟨c²⟩ = ³⁄₂kT', latex: '\\frac{1}{2}m\\langle c^2 \\rangle = \\frac{3}{2}kT' },

  // Unit 5: Nuclear decay
  { id: 'u5-decay-rate', unit: 'Unit 5', topic: 'Nuclear decay', title: 'Radioactive decay law & activity', formula: 'A = λN,  dN / dt = -λN', latex: 'A = \\lambda N, \\quad \\frac{dN}{dt} = -\\lambda N' },
  { id: 'u5-halflife', unit: 'Unit 5', topic: 'Nuclear decay', title: 'Half-life', formula: 'λ = ln 2 / t_½', latex: '\\lambda = \\frac{\\ln 2}{t_{1/2}}' },
  { id: 'u5-decay-exp', unit: 'Unit 5', topic: 'Nuclear decay', title: 'Exponential decay', formula: 'N = N₀ e^(-λt),  A = A₀ e^(-λt)', latex: 'N = N_0 e^{-\\lambda t}, \\quad A = A_0 e^{-\\lambda t}' },

  // Unit 5: Oscillations
  { id: 'u5-shm-force', unit: 'Unit 5', topic: 'Oscillations', title: 'SHM restoring force & acceleration', formula: 'F = -kx,  a = -ω²x', latex: 'F = -kx, \\quad a = -\\omega^2 x' },
  { id: 'u5-shm-sol', unit: 'Unit 5', topic: 'Oscillations', title: 'SHM kinematics solutions', formula: 'x = A cos ωt,  v = -Aω sin ωt', latex: 'x = A\\cos\\omega t, \\quad v = -A\\omega\\sin\\omega t' },
  { id: 'u5-shm-period', unit: 'Unit 5', topic: 'Oscillations', title: 'Angular frequency and period', formula: 'T = 1 / f = 2π / ω,  ω = 2πf', latex: 'T = \\frac{1}{f} = \\frac{2\\pi}{\\omega}, \\quad \\omega = 2\\pi f' },
  { id: 'u5-shm-mass-spring', unit: 'Unit 5', topic: 'Oscillations', title: 'Simple harmonic oscillator (mass-spring)', formula: 'T = 2π√(m / k)', latex: 'T = 2\\pi\\sqrt{\\frac{m}{k}}' },
  { id: 'u5-shm-pendulum', unit: 'Unit 5', topic: 'Oscillations', title: 'Simple pendulum', formula: 'T = 2π√(l / g)', latex: 'T = 2\\pi\\sqrt{\\frac{l}{g}}' },

  // Unit 5: Astrophysics and cosmology
  { id: 'u5-grav-force', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: "Newton's law of gravitation", formula: 'F = Gm₁m₂ / r²', latex: 'F = \\frac{Gm_1m_2}{r^2}' },
  { id: 'u5-grav-field', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: 'Gravitational field strength', formula: 'g = Gm / r²', latex: 'g = \\frac{Gm}{r^2}' },
  { id: 'u5-grav-pot', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: 'Gravitational potential', formula: 'V_grav = -Gm / r', latex: 'V_{\\text{grav}} = -\\frac{Gm}{r}' },
  { id: 'u5-stefan', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: "Stefan-Boltzmann law", formula: 'L = σT⁴A', latex: 'L = \\sigma T^4 A' },
  { id: 'u5-wien', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: "Wien's displacement law", formula: 'λ_max T = 2.898 × 10⁻³ m K', latex: '\\lambda_{\\text{max}} T = 2.898 \\times 10^{-3}\\text{ m K}' },
  { id: 'u5-invsquare', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: 'Inverse square law of radiation', formula: 'I = L / (4πd²)', latex: 'I = \\frac{L}{4\\pi d^2}' },
  { id: 'u5-redshift', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: 'Doppler redshift of radiation', formula: 'z = Δλ / λ ≈ Δf / f ≈ v / c', latex: 'z = \\frac{\\Delta\\lambda}{\\lambda} \\approx \\frac{\\Delta f}{f} \\approx \\frac{v}{c}' },
  { id: 'u5-hubble', unit: 'Unit 5', topic: 'Astrophysics and cosmology', title: "Hubble's law", formula: 'v = H₀d', latex: 'v = H_0 d' },
];

// =============================================================================
// CHEMISTRY SPECIFICATION DATA BOOKLET (Appendix 9)
// =============================================================================

export const CHEMISTRY_CONSTANTS: PhysicalConstant[] = [
  { name: 'Avogadro constant', symbol: 'L', symbolLatex: 'L', value: '6.02 × 10²³', unit: 'mol⁻¹' },
  { name: 'Elementary charge', symbol: 'e', symbolLatex: 'e', value: '1.60 × 10⁻¹⁹', unit: 'C' },
  { name: 'Gas constant', symbol: 'R', symbolLatex: 'R', value: '8.31', unit: 'J mol⁻¹ K⁻¹' },
  { name: 'Molar volume of a gas at room temperature and pressure (r.t.p.)', symbol: 'V_m', symbolLatex: 'V_m', value: '24', unit: 'dm³ mol⁻¹' },
  { name: 'Ionic product of water (at 298 K)', symbol: 'K_w', symbolLatex: 'K_w', value: '1.00 × 10⁻¹⁴', unit: 'mol² dm⁻⁶' },
  { name: 'Volume conversion', symbol: '1 dm³', symbolLatex: '1\\text{ dm}^3', value: '1000 cm³ = 0.001', unit: 'm³' },
];

export const CHEMISTRY_KEY_EQUATIONS: EquationItem[] = [
  // Amount & Gas
  { id: 'ch-idealgas', unit: 'Physical', topic: 'Amount & Gas', title: 'Ideal gas equation', formula: 'pV = nRT', latex: 'pV = nRT', description: 'p in Pa, V in m³, T in K' },
  { id: 'ch-atom-economy', unit: 'Physical', topic: 'Amount & Gas', title: 'Atom economy', formula: 'Atom economy = (molar mass desired / sum of all products) × 100%', latex: '\\text{Atom economy} = \\frac{\\text{molar mass of desired product}}{\\text{sum of molar masses of all products}} \\times 100\\%' },

  // Energetics & Thermodynamics
  { id: 'ch-heat', unit: 'Physical', topic: 'Energetics & Thermodynamics', title: 'Heat energy transfer', formula: 'q = mcΔT', latex: 'q = mc\\Delta T', description: 'm in g, c in J g⁻¹ °C⁻¹' },
  { id: 'ch-entropy-total', unit: 'Physical', topic: 'Energetics & Thermodynamics', title: 'Total entropy change', formula: 'ΔS_total = ΔS_system + ΔS_surroundings', latex: '\\Delta S_{\\text{total}} = \\Delta S_{\\text{system}} + \\Delta S_{\\text{surroundings}}' },
  { id: 'ch-entropy-surr', unit: 'Physical', topic: 'Energetics & Thermodynamics', title: 'Surroundings entropy change', formula: 'ΔS_surroundings = -ΔH / T', latex: '\\Delta S_{\\text{surroundings}} = -\\frac{\\Delta H}{T}' },
  { id: 'ch-equilibrium', unit: 'Physical', topic: 'Energetics & Thermodynamics', title: 'Entropy and equilibrium constant', formula: 'ΔS_total = R ln K', latex: '\\Delta S_{\\text{total}} = R\\ln K' },
  { id: 'ch-gibbs', unit: 'Physical', topic: 'Energetics & Thermodynamics', title: 'Gibbs free energy change', formula: 'ΔG = ΔH - TΔS_system', latex: '\\Delta G = \\Delta H - T\\Delta S_{\\text{system}}' },

  // Kinetics
  { id: 'ch-rate-eq', unit: 'Physical', topic: 'Kinetics', title: 'Rate equation', formula: 'rate = k[A]^m[B]^n', latex: '\\text{rate} = k[\\text{A}]^m[\\text{B}]^n', description: 'm, n = orders of reaction' },
  { id: 'ch-arrhenius-ln', unit: 'Physical', topic: 'Kinetics', title: 'Arrhenius equation (linear form)', formula: 'ln k = -Ea/RT + constant', latex: '\\ln k = -\\frac{E_a}{RT} + \\text{constant}' },

  // Acids & Equilibria
  { id: 'ch-ph-def', unit: 'Physical', topic: 'Acids & Equilibria', title: 'pH definition', formula: 'pH = -log₁₀[H⁺]', latex: '\\text{pH} = -\\log_{10}[\\text{H}^+]' },
  { id: 'ch-h-conc', unit: 'Physical', topic: 'Acids & Equilibria', title: 'Hydrogen ion concentration', formula: '[H⁺] = 10^(-pH)', latex: '[\\text{H}^+] = 10^{-\\text{pH}}' },
  { id: 'ch-kw-def', unit: 'Physical', topic: 'Acids & Equilibria', title: 'Ionic product of water', formula: 'Kw = [H⁺][OH⁻]', latex: 'K_w = [\\text{H}^+][\\text{OH}^-]' },
  { id: 'ch-pka-def', unit: 'Physical', topic: 'Acids & Equilibria', title: 'pKa definition', formula: 'pKa = -log₁₀Ka', latex: '\\text{p}K_a = -\\log_{10} K_a' },

  // Redox
  { id: 'ch-redox-relationships', unit: 'Physical', topic: 'Redox (Topic 16.11)', title: 'Standard cell potential relationships', formula: 'E°_cell ∝ ΔS_total and E°_cell ∝ ln K', latex: 'E^\\ominus_{\\text{cell}} \\propto \\Delta S_{\\text{total}} \\quad\\text{and}\\quad E^\\ominus_{\\text{cell}} \\propto \\ln K' },
];

export const CHEMISTRY_INDICATORS: IndicatorItem[] = [
  { name: 'Thymol blue (acid)', pKin: '1.7', acidColour: 'red', phRange: '1.2–2.8', alkalineColour: 'yellow' },
  { name: 'Screened methyl orange', pKin: '3.7', acidColour: 'purple', phRange: '3.2–4.2', alkalineColour: 'green' },
  { name: 'Methyl orange', pKin: '3.7', acidColour: 'red', phRange: '3.2–4.4', alkalineColour: 'yellow' },
  { name: 'Bromophenol blue', pKin: '4.0', acidColour: 'yellow', phRange: '2.8–4.6', alkalineColour: 'blue' },
  { name: 'Bromocresol green', pKin: '4.7', acidColour: 'yellow', phRange: '3.8–5.4', alkalineColour: 'blue' },
  { name: 'Methyl red', pKin: '5.1', acidColour: 'red', phRange: '4.2–6.3', alkalineColour: 'yellow' },
  { name: 'Litmus', pKin: '—', acidColour: 'red', phRange: '5.0–8.0', alkalineColour: 'blue' },
  { name: 'Bromothymol blue', pKin: '7.0', acidColour: 'yellow', phRange: '6.0–7.6', alkalineColour: 'blue' },
  { name: 'Phenol red', pKin: '7.9', acidColour: 'yellow', phRange: '6.8–8.4', alkalineColour: 'red' },
  { name: 'Phenolphthalein (in ethanol)', pKin: '9.3', acidColour: 'colourless', phRange: '8.2–10.0', alkalineColour: 'red' },
];

export const IR_SPECTROSCOPY_DATA: SpectroscopyItem[] = [
  // C-H stretching vibrations
  { group: 'C–H stretching vibrations', bond: 'C–H stretching', environment: 'Alkane', range: '2962–2853' },
  { group: 'C–H stretching vibrations', bond: 'C–H stretching', environment: 'Alkene', range: '3095–3010' },
  { group: 'C–H stretching vibrations', bond: 'C–H stretching', environment: 'Alkyne', range: '3300' },
  { group: 'C–H stretching vibrations', bond: 'C–H stretching', environment: 'Arene', range: '3030' },
  { group: 'C–H stretching vibrations', bond: 'C–H stretching', environment: 'Aldehyde', range: '2900–2820 and 2775–2700' },

  // C-H bending vibrations
  { group: 'C–H bending vibrations', bond: 'C–H bending', environment: 'Alkane', range: '1485–1365' },
  { group: 'C–H bending vibrations', bond: 'C–H bending', environment: 'Arene (5 adjacent hydrogen atoms)', range: '750 and 700' },
  { group: 'C–H bending vibrations', bond: 'C–H bending', environment: 'Arene (4 adjacent hydrogen atoms)', range: '750' },
  { group: 'C–H bending vibrations', bond: 'C–H bending', environment: 'Arene (3 adjacent hydrogen atoms)', range: '780' },
  { group: 'C–H bending vibrations', bond: 'C–H bending', environment: 'Arene (2 adjacent hydrogen atoms)', range: '830' },
  { group: 'C–H bending vibrations', bond: 'C–H bending', environment: 'Arene (1 isolated hydrogen atom)', range: '880' },

  // N-H stretching vibrations
  { group: 'N–H stretching vibrations', bond: 'N–H stretching', environment: 'Amine', range: '3500–3300' },
  { group: 'N–H stretching vibrations', bond: 'N–H stretching', environment: 'Amide', range: '3500–3140' },

  // O-H stretching vibrations
  { group: 'O–H stretching vibrations', bond: 'O–H stretching', environment: 'Alcohols and phenols', range: '3750–3200' },
  { group: 'O–H stretching vibrations', bond: 'O–H stretching', environment: 'Carboxylic acids', range: '3300–2500' },

  // C=C stretching vibrations
  { group: 'C=C stretching vibrations', bond: 'C=C stretching', environment: 'Isolated alkene', range: '1669–1645' },
  { group: 'C=C stretching vibrations', bond: 'C=C stretching', environment: 'Arene', range: '1600, 1580, 1500, 1450' },

  // C=O stretching vibrations
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Aldehydes, saturated alkyl', range: '1740–1720' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Ketones, alkyl', range: '1720–1700' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Ketones, aryl', range: '1700–1680' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Carboxylic acids, alkyl', range: '1725–1700' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Carboxylic acids, aryl', range: '1700–1680' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Carboxylic acid, anhydrides', range: '1850–1800 and 1790–1740' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Acyl halides, chlorides', range: '1795' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Acyl halides, bromides', range: '1810' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Esters, saturated', range: '1750–1735' },
  { group: 'C=O stretching vibrations', bond: 'C=O stretching', environment: 'Amides', range: '1700–1630' },

  // Triple bond stretching vibrations
  { group: 'Triple bond stretching vibrations', bond: 'Triple bond stretching', environment: 'C≡N', range: '2260–2215' },
  { group: 'Triple bond stretching vibrations', bond: 'Triple bond stretching', environment: 'C≡C', range: '2260–2100' },
];

export const PROTON_NMR_SHIFTS: ChemicalShiftItem[] = [
  { type: '1H', structure: 'H–C–C (alkane)', shiftRange: '0.1–1.7 ppm', minShift: 0.1, maxShift: 1.7, example: 'R₃CH > R₂CH₂ > RCH₃' },
  { type: '1H', structure: 'C–N–H (amine)', shiftRange: '0.6–2.8 ppm', minShift: 0.6, maxShift: 2.8 },
  { type: '1H', structure: 'H–C–C=O (aldehyde, ketone, ester, amide, acid)', shiftRange: '1.8–2.8 ppm', minShift: 1.8, maxShift: 2.8, example: 'propanone = 2.10 ppm' },
  { type: '1H', structure: 'H–C–C=C (alkenes, arenes)', shiftRange: '1.8–2.8 ppm', minShift: 1.8, maxShift: 2.8 },
  { type: '1H', structure: '–O–H (alcohol)', shiftRange: '1.9–3.9 ppm', minShift: 1.9, maxShift: 3.9 },
  { type: '1H', structure: 'H–C–halogen (halogenoalkane)', shiftRange: '1.9–4.2 ppm', minShift: 1.9, maxShift: 4.2, example: 'R₂CHF > R₂CHCl > R₂CHBr > R₂CHI' },
  { type: '1H', structure: 'H–C–N (amine, amide)', shiftRange: '2.5–3.6 ppm', minShift: 2.5, maxShift: 3.6 },
  { type: '1H', structure: 'H–C–O– (alcohol, ether, ester)', shiftRange: '2.9–4.2 ppm', minShift: 2.9, maxShift: 4.2, example: 'CH₃OH = 3.39 ppm' },
  { type: '1H', structure: 'Ar–N–H (phenylamines)', shiftRange: '3.1–4.8 ppm', minShift: 3.1, maxShift: 4.8 },
  { type: '1H', structure: 'Ar–O–H (phenol)', shiftRange: '3.9–7.5 ppm', minShift: 3.9, maxShift: 7.5 },
  { type: '1H', structure: 'H–C=C (alkene)', shiftRange: '4.5–6.3 ppm', minShift: 4.5, maxShift: 6.3, example: 'ethene = 5.28 ppm' },
  { type: '1H', structure: 'CON–H (amide)', shiftRange: '5.1–8.8 ppm', minShift: 5.1, maxShift: 8.8 },
  { type: '1H', structure: 'Ar–H (arene ring)', shiftRange: '6.5–8.3 ppm', minShift: 6.5, maxShift: 8.3, example: 'benzene = 7.27 ppm' },
  { type: '1H', structure: '–C=O(H) (aldehyde)', shiftRange: '9.0–10.0 ppm', minShift: 9.0, maxShift: 10.0 },
  { type: '1H', structure: 'COO–H (carboxylic acid)', shiftRange: '10.0–12.1 ppm', minShift: 10.0, maxShift: 12.1 },
];

export const CARBON_NMR_SHIFTS: ChemicalShiftItem[] = [
  { type: '13C', structure: 'C–C (alkane)', shiftRange: '5–56 ppm', minShift: 5, maxShift: 56 },
  { type: '13C', structure: 'C–Cl, C–Br (halogenoalkane)', shiftRange: '31–72 ppm', minShift: 31, maxShift: 72 },
  { type: '13C', structure: 'C–N (amine)', shiftRange: '36–61 ppm', minShift: 36, maxShift: 61 },
  { type: '13C', structure: 'C–OH (alcohol)', shiftRange: '56–72 ppm', minShift: 56, maxShift: 72 },
  { type: '13C', structure: 'C=C (alkene)', shiftRange: '117–142 ppm', minShift: 117, maxShift: 142 },
  { type: '13C', structure: 'C–C (Arene)', shiftRange: '108–162 ppm', minShift: 108, maxShift: 162 },
  { type: '13C', structure: '–CO–O (ester / acid) & –CO–N (amide)', shiftRange: '165–184 ppm', minShift: 165, maxShift: 184 },
  { type: '13C', structure: 'C–CO–C (ketone) & C–CO–H (aldehyde)', shiftRange: '194–222 ppm', minShift: 194, maxShift: 222 },
];

export const ELECTRODE_POTENTIALS: ElectrodePotentialItem[] = [
  { id: 1, equation: 'Na⁺ + e⁻ ⇌ Na', latex: '\\text{Na}^+ + \\text{e}^- \\rightleftharpoons \\text{Na}', potential: '-2.71', numericValue: -2.71 },
  { id: 2, equation: 'Mg²⁺ + 2e⁻ ⇌ Mg', latex: '\\text{Mg}^{2+} + 2\\text{e}^- \\rightleftharpoons \\text{Mg}', potential: '-2.37', numericValue: -2.37 },
  { id: 3, equation: 'Al³⁺ + 3e⁻ ⇌ Al', latex: '\\text{Al}^{3+} + 3\\text{e}^- \\rightleftharpoons \\text{Al}', potential: '-1.66', numericValue: -1.66 },
  { id: 4, equation: 'V²⁺ + 2e⁻ ⇌ V', latex: '\\text{V}^{2+} + 2\\text{e}^- \\rightleftharpoons \\text{V}', potential: '-1.18', numericValue: -1.18 },
  { id: 5, equation: 'Zn²⁺ + 2e⁻ ⇌ Zn', latex: '\\text{Zn}^{2+} + 2\\text{e}^- \\rightleftharpoons \\text{Zn}', potential: '-0.76', numericValue: -0.76 },
  { id: 6, equation: 'Cr³⁺ + 3e⁻ ⇌ Cr', latex: '\\text{Cr}^{3+} + 3\\text{e}^- \\rightleftharpoons \\text{Cr}', potential: '-0.74', numericValue: -0.74 },
  { id: 7, equation: 'Fe²⁺ + 2e⁻ ⇌ Fe', latex: '\\text{Fe}^{2+} + 2\\text{e}^- \\rightleftharpoons \\text{Fe}', potential: '-0.44', numericValue: -0.44 },
  { id: 8, equation: 'Cr³⁺ + e⁻ ⇌ Cr²⁺', latex: '\\text{Cr}^{3+} + \\text{e}^- \\rightleftharpoons \\text{Cr}^{2+}', potential: '-0.41', numericValue: -0.41 },
  { id: 9, equation: 'V³⁺ + e⁻ ⇌ V²⁺', latex: '\\text{V}^{3+} + \\text{e}^- \\rightleftharpoons \\text{V}^{2+}', potential: '-0.26', numericValue: -0.26 },
  { id: 10, equation: 'Ni²⁺ + 2e⁻ ⇌ Ni', latex: '\\text{Ni}^{2+} + 2\\text{e}^- \\rightleftharpoons \\text{Ni}', potential: '-0.25', numericValue: -0.25 },
  { id: 11, equation: 'H⁺ + e⁻ ⇌ 1/2 H₂', latex: '\\text{H}^+ + \\text{e}^- \\rightleftharpoons \\tfrac{1}{2}\\text{H}_2', potential: '0.00', numericValue: 0.00 },
  { id: 12, equation: 'S₄O₆²⁻ + 2e⁻ ⇌ 2S₂O₃²⁻', latex: '\\text{S}_4\\text{O}_6^{2-} + 2\\text{e}^- \\rightleftharpoons 2\\text{S}_2\\text{O}_3^{2-}', potential: '+0.09', numericValue: 0.09 },
  { id: 13, equation: 'Cu²⁺ + e⁻ ⇌ Cu⁺', latex: '\\text{Cu}^{2+} + \\text{e}^- \\rightleftharpoons \\text{Cu}^+', potential: '+0.15', numericValue: 0.15 },
  { id: 14, equation: 'Cu²⁺ + 2e⁻ ⇌ Cu', latex: '\\text{Cu}^{2+} + 2\\text{e}^- \\rightleftharpoons \\text{Cu}', potential: '+0.34', numericValue: 0.34 },
  { id: 15, equation: 'VO²⁺ + 2H⁺ + e⁻ ⇌ V³⁺ + H₂O', latex: '\\text{VO}^{2+} + 2\\text{H}^+ + \\text{e}^- \\rightleftharpoons \\text{V}^{3+} + \\text{H}_2\\text{O}', potential: '+0.34', numericValue: 0.34 },
  { id: 16, equation: 'O₂ + 2H₂O + 4e⁻ ⇌ 4OH⁻', latex: '\\text{O}_2 + 2\\text{H}_2\\text{O} + 4\\text{e}^- \\rightleftharpoons 4\\text{OH}^-', potential: '+0.40', numericValue: 0.40 },
  { id: 17, equation: 'S₂O₃²⁻ + 6H⁺ + 4e⁻ ⇌ 2S + 3H₂O', latex: '\\text{S}_2\\text{O}_3^{2-} + 6\\text{H}^+ + 4\\text{e}^- \\rightleftharpoons 2\\text{S} + 3\\text{H}_2\\text{O}', potential: '+0.47', numericValue: 0.47 },
  { id: 18, equation: 'Cu⁺ + e⁻ ⇌ Cu', latex: '\\text{Cu}^+ + \\text{e}^- \\rightleftharpoons \\text{Cu}', potential: '+0.52', numericValue: 0.52 },
  { id: 19, equation: 'I₂ + 2e⁻ ⇌ 2I⁻', latex: '\\text{I}_2 + 2\\text{e}^- \\rightleftharpoons 2\\text{I}^-', potential: '+0.54', numericValue: 0.54 },
  { id: 20, equation: 'O₂ + 2H⁺ + 2e⁻ ⇌ H₂O₂', latex: '\\text{O}_2 + 2\\text{H}^+ + 2\\text{e}^- \\rightleftharpoons \\text{H}_2\\text{O}_2', potential: '+0.68', numericValue: 0.68 },
  { id: 21, equation: 'Fe³⁺ + e⁻ ⇌ Fe²⁺', latex: '\\text{Fe}^{3+} + \\text{e}^- \\rightleftharpoons \\text{Fe}^{2+}', potential: '+0.77', numericValue: 0.77 },
  { id: 22, equation: 'Ag⁺ + e⁻ ⇌ Ag', latex: '\\text{Ag}^+ + \\text{e}^- \\rightleftharpoons \\text{Ag}', potential: '+0.80', numericValue: 0.80 },
  { id: 23, equation: 'NO₃⁻ + 2H⁺ + e⁻ ⇌ NO₂ + H₂O', latex: '\\text{NO}_3^- + 2\\text{H}^+ + \\text{e}^- \\rightleftharpoons \\text{NO}_2 + \\text{H}_2\\text{O}', potential: '+0.80', numericValue: 0.80 },
  { id: 24, equation: 'ClO⁻ + H₂O + 2e⁻ ⇌ Cl⁻ + 2OH⁻', latex: '\\text{ClO}^- + \\text{H}_2\\text{O} + 2\\text{e}^- \\rightleftharpoons \\text{Cl}^- + 2\\text{OH}^-', potential: '+0.89', numericValue: 0.89 },
  { id: 25, equation: 'VO₂⁺ + 2H⁺ + e⁻ ⇌ VO²⁺ + H₂O', latex: '\\text{VO}_2^+ + 2\\text{H}^+ + \\text{e}^- \\rightleftharpoons \\text{VO}^{2+} + \\text{H}_2\\text{O}', potential: '+1.00', numericValue: 1.00 },
  { id: 26, equation: 'Br₂ + 2e⁻ ⇌ 2Br⁻', latex: '\\text{Br}_2 + 2\\text{e}^- \\rightleftharpoons 2\\text{Br}^-', potential: '+1.09', numericValue: 1.09 },
  { id: 27, equation: 'O₂ + 4H⁺ + 4e⁻ ⇌ 2H₂O', latex: '\\text{O}_2 + 4\\text{H}^+ + 4\\text{e}^- \\rightleftharpoons 2\\text{H}_2\\text{O}', potential: '+1.23', numericValue: 1.23 },
  { id: 28, equation: 'Cr₂O₇²⁻ + 14H⁺ + 6e⁻ ⇌ 2Cr³⁺ + 7H₂O', latex: '\\text{Cr}_2\\text{O}_7^{2-} + 14\\text{H}^+ + 6\\text{e}^- \\rightleftharpoons 2\\text{Cr}^{3+} + 7\\text{H}_2\\text{O}', potential: '+1.33', numericValue: 1.33 },
  { id: 29, equation: 'Cl₂ + 2e⁻ ⇌ 2Cl⁻', latex: '\\text{Cl}_2 + 2\\text{e}^- \\rightleftharpoons 2\\text{Cl}^-', potential: '+1.36', numericValue: 1.36 },
  { id: 30, equation: 'MnO₄⁻ + 8H⁺ + 5e⁻ ⇌ Mn²⁺ + 4H₂O', latex: '\\text{MnO}_4^- + 8\\text{H}^+ + 5\\text{e}^- \\rightleftharpoons \\text{Mn}^{2+} + 4\\text{H}_2\\text{O}', potential: '+1.51', numericValue: 1.51 },
  { id: 31, equation: 'H₂O₂ + 2H⁺ + 2e⁻ ⇌ 2H₂O', latex: '\\text{H}_2\\text{O}_2 + 2\\text{H}^+ + 2\\text{e}^- \\rightleftharpoons 2\\text{H}_2\\text{O}', potential: '+1.77', numericValue: 1.77 },
];

export const PERIODIC_ELEMENTS: PeriodicElement[] = [
  // Period 1
  { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicMass: '1.0', electronegativity: 2.1, period: 1, group: 1, category: 'nonmetal' },
  { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicMass: '4.0', period: 1, group: 18, category: 'noble-gas' },

  // Period 2
  { atomicNumber: 3, symbol: 'Li', name: 'Lithium', atomicMass: '6.9', electronegativity: 1.0, period: 2, group: 1, category: 'alkali' },
  { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', atomicMass: '9.0', electronegativity: 1.5, period: 2, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 5, symbol: 'B', name: 'Boron', atomicMass: '10.8', electronegativity: 2.0, period: 2, group: 13, category: 'metalloid' },
  { atomicNumber: 6, symbol: 'C', name: 'Carbon', atomicMass: '12.0', electronegativity: 2.5, period: 2, group: 14, category: 'nonmetal' },
  { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', atomicMass: '14.0', electronegativity: 3.0, period: 2, group: 15, category: 'nonmetal' },
  { atomicNumber: 8, symbol: 'O', name: 'Oxygen', atomicMass: '16.0', electronegativity: 3.5, period: 2, group: 16, category: 'nonmetal' },
  { atomicNumber: 9, symbol: 'F', name: 'Fluorine', atomicMass: '19.0', electronegativity: 4.0, period: 2, group: 17, category: 'halogen' },
  { atomicNumber: 10, symbol: 'Ne', name: 'Neon', atomicMass: '20.2', period: 2, group: 18, category: 'noble-gas' },

  // Period 3
  { atomicNumber: 11, symbol: 'Na', name: 'Sodium', atomicMass: '23.0', electronegativity: 0.9, period: 3, group: 1, category: 'alkali' },
  { atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', atomicMass: '24.3', electronegativity: 1.2, period: 3, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 13, symbol: 'Al', name: 'Aluminium', atomicMass: '27.0', electronegativity: 1.5, period: 3, group: 13, category: 'post-transition' },
  { atomicNumber: 14, symbol: 'Si', name: 'Silicon', atomicMass: '28.1', electronegativity: 1.9, period: 3, group: 14, category: 'metalloid' },
  { atomicNumber: 15, symbol: 'P', name: 'Phosphorus', atomicMass: '31.0', electronegativity: 2.1, period: 3, group: 15, category: 'nonmetal' },
  { atomicNumber: 16, symbol: 'S', name: 'Sulfur', atomicMass: '32.1', electronegativity: 2.5, period: 3, group: 16, category: 'nonmetal' },
  { atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', atomicMass: '35.5', electronegativity: 3.0, period: 3, group: 17, category: 'halogen' },
  { atomicNumber: 18, symbol: 'Ar', name: 'Argon', atomicMass: '39.9', period: 3, group: 18, category: 'noble-gas' },

  // Period 4
  { atomicNumber: 19, symbol: 'K', name: 'Potassium', atomicMass: '39.1', electronegativity: 0.8, period: 4, group: 1, category: 'alkali' },
  { atomicNumber: 20, symbol: 'Ca', name: 'Calcium', atomicMass: '40.1', electronegativity: 1.0, period: 4, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 21, symbol: 'Sc', name: 'Scandium', atomicMass: '45.0', electronegativity: 1.3, period: 4, group: 3, category: 'transition' },
  { atomicNumber: 22, symbol: 'Ti', name: 'Titanium', atomicMass: '47.9', electronegativity: 1.5, period: 4, group: 4, category: 'transition' },
  { atomicNumber: 23, symbol: 'V', name: 'Vanadium', atomicMass: '50.9', electronegativity: 1.6, period: 4, group: 5, category: 'transition' },
  { atomicNumber: 24, symbol: 'Cr', name: 'Chromium', atomicMass: '52.0', electronegativity: 1.6, period: 4, group: 6, category: 'transition' },
  { atomicNumber: 25, symbol: 'Mn', name: 'Manganese', atomicMass: '54.9', electronegativity: 1.5, period: 4, group: 7, category: 'transition' },
  { atomicNumber: 26, symbol: 'Fe', name: 'Iron', atomicMass: '55.8', electronegativity: 1.8, period: 4, group: 8, category: 'transition' },
  { atomicNumber: 27, symbol: 'Co', name: 'Cobalt', atomicMass: '58.9', electronegativity: 1.8, period: 4, group: 9, category: 'transition' },
  { atomicNumber: 28, symbol: 'Ni', name: 'Nickel', atomicMass: '58.7', electronegativity: 1.8, period: 4, group: 10, category: 'transition' },
  { atomicNumber: 29, symbol: 'Cu', name: 'Copper', atomicMass: '63.5', electronegativity: 1.9, period: 4, group: 11, category: 'transition' },
  { atomicNumber: 30, symbol: 'Zn', name: 'Zinc', atomicMass: '65.4', electronegativity: 1.6, period: 4, group: 12, category: 'transition' },
  { atomicNumber: 31, symbol: 'Ga', name: 'Gallium', atomicMass: '69.7', electronegativity: 1.6, period: 4, group: 13, category: 'post-transition' },
  { atomicNumber: 32, symbol: 'Ge', name: 'Germanium', atomicMass: '72.6', electronegativity: 2.0, period: 4, group: 14, category: 'metalloid' },
  { atomicNumber: 33, symbol: 'As', name: 'Arsenic', atomicMass: '74.9', electronegativity: 2.0, period: 4, group: 15, category: 'metalloid' },
  { atomicNumber: 34, symbol: 'Se', name: 'Selenium', atomicMass: '79.0', electronegativity: 2.4, period: 4, group: 16, category: 'nonmetal' },
  { atomicNumber: 35, symbol: 'Br', name: 'Bromine', atomicMass: '79.9', electronegativity: 2.8, period: 4, group: 17, category: 'halogen' },
  { atomicNumber: 36, symbol: 'Kr', name: 'Krypton', atomicMass: '83.8', period: 4, group: 18, category: 'noble-gas' },

  // Period 5
  { atomicNumber: 37, symbol: 'Rb', name: 'Rubidium', atomicMass: '85.5', electronegativity: 0.8, period: 5, group: 1, category: 'alkali' },
  { atomicNumber: 38, symbol: 'Sr', name: 'Strontium', atomicMass: '87.6', electronegativity: 1.0, period: 5, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 39, symbol: 'Y', name: 'Yttrium', atomicMass: '88.9', electronegativity: 1.2, period: 5, group: 3, category: 'transition' },
  { atomicNumber: 40, symbol: 'Zr', name: 'Zirconium', atomicMass: '91.2', electronegativity: 1.3, period: 5, group: 4, category: 'transition' },
  { atomicNumber: 41, symbol: 'Nb', name: 'Niobium', atomicMass: '92.9', electronegativity: 1.6, period: 5, group: 5, category: 'transition' },
  { atomicNumber: 42, symbol: 'Mo', name: 'Molybdenum', atomicMass: '95.9', electronegativity: 2.1, period: 5, group: 6, category: 'transition' },
  { atomicNumber: 43, symbol: 'Tc', name: 'Technetium', atomicMass: '[98]', electronegativity: 1.9, period: 5, group: 7, category: 'transition' },
  { atomicNumber: 44, symbol: 'Ru', name: 'Ruthenium', atomicMass: '101.1', electronegativity: 2.2, period: 5, group: 8, category: 'transition' },
  { atomicNumber: 45, symbol: 'Rh', name: 'Rhodium', atomicMass: '102.9', electronegativity: 2.2, period: 5, group: 9, category: 'transition' },
  { atomicNumber: 46, symbol: 'Pd', name: 'Palladium', atomicMass: '106.4', electronegativity: 2.2, period: 5, group: 10, category: 'transition' },
  { atomicNumber: 47, symbol: 'Ag', name: 'Silver', atomicMass: '107.9', electronegativity: 1.9, period: 5, group: 11, category: 'transition' },
  { atomicNumber: 48, symbol: 'Cd', name: 'Cadmium', atomicMass: '112.4', electronegativity: 1.6, period: 5, group: 12, category: 'transition' },
  { atomicNumber: 49, symbol: 'In', name: 'Indium', atomicMass: '114.8', electronegativity: 1.7, period: 5, group: 13, category: 'post-transition' },
  { atomicNumber: 50, symbol: 'Sn', name: 'Tin', atomicMass: '118.7', electronegativity: 1.9, period: 5, group: 14, category: 'post-transition' },
  { atomicNumber: 51, symbol: 'Sb', name: 'Antimony', atomicMass: '121.8', electronegativity: 1.9, period: 5, group: 15, category: 'metalloid' },
  { atomicNumber: 52, symbol: 'Te', name: 'Tellurium', atomicMass: '127.6', electronegativity: 2.1, period: 5, group: 16, category: 'metalloid' },
  { atomicNumber: 53, symbol: 'I', name: 'Iodine', atomicMass: '126.9', electronegativity: 2.5, period: 5, group: 17, category: 'halogen' },
  { atomicNumber: 54, symbol: 'Xe', name: 'Xenon', atomicMass: '131.3', period: 5, group: 18, category: 'noble-gas' },

  // Period 6
  { atomicNumber: 55, symbol: 'Cs', name: 'Caesium', atomicMass: '132.9', electronegativity: 0.7, period: 6, group: 1, category: 'alkali' },
  { atomicNumber: 56, symbol: 'Ba', name: 'Barium', atomicMass: '137.3', electronegativity: 0.9, period: 6, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 57, symbol: 'La', name: 'Lanthanum', atomicMass: '138.9', electronegativity: 1.1, period: 6, group: 3, category: 'lanthanide' },
  { atomicNumber: 72, symbol: 'Hf', name: 'Hafnium', atomicMass: '178.5', electronegativity: 1.3, period: 6, group: 4, category: 'transition' },
  { atomicNumber: 73, symbol: 'Ta', name: 'Tantalum', atomicMass: '180.9', electronegativity: 1.5, period: 6, group: 5, category: 'transition' },
  { atomicNumber: 74, symbol: 'W', name: 'Tungsten', atomicMass: '183.8', electronegativity: 2.3, period: 6, group: 6, category: 'transition' },
  { atomicNumber: 75, symbol: 'Re', name: 'Rhenium', atomicMass: '186.2', electronegativity: 1.9, period: 6, group: 7, category: 'transition' },
  { atomicNumber: 76, symbol: 'Os', name: 'Osmium', atomicMass: '190.2', electronegativity: 2.2, period: 6, group: 8, category: 'transition' },
  { atomicNumber: 77, symbol: 'Ir', name: 'Iridium', atomicMass: '192.2', electronegativity: 2.2, period: 6, group: 9, category: 'transition' },
  { atomicNumber: 78, symbol: 'Pt', name: 'Platinum', atomicMass: '195.1', electronegativity: 2.2, period: 6, group: 10, category: 'transition' },
  { atomicNumber: 79, symbol: 'Au', name: 'Gold', atomicMass: '197.0', electronegativity: 2.5, period: 6, group: 11, category: 'transition' },
  { atomicNumber: 80, symbol: 'Hg', name: 'Mercury', atomicMass: '200.6', electronegativity: 2.0, period: 6, group: 12, category: 'transition' },
  { atomicNumber: 81, symbol: 'Tl', name: 'Thallium', atomicMass: '204.4', electronegativity: 1.6, period: 6, group: 13, category: 'post-transition' },
  { atomicNumber: 82, symbol: 'Pb', name: 'Lead', atomicMass: '207.2', electronegativity: 1.8, period: 6, group: 14, category: 'post-transition' },
  { atomicNumber: 83, symbol: 'Bi', name: 'Bismuth', atomicMass: '209.0', electronegativity: 1.9, period: 6, group: 15, category: 'post-transition' },
  { atomicNumber: 84, symbol: 'Po', name: 'Polonium', atomicMass: '[209]', electronegativity: 2.0, period: 6, group: 16, category: 'metalloid' },
  { atomicNumber: 85, symbol: 'At', name: 'Astatine', atomicMass: '[210]', electronegativity: 2.2, period: 6, group: 17, category: 'halogen' },
  { atomicNumber: 86, symbol: 'Rn', name: 'Radon', atomicMass: '[222]', period: 6, group: 18, category: 'noble-gas' },
];

// =============================================================================
// OFFICIAL IAL MATHEMATICS FORMULAE & STATISTICAL TABLES
// =============================================================================

export interface MathFormulaItem {
  id: string;
  section: string; // 'Pure Mathematics' | 'Mechanics' | 'Statistics'
  category: string;
  title: string;
  latex: string;
  description?: string;
  inBooklet: boolean;
  unit: 'P1' | 'P2' | 'P3' | 'P4' | 'M1' | 'S1';
}

export interface NormalDistributionPoint {
  p: string;
  z: string;
}

export interface NormalTablePair {
  z: string;
  phi: string;
}

export interface NormalTableRow5Col {
  c1: NormalTablePair;
  c2: NormalTablePair;
  c3: NormalTablePair;
  c4: NormalTablePair;
  c5: NormalTablePair;
}

export const PURE_MATH_FORMULAE: MathFormulaItem[] = [
  // Mensuration
  { id: 'pm-surf-sphere', section: 'Pure Mathematics', category: 'Mensuration', title: 'Surface area of sphere', latex: String.raw`A = 4\pi r^2`, inBooklet: true, unit: 'P1' },
  { id: 'pm-vol-sphere', section: 'Pure Mathematics', category: 'Mensuration', title: 'Volume of sphere', latex: String.raw`V = \frac{4}{3}\pi r^3`, inBooklet: false, unit: 'P1' },
  { id: 'pm-cone-area', section: 'Pure Mathematics', category: 'Mensuration', title: 'Curved surface area of cone', latex: String.raw`A = \pi r l`, description: 'l = slant height', inBooklet: true, unit: 'P1' },
  { id: 'pm-sector-area', section: 'Pure Mathematics', category: 'Mensuration', title: 'Area of sector', latex: String.raw`A = \frac{1}{2}r^2\theta`, description: 'θ in radians', inBooklet: false, unit: 'P1' },
  { id: 'pm-arc-length', section: 'Pure Mathematics', category: 'Mensuration', title: 'Arc length', latex: String.raw`s = r\theta`, description: 'θ in radians', inBooklet: false, unit: 'P1' },

  // Algebra & Coordinate Geometry (P1 & P2)
  { id: 'p1-quad-form', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Quadratic formula', latex: String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`, inBooklet: false, unit: 'P1' },
  { id: 'p1-discrim', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Discriminant nature of roots', latex: String.raw`\Delta = b^2 - 4ac > 0\text{ (2 real)},\; = 0\text{ (repeated)},\; < 0\text{ (no real)}`, inBooklet: false, unit: 'P1' },
  { id: 'p1-line-grad', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Gradient of a straight line', latex: String.raw`m = \frac{y_2 - y_1}{x_2 - x_1}`, inBooklet: false, unit: 'P1' },
  { id: 'p1-line-eq', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Equation of a straight line', latex: String.raw`y - y_1 = m(x - x_1)`, inBooklet: false, unit: 'P1' },
  { id: 'p1-perp-grad', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Perpendicular gradients', latex: String.raw`m_1 m_2 = -1 \iff m_2 = -\frac{1}{m_1}`, inBooklet: false, unit: 'P1' },
  { id: 'p1-dist', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Distance between two points', latex: String.raw`d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}`, inBooklet: false, unit: 'P1' },
  { id: 'p1-midpoint', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Midpoint of line segment', latex: String.raw`M = \left(\frac{x_1 + x_2}{2},\; \frac{y_1 + y_2}{2}\right)`, inBooklet: false, unit: 'P1' },
  { id: 'p2-circle-eq', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Equation of a circle', latex: String.raw`(x - a)^2 + (y - b)^2 = r^2`, description: 'centre (a, b), radius r', inBooklet: false, unit: 'P2' },
  { id: 'p2-factor-thm', section: 'Pure Mathematics', category: 'Algebra & Coordinate Geometry', title: 'Factor theorem', latex: String.raw`f(a) = 0 \iff (x - a)\text{ is a factor of }f(x)`, inBooklet: false, unit: 'P2' },

  // Trigonometric Identities & Rules
  { id: 'p1-sine-rule', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Sine rule', latex: String.raw`\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}`, inBooklet: false, unit: 'P1' },
  { id: 'p1-cosine-rule', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Cosine rule', latex: String.raw`a^2 = b^2 + c^2 - 2bc\cos A`, inBooklet: true, unit: 'P1' },
  { id: 'p1-area-tri', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Area of a triangle', latex: String.raw`\text{Area} = \frac{1}{2}ab\sin C`, inBooklet: false, unit: 'P1' },
  { id: 'p2-trig-pythag', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Pythagorean trig identity', latex: String.raw`\sin^2\theta + \cos^2\theta = 1,\quad \tan\theta = \frac{\sin\theta}{\cos\theta}`, inBooklet: false, unit: 'P2' },
  { id: 'p3-trig-recip', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Reciprocal trig definitions', latex: String.raw`\sec\theta = \frac{1}{\cos\theta},\quad \operatorname{cosec}\theta = \frac{1}{\sin\theta},\quad \cot\theta = \frac{1}{\tan\theta}`, inBooklet: false, unit: 'P3' },
  { id: 'p3-trig-pythag-vars', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Pythagorean identities (sec & cosec)', latex: String.raw`1 + \tan^2\theta = \sec^2\theta,\quad 1 + \cot^2\theta = \operatorname{cosec}^2\theta`, inBooklet: false, unit: 'P3' },
  { id: 'pm-trig-sin-add', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Sine addition / subtraction', latex: String.raw`\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B`, inBooklet: true, unit: 'P3' },
  { id: 'pm-trig-cos-add', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Cosine addition / subtraction', latex: String.raw`\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B`, inBooklet: true, unit: 'P3' },
  { id: 'pm-trig-tan-add', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Tangent addition / subtraction', latex: String.raw`\tan(A \pm B) = \frac{\tan A \pm \tan B}{1 \mp \tan A\tan B}`, inBooklet: true, unit: 'P3' },
  { id: 'pm-trig-factor-sin-add', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Factor formula: sin A + sin B', latex: String.raw`\sin A + \sin B = 2\sin\frac{A+B}{2}\cos\frac{A-B}{2}`, inBooklet: true, unit: 'P3' },
  { id: 'pm-trig-factor-sin-sub', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Factor formula: sin A - sin B', latex: String.raw`\sin A - \sin B = 2\cos\frac{A+B}{2}\sin\frac{A-B}{2}`, inBooklet: true, unit: 'P3' },
  { id: 'pm-trig-factor-cos-add', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Factor formula: cos A + cos B', latex: String.raw`\cos A + \cos B = 2\cos\frac{A+B}{2}\cos\frac{A-B}{2}`, inBooklet: true, unit: 'P3' },
  { id: 'pm-trig-factor-cos-sub', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Factor formula: cos A - cos B', latex: String.raw`\cos A - \cos B = -2\sin\frac{A+B}{2}\sin\frac{A-B}{2}`, inBooklet: true, unit: 'P3' },
  { id: 'pm-trig-sin2a', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Double angle: sin 2A', latex: String.raw`\sin 2A = 2\sin A\cos A`, inBooklet: false, unit: 'P3' },
  { id: 'pm-trig-cos2a', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Double angle: cos 2A', latex: String.raw`\cos 2A = \cos^2 A - \sin^2 A = 2\cos^2 A - 1 = 1 - 2\sin^2 A`, inBooklet: false, unit: 'P3' },
  { id: 'pm-trig-tan2a', section: 'Pure Mathematics', category: 'Trigonometry', title: 'Double angle: tan 2A', latex: String.raw`\tan 2A = \frac{2\tan A}{1 - \tan^2 A}`, inBooklet: false, unit: 'P3' },

  // Sequences & Series
  { id: 'pm-ap-nth', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Arithmetic sequence nth term', latex: String.raw`u_n = a + (n - 1)d`, inBooklet: true, unit: 'P2' },
  { id: 'pm-ap-sum', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Arithmetic series sum', latex: String.raw`S_n = \frac{n}{2}(2a + (n - 1)d) = \frac{n}{2}(a + l)`, inBooklet: true, unit: 'P2' },
  { id: 'pm-gp-nth', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Geometric sequence nth term', latex: String.raw`u_n = ar^{n-1}`, inBooklet: true, unit: 'P2' },
  { id: 'pm-gp-sum', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Geometric series sum', latex: String.raw`S_n = \frac{a(1 - r^n)}{1 - r}`, description: 'r ≠ 1', inBooklet: true, unit: 'P2' },
  { id: 'pm-gp-inf', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Geometric sum to infinity', latex: String.raw`S_\infty = \frac{a}{1 - r}`, description: '|r| < 1', inBooklet: true, unit: 'P2' },
  { id: 'pm-binom-nat', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Binomial series (natural n)', latex: String.raw`(a + b)^n = a^n + \binom{n}{1}a^{n-1}b + \binom{n}{2}a^{n-2}b^2 + \dots + \binom{n}{r}a^{n-r}b^r + \dots + b^n`, description: 'where (n r) = n! / (r!(n - r)!), n ∈ ℕ', inBooklet: true, unit: 'P2' },
  { id: 'pm-binom-1', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Binomial series (rational n)', latex: String.raw`(1 + x)^n = 1 + nx + \frac{n(n - 1)}{2!}x^2 + \dots + \frac{n(n - 1)\dots(n - r + 1)}{r!}x^r + \dots`, description: '|x| < 1, n ∈ ℚ', inBooklet: true, unit: 'P4' },
  { id: 'pm-binom-2', section: 'Pure Mathematics', category: 'Sequences & Series', title: 'Binomial expansion: (a + bx)^n', latex: String.raw`(a + bx)^n = a^n\left(1 + \frac{b}{a}x\right)^n`, description: '|bx/a| < 1', inBooklet: false, unit: 'P4' },

  // Logarithms & Exponentials
  { id: 'pm-log-laws', section: 'Pure Mathematics', category: 'Logarithms & Exponentials', title: 'Laws of logarithms', latex: String.raw`\log(xy) = \log x + \log y,\quad \log(x/y) = \log x - \log y,\quad \log(x^k) = k\log x`, inBooklet: false, unit: 'P2' },
  { id: 'pm-log-base', section: 'Pure Mathematics', category: 'Logarithms & Exponentials', title: 'Change of base formula', latex: String.raw`\log_a x = \frac{\log_b x}{\log_b a}`, inBooklet: true, unit: 'P2' },
  { id: 'pm-exp-identity', section: 'Pure Mathematics', category: 'Logarithms & Exponentials', title: 'Exponential function identity', latex: String.raw`\mathrm{e}^{x\ln a} = a^x`, inBooklet: true, unit: 'P3' },

  // Differentiation
  { id: 'p1-diff-power', section: 'Pure Mathematics', category: 'Differentiation', title: 'Derivative of x^n', latex: String.raw`\frac{d}{dx}(x^n) = nx^{n-1}`, inBooklet: false, unit: 'P1' },
  { id: 'pm-diff-tan', section: 'Pure Mathematics', category: 'Differentiation', title: 'Derivative of tan kx', latex: String.raw`\frac{d}{dx}(\tan kx) = k\sec^2 kx`, inBooklet: true, unit: 'P3' },
  { id: 'pm-diff-sec', section: 'Pure Mathematics', category: 'Differentiation', title: 'Derivative of sec kx', latex: String.raw`\frac{d}{dx}(\sec kx) = k\sec kx\tan kx`, inBooklet: true, unit: 'P3' },
  { id: 'pm-diff-cot', section: 'Pure Mathematics', category: 'Differentiation', title: 'Derivative of cot kx', latex: String.raw`\frac{d}{dx}(\cot kx) = -k\operatorname{cosec}^2 kx`, inBooklet: true, unit: 'P3' },
  { id: 'pm-diff-cosec', section: 'Pure Mathematics', category: 'Differentiation', title: 'Derivative of cosec kx', latex: String.raw`\frac{d}{dx}(\operatorname{cosec} kx) = -k\operatorname{cosec} kx\cot kx`, inBooklet: true, unit: 'P3' },
  { id: 'pm-diff-exp', section: 'Pure Mathematics', category: 'Differentiation', title: 'Derivative of e^(kx)', latex: String.raw`\frac{d}{dx}(e^{kx}) = ke^{kx}`, inBooklet: false, unit: 'P3' },
  { id: 'pm-diff-ln', section: 'Pure Mathematics', category: 'Differentiation', title: 'Derivative of ln x', latex: String.raw`\frac{d}{dx}(\ln x) = \frac{1}{x}`, inBooklet: false, unit: 'P3' },
  { id: 'pm-diff-prod', section: 'Pure Mathematics', category: 'Differentiation', title: 'Product rule', latex: String.raw`\frac{d}{dx}(uv) = u\frac{dv}{dx} + v\frac{du}{dx}`, inBooklet: false, unit: 'P3' },
  { id: 'pm-diff-quot', section: 'Pure Mathematics', category: 'Differentiation', title: 'Quotient rule', latex: String.raw`\frac{d}{dx}\left(\frac{u}{v}\right) = \frac{v\frac{du}{dx} - u\frac{dv}{dx}}{v^2}`, inBooklet: true, unit: 'P3' },
  { id: 'pm-diff-chain', section: 'Pure Mathematics', category: 'Differentiation', title: 'Chain rule', latex: String.raw`\frac{dy}{dx} = \frac{dy}{du}\frac{du}{dx}`, inBooklet: false, unit: 'P3' },
  { id: 'pm-diff-param', section: 'Pure Mathematics', category: 'Differentiation', title: 'Parametric differentiation', latex: String.raw`\frac{dy}{dx} = \frac{dy/dt}{dx/dt}`, inBooklet: false, unit: 'P4' },

  // Integration
  { id: 'p1-int-power', section: 'Pure Mathematics', category: 'Integration', title: 'Integral of x^n', latex: String.raw`\int x^n\,dx = \frac{x^{n+1}}{n+1} + c,\quad n \neq -1`, inBooklet: false, unit: 'P1' },
  { id: 'pm-int-oneoverx', section: 'Pure Mathematics', category: 'Integration', title: 'Integral of 1/x', latex: String.raw`\int \frac{1}{x}\,dx = \ln|x| + c`, inBooklet: false, unit: 'P3' },
  { id: 'pm-int-sec2', section: 'Pure Mathematics', category: 'Integration', title: 'Integral of sec^2 kx', latex: String.raw`\int \sec^2 kx\,dx = \frac{1}{k}\tan kx + c`, inBooklet: true, unit: 'P3' },
  { id: 'pm-int-tan', section: 'Pure Mathematics', category: 'Integration', title: 'Integral of tan x', latex: String.raw`\int \tan x\,dx = \ln|\sec x| + c`, inBooklet: true, unit: 'P3' },
  { id: 'pm-int-sec', section: 'Pure Mathematics', category: 'Integration', title: 'Integral of sec x', latex: String.raw`\int \sec x\,dx = \ln|\sec x + \tan x| + c`, inBooklet: true, unit: 'P4' },
  { id: 'pm-int-cot', section: 'Pure Mathematics', category: 'Integration', title: 'Integral of cot x', latex: String.raw`\int \cot x\,dx = \ln|\sin x| + c`, inBooklet: true, unit: 'P3' },
  { id: 'pm-int-cosec', section: 'Pure Mathematics', category: 'Integration', title: 'Integral of cosec x', latex: String.raw`\int \operatorname{cosec} x\,dx = -\ln|\operatorname{cosec} x + \cot x| + c`, inBooklet: true, unit: 'P4' },
  { id: 'pm-int-parts', section: 'Pure Mathematics', category: 'Integration', title: 'Integration by parts', latex: String.raw`\int u\frac{dv}{dx}\,dx = uv - \int v\frac{du}{dx}\,dx`, inBooklet: true, unit: 'P4' },
  { id: 'pm-int-vol', section: 'Pure Mathematics', category: 'Integration', title: 'Volume of revolution (x-axis)', latex: String.raw`V = \pi \int_a^b y^2\,dx`, inBooklet: false, unit: 'P4' },
  { id: 'pm-diff-eq-sep', section: 'Pure Mathematics', category: 'Integration', title: 'Separable differential equations', latex: String.raw`\int \frac{1}{g(y)}\,dy = \int f(x)\,dx`, inBooklet: false, unit: 'P4' },

  // Numerical Methods
  { id: 'pm-int-trap', section: 'Pure Mathematics', category: 'Numerical Methods', title: 'Trapezium rule', latex: String.raw`\int_a^b y\,dx \approx \frac{1}{2}h\left[(y_0 + y_n) + 2(y_1 + y_2 + \dots + y_{n-1})\right]`, description: 'h = (b − a) / n', inBooklet: true, unit: 'P2' },
  { id: 'pm-iter', section: 'Pure Mathematics', category: 'Numerical Methods', title: 'Fixed-point iteration', latex: String.raw`x_{n+1} = g(x_n)`, inBooklet: false, unit: 'P3' },

  // Vectors
  { id: 'pm-vec-dot', section: 'Pure Mathematics', category: 'Vectors', title: 'Scalar product (dot product)', latex: String.raw`\mathbf{a}\cdot\mathbf{b} = |\mathbf{a}||\mathbf{b}|\cos\theta = a_1b_1 + a_2b_2 + a_3b_3`, inBooklet: false, unit: 'P4' },
  { id: 'pm-vec-line', section: 'Pure Mathematics', category: 'Vectors', title: 'Vector equation of a straight line', latex: String.raw`\mathbf{r} = \mathbf{a} + \lambda\mathbf{b}`, description: 'a = position vector, b = direction vector', inBooklet: false, unit: 'P4' },
];

export const MECHANICS_FORMULAE: MathFormulaItem[] = [
  // Kinematics (Constant Acceleration)
  { id: 'm1-suvat-1', section: 'Mechanics', category: 'Kinematics (Constant Acceleration)', title: 'Velocity-Time relation', latex: String.raw`v = u + at`, inBooklet: false, unit: 'M1' },
  { id: 'm1-suvat-2', section: 'Mechanics', category: 'Kinematics (Constant Acceleration)', title: 'Displacement with average velocity', latex: String.raw`s = \frac{(u + v)t}{2}`, inBooklet: false, unit: 'M1' },
  { id: 'm1-suvat-3', section: 'Mechanics', category: 'Kinematics (Constant Acceleration)', title: 'Displacement with initial velocity', latex: String.raw`s = ut + \frac{1}{2}at^2`, inBooklet: false, unit: 'M1' },
  { id: 'm1-suvat-4', section: 'Mechanics', category: 'Kinematics (Constant Acceleration)', title: 'Timeless kinematic equation', latex: String.raw`v^2 = u^2 + 2as`, inBooklet: false, unit: 'M1' },
  { id: 'm1-suvat-5', section: 'Mechanics', category: 'Kinematics (Constant Acceleration)', title: 'Displacement with final velocity', latex: String.raw`s = vt - \frac{1}{2}at^2`, inBooklet: false, unit: 'M1' },

  // Dynamics & Friction
  { id: 'm1-newt2', section: 'Mechanics', category: 'Dynamics & Friction', title: "Newton's Second Law", latex: String.raw`\Sigma \mathbf{F} = m\mathbf{a}`, inBooklet: false, unit: 'M1' },
  { id: 'm1-weight', section: 'Mechanics', category: 'Dynamics & Friction', title: 'Weight', latex: String.raw`W = mg,\quad g = 9.8\text{ m s}^{-2}`, inBooklet: false, unit: 'M1' },
  { id: 'm1-fric', section: 'Mechanics', category: 'Dynamics & Friction', title: 'Friction law', latex: String.raw`F \le \mu R,\quad F_{\max} = \mu R`, description: 'μ = coefficient of friction, R = normal reaction', inBooklet: false, unit: 'M1' },

  // Momentum & Impulse
  { id: 'm1-mom', section: 'Mechanics', category: 'Momentum & Impulse', title: 'Linear momentum', latex: String.raw`p = mv`, inBooklet: false, unit: 'M1' },
  { id: 'm1-imp', section: 'Mechanics', category: 'Momentum & Impulse', title: 'Impulse', latex: String.raw`I = F\Delta t = m(v - u)`, inBooklet: false, unit: 'M1' },
  { id: 'm1-mom-cons', section: 'Mechanics', category: 'Momentum & Impulse', title: 'Conservation of linear momentum', latex: String.raw`m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2`, inBooklet: false, unit: 'M1' },

  // Statics & Equilibrium
  { id: 'm1-moment', section: 'Mechanics', category: 'Statics & Equilibrium', title: 'Moment of a force', latex: String.raw`\text{Moment} = F \times d`, description: 'd = perpendicular distance from pivot', inBooklet: false, unit: 'M1' },
  { id: 'm1-equil', section: 'Mechanics', category: 'Statics & Equilibrium', title: 'Equilibrium conditions', latex: String.raw`\Sigma F_x = 0,\quad \Sigma F_y = 0,\quad \Sigma M_P = 0`, inBooklet: false, unit: 'M1' },

  // Vectors in Kinematics
  { id: 'm1-vec-pos', section: 'Mechanics', category: 'Vectors in Kinematics', title: 'Position vector with constant velocity', latex: String.raw`\mathbf{r} = \mathbf{r}_0 + \mathbf{v}t`, inBooklet: false, unit: 'M1' },
  { id: 'm1-vec-speed', section: 'Mechanics', category: 'Vectors in Kinematics', title: 'Speed from velocity components', latex: String.raw`|\mathbf{v}| = \sqrt{v_x^2 + v_y^2}`, inBooklet: false, unit: 'M1' },
  { id: 'm1-vec-bearing', section: 'Mechanics', category: 'Vectors in Kinematics', title: 'Bearing from velocity', latex: String.raw`\text{Bearing} = \arctan\left(\frac{v_x}{v_y}\right)\text{ clockwise from North}`, inBooklet: false, unit: 'M1' },
];

export const STATISTICS_FORMULAE: MathFormulaItem[] = [
  // Measures of Location & Dispersion
  { id: 's1-mean', section: 'Statistics', category: 'Measures of Location & Dispersion', title: 'Mean', latex: String.raw`\bar{x} = \frac{\sum x}{n} = \frac{\sum fx}{\sum f}`, inBooklet: false, unit: 'S1' },
  { id: 's1-var', section: 'Statistics', category: 'Measures of Location & Dispersion', title: 'Variance', latex: String.raw`s^2 = \frac{\sum(x - \bar{x})^2}{n} = \frac{\sum x^2}{n} - \bar{x}^2`, inBooklet: false, unit: 'S1' },
  { id: 's1-sd', section: 'Statistics', category: 'Measures of Location & Dispersion', title: 'Standard deviation', latex: String.raw`s = \sqrt{\text{Variance}} = \sqrt{\frac{\sum x^2}{n} - \bar{x}^2}`, inBooklet: false, unit: 'S1' },
  { id: 's1-coding', section: 'Statistics', category: 'Measures of Location & Dispersion', title: 'Linear coding (mean & variance)', latex: String.raw`y = \frac{x - a}{b} \implies \bar{y} = \frac{\bar{x} - a}{b},\quad s_y^2 = \frac{s_x^2}{b^2}`, inBooklet: false, unit: 'S1' },
  { id: 's1-outliers-iqr', section: 'Statistics', category: 'Measures of Location & Dispersion', title: 'Outlier rule: IQR definition', latex: String.raw`\text{Outlier if } x < Q_1 - 1.5 \times \text{IQR}\;\text{ or }\; x > Q_3 + 1.5 \times \text{IQR}`, inBooklet: false, unit: 'S1' },
  { id: 's1-outliers-sd', section: 'Statistics', category: 'Measures of Location & Dispersion', title: 'Outlier rule: Standard deviation', latex: String.raw`\text{Outlier if } |x - \bar{x}| > 2s\;\text{ (or } 3s\text{)}`, inBooklet: false, unit: 'S1' },
  { id: 's1-histogram', section: 'Statistics', category: 'Measures of Location & Dispersion', title: 'Histogram: Frequency density', latex: String.raw`\text{Frequency Density} = \frac{\text{Frequency}}{\text{Class Width}},\quad \text{Area} \propto \text{Frequency}`, inBooklet: false, unit: 'S1' },

  // Correlation & Regression
  { id: 's1-sxx', section: 'Statistics', category: 'Correlation & Regression', title: 'Summary statistic Sxx', latex: String.raw`S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n}`, inBooklet: true, unit: 'S1' },
  { id: 's1-syy', section: 'Statistics', category: 'Correlation & Regression', title: 'Summary statistic Syy', latex: String.raw`S_{yy} = \sum y^2 - \frac{(\sum y)^2}{n}`, inBooklet: true, unit: 'S1' },
  { id: 's1-sxy', section: 'Statistics', category: 'Correlation & Regression', title: 'Summary statistic Sxy', latex: String.raw`S_{xy} = \sum xy - \frac{\sum x\sum y}{n}`, inBooklet: true, unit: 'S1' },
  { id: 's1-pmcc', section: 'Statistics', category: 'Correlation & Regression', title: 'PMCC (Pearson correlation coefficient)', latex: String.raw`r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}}`, inBooklet: true, unit: 'S1' },
  { id: 's1-reg-grad', section: 'Statistics', category: 'Correlation & Regression', title: 'Regression line gradient (b)', latex: String.raw`b = \frac{S_{xy}}{S_{xx}}`, inBooklet: true, unit: 'S1' },
  { id: 's1-reg-int', section: 'Statistics', category: 'Correlation & Regression', title: 'Regression line intercept (a)', latex: String.raw`a = \bar{y} - b\bar{x}`, inBooklet: true, unit: 'S1' },
  { id: 's1-reg-eq', section: 'Statistics', category: 'Correlation & Regression', title: 'Least squares regression line', latex: String.raw`y = a + bx`, inBooklet: true, unit: 'S1' },

  // Probability
  { id: 's1-prob-add', section: 'Statistics', category: 'Probability', title: 'Addition rule', latex: String.raw`P(A \cup B) = P(A) + P(B) - P(A \cap B)`, inBooklet: true, unit: 'S1' },
  { id: 's1-prob-cond', section: 'Statistics', category: 'Probability', title: 'Conditional probability', latex: String.raw`P(A \mid B) = \frac{P(A \cap B)}{P(B)}`, inBooklet: true, unit: 'S1' },
  { id: 's1-prob-bayes', section: 'Statistics', category: 'Probability', title: "Bayes' theorem", latex: String.raw`P(A \mid B) = \frac{P(B \mid A)P(A)}{P(B \mid A)P(A) + P(B \mid A')P(A')}`, inBooklet: true, unit: 'S1' },
  { id: 's1-prob-indep', section: 'Statistics', category: 'Probability', title: 'Independent events', latex: String.raw`P(A \cap B) = P(A)P(B) \iff P(A \mid B) = P(A)`, inBooklet: false, unit: 'S1' },
  { id: 's1-prob-mutex', section: 'Statistics', category: 'Probability', title: 'Mutually exclusive events', latex: String.raw`P(A \cap B) = 0 \implies P(A \cup B) = P(A) + P(B)`, inBooklet: false, unit: 'S1' },

  // Discrete Random Variables
  { id: 's1-drv-mean', section: 'Statistics', category: 'Discrete Random Variables', title: 'Discrete random variable: E(X)', latex: String.raw`E(X) = \mu = \sum x P(X = x)`, inBooklet: true, unit: 'S1' },
  { id: 's1-drv-var', section: 'Statistics', category: 'Discrete Random Variables', title: 'Discrete random variable: Var(X)', latex: String.raw`\operatorname{Var}(X) = \sigma^2 = \sum x^2 P(X = x) - \mu^2`, inBooklet: true, unit: 'S1' },
  { id: 's1-drv-exp-func', section: 'Statistics', category: 'Discrete Random Variables', title: 'Expectation of a function: E(g(X))', latex: String.raw`E(g(X)) = \sum g(x) P(X = x)`, inBooklet: true, unit: 'S1' },
  { id: 's1-drv-linear', section: 'Statistics', category: 'Discrete Random Variables', title: 'Linear transform of random variables', latex: String.raw`E(aX + b) = aE(X) + b,\quad \operatorname{Var}(aX + b) = a^2\operatorname{Var}(X)`, inBooklet: false, unit: 'S1' },
  { id: 's1-unif', section: 'Statistics', category: 'Discrete Random Variables', title: 'Discrete uniform distribution', latex: String.raw`E(X) = \frac{n + 1}{2},\quad \operatorname{Var}(X) = \frac{n^2 - 1}{12}`, description: 'X ∈ {1, 2, ..., n}', inBooklet: false, unit: 'S1' },

  // Normal Distribution
  { id: 's1-norm-z', section: 'Statistics', category: 'Normal Distribution', title: 'Standardisation formula', latex: String.raw`Z = \frac{X - \mu}{\sigma} \sim \mathrm{N}(0, 1)`, inBooklet: false, unit: 'S1' },
  { id: 's1-norm-sym', section: 'Statistics', category: 'Normal Distribution', title: 'Normal distribution symmetry', latex: String.raw`P(Z < -z) = 1 - \Phi(z),\quad P(Z > z) = 1 - \Phi(z)`, inBooklet: false, unit: 'S1' },
  { id: 's1-norm-interval', section: 'Statistics', category: 'Normal Distribution', title: 'Central interval probability', latex: String.raw`P(-z < Z < z) = 2\Phi(z) - 1`, inBooklet: false, unit: 'S1' },
];

export const NORMAL_TABLE_5COL: NormalTableRow5Col[] = [
  { c1: { z: '0.00', phi: '0.5000' }, c2: { z: '0.50', phi: '0.6915' }, c3: { z: '1.00', phi: '0.8413' }, c4: { z: '1.50', phi: '0.9332' }, c5: { z: '2.00', phi: '0.9772' } },
  { c1: { z: '0.01', phi: '0.5040' }, c2: { z: '0.51', phi: '0.6950' }, c3: { z: '1.01', phi: '0.8438' }, c4: { z: '1.51', phi: '0.9345' }, c5: { z: '2.02', phi: '0.9783' } },
  { c1: { z: '0.02', phi: '0.5080' }, c2: { z: '0.52', phi: '0.6985' }, c3: { z: '1.02', phi: '0.8461' }, c4: { z: '1.52', phi: '0.9357' }, c5: { z: '2.04', phi: '0.9793' } },
  { c1: { z: '0.03', phi: '0.5120' }, c2: { z: '0.53', phi: '0.7019' }, c3: { z: '1.03', phi: '0.8485' }, c4: { z: '1.53', phi: '0.9370' }, c5: { z: '2.06', phi: '0.9803' } },
  { c1: { z: '0.04', phi: '0.5160' }, c2: { z: '0.54', phi: '0.7054' }, c3: { z: '1.04', phi: '0.8508' }, c4: { z: '1.54', phi: '0.9382' }, c5: { z: '2.08', phi: '0.9812' } },
  { c1: { z: '0.05', phi: '0.5199' }, c2: { z: '0.55', phi: '0.7088' }, c3: { z: '1.05', phi: '0.8531' }, c4: { z: '1.55', phi: '0.9394' }, c5: { z: '2.10', phi: '0.9821' } },
  { c1: { z: '0.06', phi: '0.5239' }, c2: { z: '0.56', phi: '0.7123' }, c3: { z: '1.06', phi: '0.8554' }, c4: { z: '1.56', phi: '0.9406' }, c5: { z: '2.12', phi: '0.9830' } },
  { c1: { z: '0.07', phi: '0.5279' }, c2: { z: '0.57', phi: '0.7157' }, c3: { z: '1.07', phi: '0.8577' }, c4: { z: '1.57', phi: '0.9418' }, c5: { z: '2.14', phi: '0.9838' } },
  { c1: { z: '0.08', phi: '0.5319' }, c2: { z: '0.58', phi: '0.7190' }, c3: { z: '1.08', phi: '0.8599' }, c4: { z: '1.58', phi: '0.9429' }, c5: { z: '2.16', phi: '0.9846' } },
  { c1: { z: '0.09', phi: '0.5359' }, c2: { z: '0.59', phi: '0.7224' }, c3: { z: '1.09', phi: '0.8621' }, c4: { z: '1.59', phi: '0.9441' }, c5: { z: '2.18', phi: '0.9854' } },
  { c1: { z: '0.10', phi: '0.5398' }, c2: { z: '0.60', phi: '0.7257' }, c3: { z: '1.10', phi: '0.8643' }, c4: { z: '1.60', phi: '0.9452' }, c5: { z: '2.20', phi: '0.9861' } },
  { c1: { z: '0.11', phi: '0.5438' }, c2: { z: '0.61', phi: '0.7291' }, c3: { z: '1.11', phi: '0.8665' }, c4: { z: '1.61', phi: '0.9463' }, c5: { z: '2.22', phi: '0.9868' } },
  { c1: { z: '0.12', phi: '0.5478' }, c2: { z: '0.62', phi: '0.7324' }, c3: { z: '1.12', phi: '0.8686' }, c4: { z: '1.62', phi: '0.9474' }, c5: { z: '2.24', phi: '0.9875' } },
  { c1: { z: '0.13', phi: '0.5517' }, c2: { z: '0.63', phi: '0.7357' }, c3: { z: '1.13', phi: '0.8708' }, c4: { z: '1.63', phi: '0.9484' }, c5: { z: '2.26', phi: '0.9881' } },
  { c1: { z: '0.14', phi: '0.5557' }, c2: { z: '0.64', phi: '0.7389' }, c3: { z: '1.14', phi: '0.8729' }, c4: { z: '1.64', phi: '0.9495' }, c5: { z: '2.28', phi: '0.9887' } },
  { c1: { z: '0.15', phi: '0.5596' }, c2: { z: '0.65', phi: '0.7422' }, c3: { z: '1.15', phi: '0.8749' }, c4: { z: '1.65', phi: '0.9505' }, c5: { z: '2.30', phi: '0.9893' } },
  { c1: { z: '0.16', phi: '0.5636' }, c2: { z: '0.66', phi: '0.7454' }, c3: { z: '1.16', phi: '0.8770' }, c4: { z: '1.66', phi: '0.9515' }, c5: { z: '2.32', phi: '0.9898' } },
  { c1: { z: '0.17', phi: '0.5675' }, c2: { z: '0.67', phi: '0.7486' }, c3: { z: '1.17', phi: '0.8790' }, c4: { z: '1.67', phi: '0.9525' }, c5: { z: '2.34', phi: '0.9904' } },
  { c1: { z: '0.18', phi: '0.5714' }, c2: { z: '0.68', phi: '0.7517' }, c3: { z: '1.18', phi: '0.8810' }, c4: { z: '1.68', phi: '0.9535' }, c5: { z: '2.36', phi: '0.9909' } },
  { c1: { z: '0.19', phi: '0.5753' }, c2: { z: '0.69', phi: '0.7549' }, c3: { z: '1.19', phi: '0.8830' }, c4: { z: '1.69', phi: '0.9545' }, c5: { z: '2.38', phi: '0.9913' } },
  { c1: { z: '0.20', phi: '0.5793' }, c2: { z: '0.70', phi: '0.7580' }, c3: { z: '1.20', phi: '0.8849' }, c4: { z: '1.70', phi: '0.9554' }, c5: { z: '2.40', phi: '0.9918' } },
  { c1: { z: '0.21', phi: '0.5832' }, c2: { z: '0.71', phi: '0.7611' }, c3: { z: '1.21', phi: '0.8869' }, c4: { z: '1.71', phi: '0.9564' }, c5: { z: '2.42', phi: '0.9922' } },
  { c1: { z: '0.22', phi: '0.5871' }, c2: { z: '0.72', phi: '0.7642' }, c3: { z: '1.22', phi: '0.8888' }, c4: { z: '1.72', phi: '0.9573' }, c5: { z: '2.44', phi: '0.9927' } },
  { c1: { z: '0.23', phi: '0.5910' }, c2: { z: '0.73', phi: '0.7673' }, c3: { z: '1.23', phi: '0.8907' }, c4: { z: '1.73', phi: '0.9582' }, c5: { z: '2.46', phi: '0.9931' } },
  { c1: { z: '0.24', phi: '0.5948' }, c2: { z: '0.74', phi: '0.7704' }, c3: { z: '1.24', phi: '0.8925' }, c4: { z: '1.74', phi: '0.9591' }, c5: { z: '2.48', phi: '0.9934' } },
  { c1: { z: '0.25', phi: '0.5987' }, c2: { z: '0.75', phi: '0.7734' }, c3: { z: '1.25', phi: '0.8944' }, c4: { z: '1.75', phi: '0.9599' }, c5: { z: '2.50', phi: '0.9938' } },
  { c1: { z: '0.26', phi: '0.6026' }, c2: { z: '0.76', phi: '0.7764' }, c3: { z: '1.26', phi: '0.8962' }, c4: { z: '1.76', phi: '0.9608' }, c5: { z: '2.55', phi: '0.9946' } },
  { c1: { z: '0.27', phi: '0.6064' }, c2: { z: '0.77', phi: '0.7794' }, c3: { z: '1.27', phi: '0.8980' }, c4: { z: '1.77', phi: '0.9616' }, c5: { z: '2.60', phi: '0.9953' } },
  { c1: { z: '0.28', phi: '0.6103' }, c2: { z: '0.78', phi: '0.7823' }, c3: { z: '1.28', phi: '0.8997' }, c4: { z: '1.78', phi: '0.9625' }, c5: { z: '2.65', phi: '0.9960' } },
  { c1: { z: '0.29', phi: '0.6141' }, c2: { z: '0.79', phi: '0.7852' }, c3: { z: '1.29', phi: '0.9015' }, c4: { z: '1.79', phi: '0.9633' }, c5: { z: '2.70', phi: '0.9965' } },
  { c1: { z: '0.30', phi: '0.6179' }, c2: { z: '0.80', phi: '0.7881' }, c3: { z: '1.30', phi: '0.9032' }, c4: { z: '1.80', phi: '0.9641' }, c5: { z: '2.75', phi: '0.9970' } },
  { c1: { z: '0.31', phi: '0.6217' }, c2: { z: '0.81', phi: '0.7910' }, c3: { z: '1.31', phi: '0.9049' }, c4: { z: '1.81', phi: '0.9649' }, c5: { z: '2.80', phi: '0.9974' } },
  { c1: { z: '0.32', phi: '0.6255' }, c2: { z: '0.82', phi: '0.7939' }, c3: { z: '1.32', phi: '0.9066' }, c4: { z: '1.82', phi: '0.9656' }, c5: { z: '2.85', phi: '0.9978' } },
  { c1: { z: '0.33', phi: '0.6293' }, c2: { z: '0.83', phi: '0.7967' }, c3: { z: '1.33', phi: '0.9082' }, c4: { z: '1.83', phi: '0.9664' }, c5: { z: '2.90', phi: '0.9981' } },
  { c1: { z: '0.34', phi: '0.6331' }, c2: { z: '0.84', phi: '0.7995' }, c3: { z: '1.34', phi: '0.9099' }, c4: { z: '1.84', phi: '0.9671' }, c5: { z: '2.95', phi: '0.9984' } },
  { c1: { z: '0.35', phi: '0.6368' }, c2: { z: '0.85', phi: '0.8023' }, c3: { z: '1.35', phi: '0.9115' }, c4: { z: '1.85', phi: '0.9678' }, c5: { z: '3.00', phi: '0.9987' } },
  { c1: { z: '0.36', phi: '0.6406' }, c2: { z: '0.86', phi: '0.8051' }, c3: { z: '1.36', phi: '0.9131' }, c4: { z: '1.86', phi: '0.9686' }, c5: { z: '3.05', phi: '0.9989' } },
  { c1: { z: '0.37', phi: '0.6443' }, c2: { z: '0.87', phi: '0.8078' }, c3: { z: '1.37', phi: '0.9147' }, c4: { z: '1.87', phi: '0.9693' }, c5: { z: '3.10', phi: '0.9990' } },
  { c1: { z: '0.38', phi: '0.6480' }, c2: { z: '0.88', phi: '0.8106' }, c3: { z: '1.38', phi: '0.9162' }, c4: { z: '1.88', phi: '0.9699' }, c5: { z: '3.15', phi: '0.9992' } },
  { c1: { z: '0.39', phi: '0.6517' }, c2: { z: '0.89', phi: '0.8133' }, c3: { z: '1.39', phi: '0.9177' }, c4: { z: '1.89', phi: '0.9706' }, c5: { z: '3.20', phi: '0.9993' } },
  { c1: { z: '0.40', phi: '0.6554' }, c2: { z: '0.90', phi: '0.8159' }, c3: { z: '1.40', phi: '0.9192' }, c4: { z: '1.90', phi: '0.9713' }, c5: { z: '3.25', phi: '0.9994' } },
  { c1: { z: '0.41', phi: '0.6591' }, c2: { z: '0.91', phi: '0.8186' }, c3: { z: '1.41', phi: '0.9207' }, c4: { z: '1.91', phi: '0.9719' }, c5: { z: '3.30', phi: '0.9995' } },
  { c1: { z: '0.42', phi: '0.6628' }, c2: { z: '0.92', phi: '0.8212' }, c3: { z: '1.42', phi: '0.9222' }, c4: { z: '1.92', phi: '0.9726' }, c5: { z: '3.35', phi: '0.9996' } },
  { c1: { z: '0.43', phi: '0.6664' }, c2: { z: '0.93', phi: '0.8238' }, c3: { z: '1.43', phi: '0.9236' }, c4: { z: '1.93', phi: '0.9732' }, c5: { z: '3.40', phi: '0.9997' } },
  { c1: { z: '0.44', phi: '0.6700' }, c2: { z: '0.94', phi: '0.8264' }, c3: { z: '1.44', phi: '0.9251' }, c4: { z: '1.94', phi: '0.9738' }, c5: { z: '3.50', phi: '0.9998' } },
  { c1: { z: '0.45', phi: '0.6736' }, c2: { z: '0.95', phi: '0.8289' }, c3: { z: '1.45', phi: '0.9265' }, c4: { z: '1.95', phi: '0.9744' }, c5: { z: '3.60', phi: '0.9998' } },
  { c1: { z: '0.46', phi: '0.6772' }, c2: { z: '0.96', phi: '0.8315' }, c3: { z: '1.46', phi: '0.9279' }, c4: { z: '1.96', phi: '0.9750' }, c5: { z: '3.70', phi: '0.9999' } },
  { c1: { z: '0.47', phi: '0.6808' }, c2: { z: '0.97', phi: '0.8340' }, c3: { z: '1.47', phi: '0.9292' }, c4: { z: '1.97', phi: '0.9756' }, c5: { z: '3.80', phi: '0.9999' } },
  { c1: { z: '0.48', phi: '0.6844' }, c2: { z: '0.98', phi: '0.8365' }, c3: { z: '1.48', phi: '0.9306' }, c4: { z: '1.98', phi: '0.9761' }, c5: { z: '3.90', phi: '1.0000' } },
  { c1: { z: '0.49', phi: '0.6879' }, c2: { z: '0.99', phi: '0.8389' }, c3: { z: '1.49', phi: '0.9319' }, c4: { z: '1.99', phi: '0.9767' }, c5: { z: '4.00', phi: '1.0000' } },
];

export const NORMAL_PERCENTAGE_POINTS: NormalDistributionPoint[] = [
  { p: '0.5000', z: '0.0000' },
  { p: '0.4000', z: '0.2533' },
  { p: '0.3000', z: '0.5244' },
  { p: '0.2000', z: '0.8416' },
  { p: '0.1500', z: '1.0364' },
  { p: '0.1000', z: '1.2816' },
  { p: '0.0500', z: '1.6449' },
  { p: '0.0250', z: '1.9600' },
  { p: '0.0100', z: '2.3263' },
  { p: '0.0050', z: '2.5758' },
  { p: '0.0010', z: '3.0902' },
  { p: '0.0005', z: '3.2905' },
];

export function calculatePhi(z: number): number {
  if (isNaN(z)) return NaN;
  if (z < 0) return Math.round((1 - calculatePhi(-z)) * 10000) / 10000;
  if (z >= 3.9) return 1.0;
  // Rational Chebyshev approximation of erf
  const t = 1.0 / (1.0 + 0.2316419 * z);
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const prob = 1.0 - d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return Math.round(prob * 10000) / 10000;
}
