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
  { id: 1, equation: 'Li⁺ + e⁻ ⇌ Li', potential: '-3.04', numericValue: -3.04 },
  { id: 2, equation: 'K⁺ + e⁻ ⇌ K', potential: '-2.92', numericValue: -2.92 },
  { id: 3, equation: 'Ca²⁺ + 2e⁻ ⇌ Ca', potential: '-2.87', numericValue: -2.87 },
  { id: 4, equation: 'Na⁺ + e⁻ ⇌ Na', potential: '-2.71', numericValue: -2.71 },
  { id: 5, equation: 'Mg²⁺ + 2e⁻ ⇌ Mg', potential: '-2.38', numericValue: -2.38 },
  { id: 6, equation: 'Al³⁺ + 3e⁻ ⇌ Al', potential: '-1.66', numericValue: -1.66 },
  { id: 7, equation: 'Mn²⁺ + 2e⁻ ⇌ Mn', potential: '-1.18', numericValue: -1.18 },
  { id: 8, equation: 'V²⁺ + 2e⁻ ⇌ V', potential: '-1.20', numericValue: -1.20 },
  { id: 9, equation: '2H₂O + 2e⁻ ⇌ H₂ + 2OH⁻', potential: '-0.83', numericValue: -0.83 },
  { id: 10, equation: 'Zn²⁺ + 2e⁻ ⇌ Zn', potential: '-0.76', numericValue: -0.76 },
  { id: 11, equation: 'Cr³⁺ + 3e⁻ ⇌ Cr', potential: '-0.74', numericValue: -0.74 },
  { id: 12, equation: 'Fe²⁺ + 2e⁻ ⇌ Fe', potential: '-0.44', numericValue: -0.44 },
  { id: 13, equation: 'Cr³⁺ + e⁻ ⇌ Cr²⁺', potential: '-0.41', numericValue: -0.41 },
  { id: 14, equation: 'Ni²⁺ + 2e⁻ ⇌ Ni', potential: '-0.25', numericValue: -0.25 },
  { id: 15, equation: 'Sn²⁺ + 2e⁻ ⇌ Sn', potential: '-0.14', numericValue: -0.14 },
  { id: 16, equation: 'Pb²⁺ + 2e⁻ ⇌ Pb', potential: '-0.13', numericValue: -0.13 },
  { id: 17, equation: 'Fe³⁺ + 3e⁻ ⇌ Fe', potential: '-0.04', numericValue: -0.04 },
  { id: 18, equation: '2H⁺ + 2e⁻ ⇌ H₂ (Standard Reference)', potential: '0.00', numericValue: 0.00 },
  { id: 19, equation: 'V³⁺ + e⁻ ⇌ V²⁺', potential: '-0.26', numericValue: -0.26 },
  { id: 20, equation: 'SO₄²⁻ + 4H⁺ + 2e⁻ ⇌ H₂SO₃ + H₂O', potential: '+0.17', numericValue: 0.17 },
  { id: 21, equation: 'Cu²⁺ + 2e⁻ ⇌ Cu', potential: '+0.34', numericValue: 0.34 },
  { id: 22, equation: 'VO²⁺ + 2H⁺ + e⁻ ⇌ V³⁺ + H₂O', potential: '+0.34', numericValue: 0.34 },
  { id: 23, equation: 'I₂ + 2e⁻ ⇌ 2I⁻', potential: '+0.54', numericValue: 0.54 },
  { id: 24, equation: 'O₂ + 2H₂O + 4e⁻ ⇌ 4OH⁻', potential: '+0.40', numericValue: 0.40 },
  { id: 25, equation: 'Fe³⁺ + e⁻ ⇌ Fe²⁺', potential: '+0.77', numericValue: 0.77 },
  { id: 26, equation: 'Ag⁺ + e⁻ ⇌ Ag', potential: '+0.80', numericValue: 0.80 },
  { id: 27, equation: 'NO₃⁻ + 2H⁺ + e⁻ ⇌ NO₂ + H₂O', potential: '+0.80', numericValue: 0.80 },
  { id: 28, equation: 'Br₂ + 2e⁻ ⇌ 2Br⁻', potential: '+1.09', numericValue: 1.09 },
  { id: 29, equation: 'O₂ + 4H⁺ + 4e⁻ ⇌ 2H₂O', potential: '+1.23', numericValue: 1.23 },
  { id: 30, equation: 'Cr₂O₇²⁻ + 14H⁺ + 6e⁻ ⇌ 2Cr³⁺ + 7H₂O', potential: '+1.33', numericValue: 1.33 },
  { id: 31, equation: 'Cl₂ + 2e⁻ ⇌ 2Cl⁻', potential: '+1.36', numericValue: 1.36 },
  { id: 32, equation: 'MnO₄⁻ + 8H⁺ + 5e⁻ ⇌ Mn²⁺ + 4H₂O', potential: '+1.51', numericValue: 1.51 },
  { id: 33, equation: 'H₂O₂ + 2H⁺ + 2e⁻ ⇌ 2H₂O', potential: '+1.77', numericValue: 1.77 },
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
