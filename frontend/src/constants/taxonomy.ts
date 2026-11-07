/**
 * Official Pearson Edexcel International Advanced Level (IAL) Chemistry
 * Canonical Specification Taxonomy.
 *
 * Mirrors OFFICIAL_SYLLABUS from pipeline/syllabus.py.
 * Every subtopic is permanently tied to its canonical Topic and Unit.
 */

export interface TopicDefinition {
  topicName: string;
  subtopics: string[];
}

export interface UnitDefinition {
  unitCode: string;
  unitName: string;
  title: string;
  topics: TopicDefinition[];
}

export const OFFICIAL_IAL_CHEMISTRY_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: 'WCH11',
    unitName: 'Unit 1',
    title: 'Structure, Bonding and Introduction to Organic Chemistry',
    topics: [
      {
        topicName: 'Topic 1: Formulae, Equations and Amount of Substance',
        subtopics: [
          '1.1-1.4: Atoms, Moles, Avogadro Constant & Molar Mass (Ar, Mr, ppm)',
          '1.3 & 1.12: Chemical & Ionic Equations, State Symbols & Test-Tube Observations',
          '1.5: Solution Concentrations (mol dm^-3 and g dm^-3)',
          '1.6: Empirical & Molecular Formulae from Experimental Data',
          '1.7-1.8 & 1.11: Reacting Masses, Molar Gas Volume, pV=nRT & Core Practical 1',
          '1.9-1.10: Percentage Yield, Atom Economy & Experimental Formula Determination',
        ],
      },
      {
        topicName: 'Topic 2: Atomic Structure and the Periodic Table',
        subtopics: [
          '2.1-2.5: Subatomic Particles, Atomic/Mass Numbers & Isotopes',
          '2.6-2.7: Mass Spectrometry, Relative Atomic Mass & Diatomic Spectra',
          '2.8, 2.10-2.11: Ionisation Energies & Evidence for Quantum Shells and Sub-shells',
          '2.9, 2.12-2.16: Atomic Orbitals (s, p, d), Electronic Configurations & Periodic Blocks',
          '2.17-2.18: Periodicity: Melting/Boiling Point & Ionisation Energy Trends (Periods 2 & 3)',
        ],
      },
      {
        topicName: 'Topic 3: Bonding and Structure',
        subtopics: [
          '3A (3.1-3.7): Ionic Bonding, Lattices, Evidence for Ions & Isoelectronic Ionic Radii',
          '3A (3.8-3.9): Ion Polarisation, Polarising Power & Polarisability',
          '3B (3.10-3.12): Covalent & Dative Bonding, Dot-and-Cross & Giant Carbon Lattices',
          '3B (3.13-3.15): Electronegativity, Bond Polarity & Polar vs Non-Polar Molecules',
          '3C (3.16-3.19): Shapes of Molecules & Ions and Electron-Pair Repulsion Theory',
          '3D (3.20-3.22): Metallic Bonding, Lattices & Physical Properties of Metals',
        ],
      },
      {
        topicName: 'Topic 4: Introductory Organic Chemistry and Alkanes',
        subtopics: [
          '4A (4.1-4.3): Hazards, Risk Assessment & Safe Laboratory Precautions',
          '4A (4.4-4.8): Homologous Series, IUPAC Nomenclature, Reaction Types & Bond Fission',
          '4B (4.9-4.11): Alkanes & Cycloalkanes: General Formulae & Structural Isomerism',
          '4B (4.12-4.16): Crude Oil, Fractional Distillation, Cracking, Pollutants & Carbon Neutrality',
          '4B (4.17-4.18): Free Radical Substitution of Alkanes (Initiation, Propagation, Termination)',
        ],
      },
      {
        topicName: 'Topic 5: Alkenes',
        subtopics: [
          '5.1-5.3: Alkene Structure (Sigma & Pi Bonds) & Geometric Isomerism (Cis/Trans & E/Z)',
          '5.4-5.5: Addition Reactions of Alkenes (H2, Halogens, HX, Steam, KMnO4) & Bromine Test',
          '5.6: Electrophilic Addition Mechanisms & Carbocation Stability',
          '5.7-5.8: Addition Polymerisation, Repeat Units & Polymer Waste Management',
        ],
      },
    ],
  },
  {
    unitCode: 'WCH12',
    unitName: 'Unit 2',
    title: 'Energetics, Group Chemistry, Halogenoalkanes and Alcohols',
    topics: [
      {
        topicName: 'Topic 6: Energetics',
        subtopics: [
          '6.1-6.4: Enthalpy Changes, Standard Definitions & Enthalpy Level Diagrams',
          '6.5 & 6.8: Calorimetry (q=mcΔT), Cooling Curves & Experimental Uncertainties',
          '6.6-6.7: Hess\'s Law, Enthalpy Cycles & Core Practical 2',
          '6.9-6.11: Bond Enthalpies, Mean Bond Enthalpies & Reaction Rate Links',
        ],
      },
      {
        topicName: 'Topic 7: Intermolecular Forces',
        subtopics: [
          '7.1-7.4: London Forces, Permanent Dipoles, Hydrogen Bonding & Anomalous Properties of Water',
          '7.5: Intermolecular Forces & Physical Properties (Boiling Points of Alkanes, Alcohols & HX)',
          '7.6: Solubility & Choice of Solvents (Hydration of Ions, Aqueous vs Non-Aqueous)',
        ],
      },
      {
        topicName: 'Topic 8: Redox Chemistry and Groups 1, 2 and 7',
        subtopics: [
          '8A (8.1-8.10): Oxidation Numbers, Redox Reactions, Disproportionation & Ionic Half-Equations',
          '8B (8.11-8.15): Group 1 & 2 Reactivity Trends, Reactions with O2/Cl2/H2O & Hydroxide/Sulfate Solubility',
          '8B (8.16-8.18): Thermal Stability of Group 1 & 2 Nitrates and Carbonates & Flame Tests',
          '8B (8.19): Qualitative Tests for Carbonate, Hydrogencarbonate, Sulfate & Ammonium Ions',
          '8B (8.20-8.23): Acid-Base Titrations, Standard Solutions & Volumetric Uncertainties (Core Practicals 3 & 4)',
          '8C (8.24-8.26 & 8.28): Group 7 Physical Trends, Displacement Reactions & Chlorine Disproportionation',
          '8C (8.27): Reactions of Halide Ions (Conc. H2SO4, Silver Nitrate/Ammonia & Hydrogen Halides)',
        ],
      },
      {
        topicName: 'Topic 9: Introduction to Kinetics and Equilibria',
        subtopics: [
          '9A (9.1-9.3): Collision Theory, Activation Energy & Graphical Rate Calculations',
          '9A (9.4-9.8): Maxwell-Boltzmann Distribution, Reaction Profiles & Role of Catalysts',
          '9B (9.9-9.11): Dynamic Equilibrium, Le Chatelier\'s Principle & Industrial Compromises',
        ],
      },
      {
        topicName: 'Topic 10: Organic Chemistry: Halogenoalkanes, Alcohols and Spectra',
        subtopics: [
          '10A (10.1-10.5): General Principles: Reaction Classification, Mechanisms, Nucleophiles & Bond Polarity',
          '10B (10.6-10.9): Halogenoalkanes: Nomenclature, Nucleophilic Substitution (OH-, NH3, CN-) & Elimination',
          '10B (10.10-10.14): Rates of Hydrolysis of Halogenoalkanes, Bond Enthalpy Effects & Core Practicals 5 & 6',
          '10C (10.15-10.17): Alcohols: Classification, Combustion, Halogenation (PCl5, KBr/H2SO4, P/I2) & Dehydration',
          '10C (10.18-10.20): Oxidation of Alcohols, Organic Liquid Purification (Reflux, Distillation) & Core Practical 7',
          '10D (10.21-10.23): Organic Mass Spectrometry (Fragmentation), Infrared (IR) Spectroscopy & Core Practical 8',
        ],
      },
    ],
  },
  {
    unitCode: 'WCH13',
    unitName: 'Unit 3',
    title: 'Practical Skills in Chemistry I',
    topics: [
      {
        topicName: 'Unit 3 Practical Skills: Core Practicals 1–8 & Laboratory Techniques I',
        subtopics: [
          'U3.1: Quantitative & Volumetric Practicals (Molar Gas Volume CP1 & Acid-Base Titrations CP3, CP4)',
          'U3.2: Thermochemistry & Kinetics Practicals (Hess\'s Law CP2, Rates & Haloalkane Hydrolysis CP5)',
          'U3.3: Qualitative Inorganic Analysis (Tests for Cations, Anions, Gases & Flame Tests CP8)',
          'U3.4: Qualitative Organic Analysis & Spectroscopy in Practical Contexts (Functional Group Tests CP8)',
          'U3.5: Organic Preparation & Purification Techniques (Reflux, Distillation, Separating Funnel, Drying CP6, CP7)',
          'U3.6: Experimental Planning, Apparatus, Safety, Uncertainties & Graphical Data Analysis',
        ],
      },
    ],
  },
  {
    unitCode: 'WCH14',
    unitName: 'Unit 4',
    title: 'Rates, Equilibria and Further Organic Chemistry',
    topics: [
      {
        topicName: 'Topic 11: Kinetics',
        subtopics: [
          '11.1-11.5: Rate Equations, Orders of Reaction, Half-Life & Experimental Rate Methods (Initial & Continuous)',
          '11.6-11.9 & 11.12: Rate-Determining Step, Reaction Mechanisms (Iodine-Propanone, SN1/SN2) & Core Practicals 9a/9b',
          '11.10-11.11 & 11.13: Activation Energy, Arrhenius Equation, Heterogeneous Catalysis & Core Practical 10',
        ],
      },
      {
        topicName: 'Topic 12: Entropy and Energetics',
        subtopics: [
          '12A (12.1-12.5): Entropy (ΔS), Disorder, State/Mole Changes & Spontaneous Processes',
          '12A (12.6-12.11): System, Surroundings & Total Entropy (ΔS_total), Feasibility & Thermodynamic vs Kinetic Stability',
          '12B (12.12-12.15): Lattice Energy, Born-Haber Cycles, Ion Polarisation & Experimental vs Theoretical Lattice Energy',
          '12B (12.16-12.19): Enthalpy of Solution & Hydration, Ionic Charge/Radius Effects & Solubility Predictions',
        ],
      },
      {
        topicName: 'Topic 13: Chemical Equilibria',
        subtopics: [
          '13.1-13.3: Equilibrium Constants Kc and Kp (Homogeneous & Heterogeneous) & Calculations',
          '13.4-13.9: Effects of Temperature, Pressure & Catalysts on Equilibrium, Kc/Kp & ΔS_total = R ln K',
        ],
      },
      {
        topicName: 'Topic 14: Acid-base Equilibria',
        subtopics: [
          '14.1-14.7 & 14.10-14.13: Brønsted-Lowry Theory, pH of Strong Acids & Strong Bases, Kw & Dilution Effects',
          '14.8-14.9, 14.14 & 14.23: Weak Acids, Acid Dissociation Constant (Ka, pKa) Calculations & Core Practical 11',
          '14.15-14.16 & 14.21: Acid-Base Titration Curves (Monoprotic & Diprotic), Indicator Selection & Half-Neutralisation',
          '14.17-14.20 & 14.22: Buffer Solutions: Action, pH Calculations, Preparation & Biological Importance',
        ],
      },
      {
        topicName: 'Topic 15: Organic Chemistry: Carbonyls, Carboxylic Acids and Chirality',
        subtopics: [
          '15A (15.1-15.5): Chirality, Optical Isomerism, Plane-Polarised Light, Racemic Mixtures & SN1/SN2 Stereochemistry',
          '15B (15.6-15.8): Aldehydes & Ketones: Properties, Oxidation/Reduction, HCN Nucleophilic Addition, 2,4-DNPH & Iodoform',
          '15C (15.9-15.12): Carboxylic Acids: Properties, Preparation (Oxidation, Nitrile Hydrolysis) & Reactions',
          '15D (15.13-15.16): Acyl Chlorides, Esters (Acid/Alkaline Hydrolysis) & Condensation Polyesters',
          '15E (15.17-15.20): High-Resolution Mass Spectrometry, Carbon-13 (13C) NMR & Proton (1H) NMR Spectroscopy',
          '15E (15.21-15.23): Chromatography: Paper/TLC (Rf Values), HPLC & Gas Chromatography (GC-MS)',
        ],
      },
    ],
  },
  {
    unitCode: 'WCH15',
    unitName: 'Unit 5',
    title: 'Transition Metals and Organic Nitrogen Chemistry',
    topics: [
      {
        topicName: 'Topic 16: Redox Equilibria',
        subtopics: [
          '16.1-16.9: Standard Electrode Potentials (E°), Standard Hydrogen Electrode, Cell Diagrams & Core Practical 12',
          '16.10-16.14: Thermodynamic Feasibility, Disproportionation, E°_cell vs ΔS_total/ln K & Kinetic Limitations',
          '16.15-16.17: Redox Titrations (MnO4- / Fe2+ and I2 / S2O3 2-), Uncertainties & Core Practicals 13a/13b',
          '16.18-16.19: Fuel Cells (Hydrogen-Oxygen Acidic & Alkaline Electrolytes and Hydrogen-Rich Fuels)',
        ],
      },
      {
        topicName: 'Topic 17: Transition Metals and their Chemistry',
        subtopics: [
          '17.1-17.6 & 17.10-17.17: Transition Metal Properties, Electronic Configurations, Ligands, Complex Shapes & Cis-Platin/Haemoglobin',
          '17.7-17.9 & 17.11: Origin of Colour in Complexes (d-Orbital Splitting) & Factors Affecting Colour',
          '17.18-17.21: Vanadium (+5 to +2) Redox Chemistry & Chromium (Cr2O7 2- / CrO4 2- / Cr3+ / Cr2+) Reactions',
          '17.22-17.25 & 17.33: Aqueous Metal Ion Reactions (NaOH & NH3), Deprotonation, Ligand Exchange, Chelate Effect & Core Practical 14',
          '17.26-17.32: Heterogeneous & Homogeneous Catalysis (V2O5 Contact Process, Catalytic Converters, Fe2+ & Mn2+ Autocatalysis)',
        ],
      },
      {
        topicName: 'Topic 18: Organic Chemistry - Arenes',
        subtopics: [
          '18.1-18.3: Benzene Structure, Thermochemical/X-Ray/IR Evidence, Delocalised Pi-System & Resistance to Bromination',
          '18.4-18.5: Reactions of Benzene & Electrophilic Substitution Mechanisms (Halogenation, Nitration, Sulfonation, Friedel-Crafts)',
          '18.6: Phenol: Reaction with Bromine Water & Relative Reactivity vs Benzene',
        ],
      },
      {
        topicName: 'Topic 19: Organic Nitrogen Compounds: Amines, Amides, Amino Acids and Proteins',
        subtopics: [
          '19.1-19.5: Amines: Nomenclature, Basicity (Aliphatic vs Aromatic), Preparation & Reactions',
          '19.6: Aromatic Amines with Nitrous Acid (Diazotisation) & Azo Dye Coupling Reactions',
          '19.7-19.10: Amides, Polyamides (Condensation Polymerisation) & Addition Polymers (Poly(propenamide), Poly(ethenol))',
          '19.11-19.12: Amino Acids (Zwitterions, Acidity/Basicity, Optical Activity, Peptide Bonds), Proteins & Core Practical 15',
        ],
      },
      {
        topicName: 'Topic 20: Organic Synthesis',
        subtopics: [
          '20.1: Structure Elucidation from Combined Analytical Data (Combustion, % Composition, Chemical Tests, IR, MS, 13C & 1H NMR)',
          '20.2-20.3: Multi-Step Organic Synthesis, Carbon-Chain Extension (Grignard Reagents & Nitriles) & Hazard Control',
          '20.4-20.5: Advanced Organic Preparation & Purification (Recrystallisation, Steam Distillation, Melting Point & Aspirin CP16)',
        ],
      },
    ],
  },
  {
    unitCode: 'WCH16',
    unitName: 'Unit 6',
    title: 'Practical Skills in Chemistry II',
    topics: [
      {
        topicName: 'Unit 6 Practical Skills: Core Practicals 9–16 & Laboratory Techniques II',
        subtopics: [
          'U6.1: Transition Metal & Inorganic Qualitative Analysis (NaOH, NH3, Redox & Precipitation Tests CP14, CP15)',
          'U6.2: Advanced Organic Qualitative Analysis & Structure Deduction (Functional Group Tests & Spectroscopy CP15)',
          'U6.3: Quantitative Kinetics, Equilibria & pH/Ka Practicals (Clock/Titrimetric Rates CP9, Arrhenius CP10, Ka/Buffers CP11)',
          'U6.4: Electrochemical Cells & Redox Titration Practicals (Cell EMF CP12, MnO4- & Iodine-Thiosulfate Titrations CP13a/b)',
          'U6.5: Organic Synthesis, Recrystallisation & Purity Determination (Aspirin Preparation CP16, Melting Point, Washing/Drying)',
        ],
      },
    ],
  },
];

export const OFFICIAL_IAL_PHYSICS_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: "WPH11",
    unitName: "Unit 1",
    title: "Mechanics and Materials",
    topics: [
      {
        topicName: "Topic 1 (1.3): Mechanics",
        subtopics: [
          "1.3.1 (Spec 1-3): Kinematics, SUVAT Equations & Motion Graphs (s-t, v-t, a-t)",
          "1.3.2 (Spec 4-6): Scalars, Vectors, Resolution & Coplanar Vector Addition",
          "1.3.3 (Spec 7): Projectile Motion & Independence of Vertical/Horizontal Motion",
          "1.3.4 (Spec 8-12): Free-Body Diagrams, Newton's Laws of Motion (ΣF=ma), Terminal Velocity & Core Practical 1",
          "1.3.5 (Spec 13-14): Momentum (p=mv) & 1D Conservation of Linear Momentum",
          "1.3.6 (Spec 15-16): Moments, Centre of Gravity & Principle of Moments in Equilibrium",
          "1.3.7 (Spec 17-22): Work Done, Kinetic & Gravitational Potential Energy, Conservation of Energy, Power & Efficiency",
        ],
      },
      {
        topicName: "Topic 2 (1.4): Materials",
        subtopics: [
          "1.4.1 (Spec 23-24): Density (ρ=m/V), Upthrust & Archimedes' Principle",
          "1.4.2 (Spec 25-26): Laminar vs Turbulent Flow, Viscosity, Stokes' Law (F=6πηrv) & Core Practical 2",
          "1.4.3 (Spec 27, 29, 32): Hooke's Law (ΔF=kΔx), Force-Extension Graphs & Elastic Strain Energy (ΔE_el=½FΔx)",
          "1.4.4 (Spec 28, 30-31): Stress, Strain, Young Modulus, Stress-Strain Graphs (Elastic/Plastic, Yield, Breaking Stress) & Core Practical 3",
        ],
      },
    ],
  },
  {
    unitCode: "WPH12",
    unitName: "Unit 2",
    title: "Waves and Electricity",
    topics: [
      {
        topicName: "Topic 3 (2.3): Waves and Particle Nature of Light",
        subtopics: [
          "2.3.1 (Spec 33-38): Wave Properties, Wave Equation (v=fλ), Longitudinal vs Transverse Waves & Core Practical 4 (Speed of Sound)",
          "2.3.2 (Spec 39-40): Wavefronts, Coherence, Superposition, Interference & Phase/Path Difference",
          "2.3.3 (Spec 41-43): Stationary Waves, Nodes/Antinodes, Waves on a String (v=√(T/μ)) & Core Practical 5",
          "2.3.4 (Spec 44-48): Intensity (I=P/A), Refraction, Snell's Law, Critical Angle, Total Internal Reflection & Refractive Index",
          "2.3.5 (Spec 49-52): Plane Polarisation, Huygens' Construction, Diffraction Gratings (nλ=d sinθ) & Core Practical 6",
          "2.3.6 (Spec 55-56): Wave Reflection/Transmission at Interfaces & Pulse-Echo Ultrasound Techniques",
          "2.3.7 (Spec 57-62): Photons (E=hf), Electronvolts (eV), Photoelectric Effect (hf=φ+½mv_max²) & Wave-Particle Models",
          "2.3.8 (Spec 53-54, 63): Electron Diffraction, de Broglie Wavelength (λ=h/p) & Atomic Line Spectra / Energy Levels",
        ],
      },
      {
        topicName: "Topic 4 (2.4): Electric Circuits",
        subtopics: [
          "2.4.1 (Spec 64-66, 69): Electric Current (I=ΔQ/Δt), Potential Difference (V=W/Q), Resistance (R=V/I) & Electrical Power/Energy",
          "2.4.2 (Spec 67-68): Charge & Energy Conservation (Kirchhoff's Laws) & Series/Parallel Resistor Combinations",
          "2.4.3 (Spec 70): Current-Potential Difference (I-V) Characteristics (Ohmic Conductors, Filament Bulbs, Thermistors, Diodes)",
          "2.4.4 (Spec 71-73, 79-80): Resistivity (R=ρl/A), Transport Equation (I=nqvA), Conduction Models (Metals, NTC Thermistors, LDRs) & Core Practical 7",
          "2.4.5 (Spec 74-76): Potential Along a Uniform Wire, Potential Divider Circuits & Sensor Circuits (Thermistors & LDRs)",
          "2.4.6 (Spec 77-78): Electromotive Force (e.m.f.), Internal Resistance, Terminal p.d. (ε=V+Ir) & Core Practical 8",
        ],
      },
    ],
  },
  {
    unitCode: "WPH13",
    unitName: "Unit 3",
    title: "Practical Skills in Physics I",
    topics: [
      {
        topicName: "Unit 3 Practical Skills: Experimental Planning, Implementation & Processing (AS)",
        subtopics: [
          "3.3: Experimental Planning: Apparatus Selection, Range/Resolution (Vernier, Micrometer), Calibration, Control Variables & Safety",
          "3.4: Implementation & Measurements: Readings, Range, Significant Figures, Anomalous Points & Experimental Improvements",
          "3.5: Processing Results: Graphing, Gradients, Single/Multiple Reading Percentage Uncertainties & Core Practicals 1–8",
        ],
      },
    ],
  },
  {
    unitCode: "WPH14",
    unitName: "Unit 4",
    title: "Further Mechanics, Fields and Particles",
    topics: [
      {
        topicName: "Topic 5 (4.3): Further Mechanics",
        subtopics: [
          "4.3.1 (Spec 81-82, 86): Impulse (FΔt=Δp), Non-Relativistic Kinetic Energy (E_k=p²/2m) & Core Practical 9",
          "4.3.2 (Spec 83-85): 2D Conservation of Linear Momentum, Elastic vs Inelastic Collisions & Core Practical 10",
          "4.3.3 (Spec 87-91): Circular Motion: Radian Measure, Angular Velocity (v=ωr), Centripetal Acceleration (a=v²/r=rω²) & Centripetal Force",
        ],
      },
      {
        topicName: "Topic 6 (4.4): Electric and Magnetic Fields",
        subtopics: [
          "4.4.1 (Spec 92-99): Electric Fields, Coulomb's Law, Point/Parallel-Plate Field Strength (E=F/Q, E=V/d), Electric Potential & Equipotentials",
          "4.4.2 (Spec 100-104): Capacitance (C=Q/V), Energy Stored (W=½QV=½CV²), RC Exponential Charging/Discharging (Q=Q0e^(-t/RC), ln plots) & Core Practical 11",
          "4.4.3 (Spec 105-107): Magnetic Flux Density (B), Fleming's Left-Hand Rule & Magnetic Forces on Charged Particles (F=Bqv sinθ) and Conductors (F=BIl sinθ)",
          "4.4.4 (Spec 105, 108-110): Magnetic Flux (Φ), Flux Linkage (NΦ) & Electromagnetic Induction (Faraday's & Lenz's Laws, ε=-d(NΦ)/dt)",
        ],
      },
      {
        topicName: "Topic 7 (4.5): Nuclear and Particle Physics",
        subtopics: [
          "4.5.1 (Spec 111-112): Nucleon/Proton Numbers, Alpha Particle Scattering & Evolution of the Nuclear Model",
          "4.5.2 (Spec 113-116): Thermionic Emission, Linear Accelerators (Linacs), Cyclotrons, Magnetic Curvature (r=p/BQ) & Particle Detectors/Tracks",
          "4.5.3 (Spec 117-120): High-Energy Probing, Mass-Energy Equivalence (ΔE=c²Δm), Matter-Antimatter Annihilation/Creation, MeV/GeV Units & Relativistic Lifetimes",
          "4.5.4 (Spec 121-124): Standard Quark-Lepton Model (Baryons, Mesons, Leptons, Photons, Antiparticles) & Conservation Laws (Charge, Baryon, Lepton)",
        ],
      },
    ],
  },
  {
    unitCode: "WPH15",
    unitName: "Unit 5",
    title: "Thermodynamics, Radiation, Oscillations and Cosmology",
    topics: [
      {
        topicName: "Topic 8 (5.3): Thermodynamics",
        subtopics: [
          "5.3.1 (Spec 125-127): Specific Heat Capacity (ΔE=mcΔθ), Specific Latent Heat (ΔE=LΔm) & Core Practicals 12 & 13",
          "5.3.2 (Spec 128-132): Internal Energy, Absolute Zero, Ideal Gas Equation (pV=NkT), Kinetic Theory (½m<c²>=3/2 kT) & Core Practical 14",
        ],
      },
      {
        topicName: "Topic 9 (5.4): Nuclear Decay",
        subtopics: [
          "5.4.1 (Spec 133-136): Mass Defect, Nuclear Binding Energy (ΔE=c²Δm), Atomic Mass Unit (u), Nuclear Fission & Nuclear Fusion",
          "5.4.2 (Spec 137-140): Background Radiation, Alpha/Beta/Gamma Properties, Nuclear Decay Equations & Core Practical 15 (Gamma Absorption)",
          "5.4.3 (Spec 141-142): Random/Spontaneous Decay, Activity (A=λN), Half-Life (λ=ln2/t_½) & Exponential Decay Equations (N=N0e^(-λt))",
        ],
      },
      {
        topicName: "Topic 10 (5.5): Oscillations",
        subtopics: [
          "5.5.1 (Spec 143-147, 150): Simple Harmonic Motion (F=-kx, a=-ω²x), SHM Equations & Graphs (x, v, a), Mass-Spring/Pendulum Periods & Energy in SHM",
          "5.5.2 (Spec 148-153): Free vs Forced Oscillations, Damping, Resonance, Plastic Deformation Damping & Core Practical 16",
        ],
      },
      {
        topicName: "Topic 11 (5.6): Astrophysics and Cosmology",
        subtopics: [
          "5.6.1 (Spec 154-160): Gravitational Fields (g=F/m, g=Gm/r²), Universal Gravitation, Gravitational Potential (V_grav=-Gm/r), Field Comparisons & Orbital Motion",
          "5.6.2 (Spec 161-164, 167-168): Black Body Radiation, Stefan-Boltzmann Law (L=σAT⁴), Wien's Law, Inverse-Square Intensity (I=L/4πd²), H-R Diagrams & Stellar Evolution",
          "5.6.3 (Spec 165-166, 169-171): Astronomical Distances (Trigonometric Parallax & Standard Candles), Doppler Redshift, Hubble's Law (v=H0d), Age/Fate of Universe & Dark Matter",
        ],
      },
    ],
  },
  {
    unitCode: "WPH16",
    unitName: "Unit 6",
    title: "Practical Skills in Physics II",
    topics: [
      {
        topicName: "Unit 6 Practical Skills: Advanced Experimental Planning, Implementation & Data Analysis (A2)",
        subtopics: [
          "6.3: Advanced Experimental Planning: Apparatus Dimensions/Resolution, Calibration, Control Variables, Repeat Readings & Safety",
          "6.4: Implementation & Measurements: Error Reduction Techniques (Markers, Set Squares), Table Rounding/Units & Inconsistent Readings",
          "6.5: Advanced Data Analysis: Logarithmic/Power-Law Graph Linearisation, Precision/Accuracy/Sensitivity, Compounding Percentage Uncertainties & Core Practicals 9–16",
        ],
      },
    ],
  },
];

export const OFFICIAL_IAL_MATHEMATICS_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: "WMA11",
    unitName: "Unit 1: Pure Mathematics 1 (P1)",
    title: "Pure Mathematics 1 (P1)",
    topics: [
      {
        topicName: "P1 Topic 1: Algebra and Functions",
        subtopics: [
          "P1 1.1-1.2: Laws of Indices & Manipulation/Rationalisation of Surds",
          "P1 1.3-1.5: Quadratic Functions, Graphs, Discriminant (b²-4ac) & Completing the Square",
          "P1 1.6-1.9: Simultaneous Equations (Linear/Quadratic) & Linear/Quadratic Inequalities (Algebraic & Graphical Shading)",
          "P1 1.10-1.11: Polynomial Manipulation/Factorisation & Sketching Cubic and Reciprocal Curves (y=k/x, y=k/x², Asymptotes)",
          "P1 1.12: Single Graph Transformations (y=af(x), y=f(x)+a, y=f(x+a), y=f(ax))",
        ],
      },
      {
        topicName: "P1 Topic 2: Coordinate Geometry in the (x, y) Plane",
        subtopics: [
          "P1 2.1: Equations of Straight Lines (y-y1=m(x-x1), ax+by+c=0), Gradients & Intercepts",
          "P1 2.2: Parallel & Perpendicular Straight Lines and Geometric Line Intersection Problems",
        ],
      },
      {
        topicName: "P1 Topic 3: Trigonometry",
        subtopics: [
          "P1 3.1: Sine Rule (including Ambiguous Case), Cosine Rule & Area of a Triangle (½ab sinC)",
          "P1 3.2: Radian Measure, Arc Length (s=rθ) & Area of a Sector (A=½r²θ)",
          "P1 3.3: Sine, Cosine & Tangent Graphs, Symmetries, Periodicity & Transformed Trig Sketching",
        ],
      },
      {
        topicName: "P1 Topic 4: Differentiation",
        subtopics: [
          "P1 4.1-4.2: Differentiating x^n (Sums, Differences, Multiples), First/Second Derivatives (f'(x), f''(x)) & Rates of Change",
          "P1 4.3: Gradients, Equations of Tangents and Normals to Curves",
        ],
      },
      {
        topicName: "P1 Topic 5: Integration",
        subtopics: [
          "P1 5.1-5.2a: Indefinite Integration of x^n (n ≠ -1) & Simplifying Expressions Before Integrating",
          "P1 5.2b: Finding the Equation of a Curve y=f(x) Given f'(x) and a Point on the Curve",
        ],
      },
    ],
  },
  {
    unitCode: "WMA12",
    unitName: "Unit 2: Pure Mathematics 2 (P2)",
    title: "Pure Mathematics 2 (P2)",
    topics: [
      {
        topicName: "P2 Topic 1: Proof",
        subtopics: [
          "P2 1.1-1.3: Structure of Mathematical Proof, Proof by Exhaustion & Disproof by Counter-Example",
        ],
      },
      {
        topicName: "P2 Topic 2: Algebra and Functions",
        subtopics: [
          "P2 2.1: Algebraic Division by (ax±b), Factor Theorem, Remainder Theorem & Factorising Cubics",
        ],
      },
      {
        topicName: "P2 Topic 3: Coordinate Geometry in the (x, y) Plane",
        subtopics: [
          "P2 3.1: Coordinate Geometry of the Circle ((x-a)²+(y-b)²=r²) & Circle Theorems (Semicircle, Chord Bisector, Radius-Tangent)",
        ],
      },
      {
        topicName: "P2 Topic 4: Sequences and Series",
        subtopics: [
          "P2 4.1 & 4.3: Nth Term Formulae, Recurrence Relations x_{n+1}=f(x_n) & Increasing, Decreasing and Periodic Sequences",
          "P2 4.2: Arithmetic Sequences & Series (Nth Term, Sum of n Terms, Sum Proof & Sigma Σ Notation)",
          "P2 4.4: Geometric Sequences & Series (Nth Term, Finite Sum, Sum Proof & Sum to Infinity for |r|<1)",
          "P2 4.5: Binomial Expansion of (a+bx)^n for Positive Integer n",
        ],
      },
      {
        topicName: "P2 Topic 5: Exponentials and Logarithms",
        subtopics: [
          "P2 5.1-5.2: Exponential Functions/Graphs (y=a^x) & Laws of Logarithms",
          "P2 5.3: Solving Exponential & Logarithmic Equations (a^x=b) and Change of Base",
        ],
      },
      {
        topicName: "P2 Topic 6: Trigonometry",
        subtopics: [
          "P2 6.1: Trigonometric Identities (tanθ ≡ sinθ/cosθ and sin²θ + cos²θ ≡ 1) & Proofs",
          "P2 6.2: Solving Trigonometric Equations in a Given Interval (Linear, Multiple-Angle & Quadratic Trig Equations)",
        ],
      },
      {
        topicName: "P2 Topic 7: Differentiation",
        subtopics: [
          "P2 7.1a: Increasing & Decreasing Functions, Stationary Points & Nature of Turning Points (Maxima/Minima)",
          "P2 7.1b: Practical Optimisation & Modelling Problems Using Maxima and Minima",
        ],
      },
      {
        topicName: "P2 Topic 8: Integration",
        subtopics: [
          "P2 8.1-8.2: Definite Integration & Area Bounded by Curves and Straight Lines",
          "P2 8.3: Numerical Integration Using the Trapezium Rule & Overestimate/Underestimate Analysis",
        ],
      },
    ],
  },
  {
    unitCode: "WMA13",
    unitName: "Unit 3: Pure Mathematics 3 (P3)",
    title: "Pure Mathematics 3 (P3)",
    topics: [
      {
        topicName: "P3 Topic 1: Algebra and Functions",
        subtopics: [
          "P3 1.1: Simplifying Rational Expressions, Factorising/Cancelling & Algebraic Division",
          "P3 1.2: Functions: Domain & Range, One-to-One/Many-to-One Mappings, Composite (fg) & Inverse Functions (f^-1)",
          "P3 1.3-1.4: Modulus Function (y=|f(x)|, y=f(|x|), |ax+b| Equations/Inequalities) & Combined Transformations",
        ],
      },
      {
        topicName: "P3 Topic 2: Trigonometry",
        subtopics: [
          "P3 2.1-2.2: Secant, Cosecant, Cotangent, Inverse Trig (arcsin, arccos, arctan) & Pythagorean Identities (sec²θ, cosec²θ)",
          "P3 2.3a: Compound Angle (sin(A±B), cos(A±B), tan(A±B)) & Double/Half Angle Formulae",
          "P3 2.3b: Harmonic Form Expressions (a cosθ + b sinθ ≡ R cos(θ±α) or R sin(θ±α)), Maxima/Minima & Equations",
        ],
      },
      {
        topicName: "P3 Topic 3: Exponentials and Logarithms",
        subtopics: [
          "P3 3.1-3.2: Functions e^x and ln x, Graphs of y=e^(ax+b)+c, Inverse Relationship & Exact Equations",
          "P3 3.3: Logarithmic Graphs & Linear Reduction for Power Laws (y=ax^n) and Exponential Models (y=kb^x)",
        ],
      },
      {
        topicName: "P3 Topic 4: Differentiation",
        subtopics: [
          "P3 4.1 & 4.3: Differentiating e^(kx), ln(kx), a^x, sin(kx), cos(kx), tan(kx) & Using dy/dx = 1/(dx/dy)",
          "P3 4.2: Product Rule, Quotient Rule, Chain Rule & Differentiating sec x, cosec x, cot x",
          "P3 4.4: Exponential Growth and Decay Modelling, Rates of Change & Model Limitations",
        ],
      },
      {
        topicName: "P3 Topic 5: Integration",
        subtopics: [
          "P3 5.1: Integrating Standard Functions (e^(kx), 1/x, sin(kx), cos(kx), sec²(kx), a^x)",
          "P3 5.2: Reverse Chain Rule (∫f'(x)/f(x) dx = ln|f(x)|, ∫f'(x)[f(x)]^n dx) & Trig Identity Integration (sin²x, cos²x, tan²x)",
        ],
      },
      {
        topicName: "P3 Topic 6: Numerical Methods",
        subtopics: [
          "P3 6.1-6.2: Locating Roots by Change of Sign, Fixed-Point Iteration x_{n+1}=f(x_n) & Cobweb/Staircase Diagrams",
        ],
      },
    ],
  },
  {
    unitCode: "WMA14",
    unitName: "Unit 4: Pure Mathematics 4 (P4)",
    title: "Pure Mathematics 4 (P4)",
    topics: [
      {
        topicName: "P4 Topic 1: Proof",
        subtopics: [
          "P4 1.1: Proof by Contradiction (Irrationality of √2, Infinity of Primes & Unfamiliar Proofs)",
        ],
      },
      {
        topicName: "P4 Topic 2: Algebra and Functions",
        subtopics: [
          "P4 2.1: Partial Fractions (Distinct Linear Factors, Repeated Linear Factors & Improper Rational Functions)",
        ],
      },
      {
        topicName: "P4 Topic 3: Coordinate Geometry in the (x, y) Plane",
        subtopics: [
          "P4 3.1: Parametric Equations of Curves, Parametric-to-Cartesian Conversion & Curve Intersections",
        ],
      },
      {
        topicName: "P4 Topic 4: Binomial Expansion",
        subtopics: [
          "P4 4.1: Binomial Series Expansion of (ax+b)^n for Rational n, Validity (|x|<b/a) & Partial Fraction Expansions",
        ],
      },
      {
        topicName: "P4 Topic 5: Differentiation",
        subtopics: [
          "P4 5.1: Implicit Differentiation & Parametric Differentiation (including Tangents, Normals & Stationary Points)",
          "P4 5.2: Connected Rates of Change & Forming Differential Equations",
        ],
      },
      {
        topicName: "P4 Topic 6: Integration",
        subtopics: [
          "P4 6.1 & 6.5: Area Under Parametric Curves & Volumes of Revolution (π∫y² dx, Cartesian & Parametric)",
          "P4 6.2a: Integration by Substitution",
          "P4 6.2b: Integration by Parts (Single & Repeated Applications, including ∫ln x dx)",
          "P4 6.3: Integration Using Partial Fractions",
          "P4 6.4: Analytical Solution of First-Order Separable Differential Equations (General & Particular Solutions)",
        ],
      },
      {
        topicName: "P4 Topic 7: Vectors",
        subtopics: [
          "P4 7.1-7.5: 2D & 3D Vectors, Magnitude, Unit Vectors, Position Vectors & Distance Between Points",
          "P4 7.6: Vector Equations of Straight Lines (r=a+tb) & Parallel, Intersecting or Skew Lines",
          "P4 7.7: Scalar (Dot) Product, Angle Between Two Vectors/Lines, Perpendicularity & Shortest Distance",
        ],
      },
    ],
  },
  {
    unitCode: "WME01",
    unitName: "Unit 5: Mechanics 1 (M1)",
    title: "Mechanics 1 (M1)",
    topics: [
      {
        topicName: "M1 Topic 1 & 2: Mathematical Models and Vectors in Mechanics",
        subtopics: [
          "M1 1.1 & 2.1-2.2: Modelling Assumptions & 2D Vectors (Magnitude, Direction, i/j Components, Velocity/Force Resultants)",
        ],
      },
      {
        topicName: "M1 Topic 3: Kinematics of a Particle Moving in a Straight Line",
        subtopics: [
          "M1 3.1a: Constant Acceleration Formulae (SUVAT) in Horizontal & Vertical Free-Fall Motion",
          "M1 3.1b: Kinematics Graphs (Displacement-Time, Velocity-Time, Speed-Time & Acceleration-Time Graphs)",
        ],
      },
      {
        topicName: "M1 Topic 4: Dynamics of a Particle Moving in a Straight Line or Plane",
        subtopics: [
          "M1 4.1 & 4.4: Newton's Laws of Motion (F=ma), Resolving Forces, Inclined Planes & Dynamic Friction (F=μR)",
          "M1 4.2: Connected Particles: Tow-Bars, Lift Problems & Smooth Fixed Pulleys/Pegs",
          "M1 4.3: Momentum, Impulse (I=mv-mu) & Direct Collisions (Conservation of Linear Momentum)",
        ],
      },
      {
        topicName: "M1 Topic 5: Statics of a Particle",
        subtopics: [
          "M1 5.1-5.3: Equilibrium of a Particle Under Coplanar Forces, Tension, Thrust & Limiting Friction (F ≤ μR)",
        ],
      },
      {
        topicName: "M1 Topic 6: Moments",
        subtopics: [
          "M1 6.1: Moments of Coplanar Parallel Forces, Uniform/Non-Uniform Rigid Rods in Equilibrium & Tilting/Point of Slipping",
        ],
      },
    ],
  },
  {
    unitCode: "WST01",
    unitName: "Unit 6: Statistics 1 (S1)",
    title: "Statistics 1 (S1)",
    topics: [
      {
        topicName: "S1 Topic 1 & 2: Mathematical Models and Representation & Summary of Data",
        subtopics: [
          "S1 1.1 & 2.1: Statistical Modelling, Histograms, Stem & Leaf Diagrams (including Back-to-Back) & Box Plots",
          "S1 2.2-2.4: Mean, Median, Quartiles (Interpolation), Variance, Standard Deviation, Linear Coding, Outliers & Skewness",
        ],
      },
      {
        topicName: "S1 Topic 3: Probability",
        subtopics: [
          "S1 3.1-3.3: Sample Spaces, Venn Diagrams, Mutually Exclusive & Independent Events, Addition & Conditional Probability Laws",
          "S1 3.4: Tree Diagrams & Sampling With and Without Replacement",
        ],
      },
      {
        topicName: "S1 Topic 4: Correlation and Regression",
        subtopics: [
          "S1 4.1-4.2: Scatter Diagrams, Explanatory/Response Variables, Least Squares Linear Regression (y on x, Coding) & Interpolation/Extrapolation",
          "S1 4.3: Product Moment Correlation Coefficient (PMCC r), Calculation, Interpretation & Limitations",
        ],
      },
      {
        topicName: "S1 Topic 5: Discrete Random Variables",
        subtopics: [
          "S1 5.1-5.2: Probability Distribution Function p(x) & Cumulative Distribution Function F(x0)",
          "S1 5.3-5.4: Expectation E(X), E(X²), Variance Var(X), Linear Transformations E(aX+b)/Var(aX+b) & Discrete Uniform Distribution",
        ],
      },
      {
        topicName: "S1 Topic 6: The Normal Distribution",
        subtopics: [
          "S1 6.1a: Normal Distribution N(μ, σ²), Standardisation Z=(X-μ)/σ & Finding Probabilities/Values Using Normal Tables",
          "S1 6.1b: Finding Unknown Mean (μ), Standard Deviation (σ), or Both Using Simultaneous Equations from Percentage Points",
        ],
      },
    ],
  },
];

export interface SubtopicGroup {
  topicName: string;
  subtopics: {
    name: string;
    count: number;
  }[];
}

/**
 * Returns the canonical taxonomy for a given subject.
 */
export function getTaxonomyForSubject(subject: 'chemistry' | 'physics' | 'mathematics'): UnitDefinition[] {
  if (subject === 'physics') return OFFICIAL_IAL_PHYSICS_TAXONOMY;
  if (subject === 'mathematics') return OFFICIAL_IAL_MATHEMATICS_TAXONOMY;
  return OFFICIAL_IAL_CHEMISTRY_TAXONOMY;
}

/**
 * Helper to check whether a taxonomy unit definition matches a unit filter string.
 * Supports exact unitName, unitCode, title, or prefix matching (e.g. "Unit 1" matches "Unit 1: Pure Mathematics 1 (P1)").
 */
export function isUnitMatch(unitDef: UnitDefinition, filterUnit: string): boolean {
  if (!filterUnit) return false;
  const fLower = filterUnit.trim().toLowerCase();
  const uNameLower = unitDef.unitName.trim().toLowerCase();
  const uCodeLower = unitDef.unitCode.trim().toLowerCase();
  const uTitleLower = unitDef.title.trim().toLowerCase();

  // Exact match with unitName, unitCode, or title
  if (uNameLower === fLower || uCodeLower === fLower || uTitleLower === fLower) {
    return true;
  }

  // Prefix match (e.g. "Unit 1" matching "Unit 1: Pure Mathematics 1 (P1)")
  const uPrefix = uNameLower.split(':')[0].trim();
  const fPrefix = fLower.split(':')[0].trim();
  if (uPrefix && fPrefix && uPrefix === fPrefix) {
    return true;
  }

  // Substring / containment match
  if (fLower.includes(uCodeLower) || uNameLower.includes(fLower)) {
    return true;
  }

  return false;
}

// Precomputed lookup table mapping every canonical subtopic to its strict parent UnitDefinition
const SUBTOPIC_UNIT_LOOKUP = new Map<string, UnitDefinition>();
for (const tax of [
  OFFICIAL_IAL_CHEMISTRY_TAXONOMY,
  OFFICIAL_IAL_PHYSICS_TAXONOMY,
  OFFICIAL_IAL_MATHEMATICS_TAXONOMY,
]) {
  for (const unitDef of tax) {
    for (const topic of unitDef.topics) {
      for (const s of topic.subtopics) {
        SUBTOPIC_UNIT_LOOKUP.set(s, unitDef);
      }
    }
  }
}

/**
 * Checks whether a subtopic strictly belongs to the given question's Unit.
 * Prevents any cross-unit secondary subtopic bleed (e.g. a Unit 5 question matching a Unit 1 subtopic).
 */
export function isSubtopicValidForQuestionUnit(
  subtopic: string,
  questionUnit?: string,
  questionUnitCode?: string
): boolean {
  if (!subtopic) return false;
  const unitDef = SUBTOPIC_UNIT_LOOKUP.get(subtopic);
  if (!unitDef) return false;

  if (questionUnit && isUnitMatch(unitDef, questionUnit)) {
    return true;
  }
  if (questionUnitCode && isUnitMatch(unitDef, questionUnitCode)) {
    return true;
  }
  if (!questionUnit && !questionUnitCode) {
    return true;
  }
  return false;
}

/**
 * Builds the canonical subtopic hierarchy based strictly on the official specification taxonomy.
 * Subtopics are permanently locked to their official parent topic and unit.
 * Question counts are dynamically calculated from the questions dataset, strictly scoped by unit.
 */
export function buildStaticSubtopicHierarchy(
  unitFilter: string | string[],
  questions: { mainSubtopic?: string; subtopic?: string; subtopics?: string[]; unit?: string; unitCode?: string; paperId?: string }[],
  subject?: 'chemistry' | 'physics' | 'mathematics',
  primarySubtopicsOnly: boolean = false
): SubtopicGroup[] {
  // Normalize unitFilter to an array of unit identifiers
  const unitList: string[] = Array.isArray(unitFilter)
    ? unitFilter
    : (!unitFilter || unitFilter === 'all' ? [] : [unitFilter]);

  // Determine taxonomy: explicit subject or auto-detect from questions
  let taxonomy = OFFICIAL_IAL_CHEMISTRY_TAXONOMY;
  if (subject === 'physics') {
    taxonomy = OFFICIAL_IAL_PHYSICS_TAXONOMY;
  } else if (subject === 'mathematics') {
    taxonomy = OFFICIAL_IAL_MATHEMATICS_TAXONOMY;
  } else if (!subject && questions.length > 0) {
    const isMath = questions.some((q) => {
      const code = (q.unitCode || '').toUpperCase();
      const pid = (q.paperId || '').toLowerCase();
      return (
        code.startsWith('WMA') ||
        code.startsWith('WME') ||
        code.startsWith('WST') ||
        pid.startsWith('wma') ||
        pid.startsWith('wme') ||
        pid.startsWith('wst')
      );
    });
    const isPhys = questions.some((q) => {
      const code = (q.unitCode || '').toUpperCase();
      const pid = (q.paperId || '').toLowerCase();
      return code.startsWith('WPH') || pid.startsWith('wph');
    });

    if (isMath) {
      taxonomy = OFFICIAL_IAL_MATHEMATICS_TAXONOMY;
    } else if (isPhys) {
      taxonomy = OFFICIAL_IAL_PHYSICS_TAXONOMY;
    }
  }

  // Precompute subtopic frequency across the questions (strictly unit-scoped)
  const subtopicCounts = new Map<string, number>();
  for (const q of questions) {
    if (unitList.length > 0 && q.unit) {
      const qUnit = q.unit;
      const matchesAnyUnit = unitList.some((filterUnit) => {
        if (filterUnit === qUnit) return true;
        const qPrefix = qUnit.split(':')[0].trim().toLowerCase();
        const fPrefix = filterUnit.split(':')[0].trim().toLowerCase();
        return qPrefix === fPrefix;
      });
      if (!matchesAnyUnit) continue;
    }
    const primarySub = q.mainSubtopic || q.subtopic || (q.subtopics && q.subtopics[0]) || '';
    const rawSubs = primarySubtopicsOnly
      ? (primarySub ? [primarySub] : [])
      : (q.subtopics && q.subtopics.length > 0 ? q.subtopics : (primarySub ? [primarySub] : []));
    const seen = new Set<string>();
    for (const s of rawSubs) {
      if (!s || seen.has(s)) continue;
      if (!isSubtopicValidForQuestionUnit(s, q.unit, q.unitCode)) continue;
      seen.add(s);
      subtopicCounts.set(s, (subtopicCounts.get(s) || 0) + 1);
    }
  }

  // Filter unit definitions
  const relevantUnits = unitList.length === 0
    ? taxonomy
    : taxonomy.filter(
        (u) => unitList.some((filterUnit) => isUnitMatch(u, filterUnit))
      );

  const groups: SubtopicGroup[] = [];

  for (const unit of relevantUnits) {
    for (const topic of unit.topics) {
      const subList = topic.subtopics.map((sName) => ({
        name: sName,
        count: subtopicCounts.get(sName) || 0,
      }));

      groups.push({
        topicName: topic.topicName,
        subtopics: subList,
      });
    }
  }

  return groups;
}

/**
 * Resolves the canonical parent topic for any subtopic string across Mathematics, Physics, and Chemistry.
 */
export function getParentTopicForSubtopic(subtopic: string): string {
  for (const unit of OFFICIAL_IAL_MATHEMATICS_TAXONOMY) {
    for (const topic of unit.topics) {
      if (topic.subtopics.includes(subtopic)) {
        return topic.topicName;
      }
    }
  }
  for (const unit of OFFICIAL_IAL_PHYSICS_TAXONOMY) {
    for (const topic of unit.topics) {
      if (topic.subtopics.includes(subtopic)) {
        return topic.topicName;
      }
    }
  }
  for (const unit of OFFICIAL_IAL_CHEMISTRY_TAXONOMY) {
    for (const topic of unit.topics) {
      if (topic.subtopics.includes(subtopic)) {
        return topic.topicName;
      }
    }
  }
  return 'General';
}

/**
 * Resolves the canonical Unit for any subtopic string across Mathematics, Physics, and Chemistry.
 */
export function getUnitForSubtopic(subtopic: string): string {
  for (const unit of OFFICIAL_IAL_MATHEMATICS_TAXONOMY) {
    for (const topic of unit.topics) {
      if (topic.subtopics.includes(subtopic)) {
        return unit.unitName;
      }
    }
  }
  for (const unit of OFFICIAL_IAL_PHYSICS_TAXONOMY) {
    for (const topic of unit.topics) {
      if (topic.subtopics.includes(subtopic)) {
        return unit.unitName;
      }
    }
  }
  for (const unit of OFFICIAL_IAL_CHEMISTRY_TAXONOMY) {
    for (const topic of unit.topics) {
      if (topic.subtopics.includes(subtopic)) {
        return unit.unitName;
      }
    }
  }
  return 'Unit 1';
}
