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
          '1.1-1.4: Moles, Avogadro Constant & Molar Mass',
          '1.5-1.6: Empirical & Molecular Formulae',
          '1.7-1.8: Reacting Masses, Gas Volumes & pV=nRT',
          '1.9-1.10: Solutions, Concentrations & Titration Calculations',
          '1.11-1.12: Atom Economy & Percentage Yield',
        ],
      },
      {
        topicName: 'Topic 2: Atomic Structure and the Periodic Table',
        subtopics: [
          '2.1-2.2: Subatomic Particles, Isotopes & Relative Masses',
          '2.3-2.5: Mass Spectrometry & Isotope Abundances',
          '2.6-2.7: Atomic Orbitals & Electronic Configurations',
          '2.8-2.9: Ionisation Energies & Evidence for Quantum Shells',
          '2.10-2.11: Periodic Trends across Periods 2 & 3',
        ],
      },
      {
        topicName: 'Topic 3: Bonding and Structure',
        subtopics: [
          '3A: Ionic Bonding & Nature of Ionic Lattices',
          '3B: Covalent & Dative Covalent Bonding',
          '3C: Shapes of Molecules & Electron-Pair Repulsion Theory',
          '3D: Electronegativity & Bond Polarity',
          '3E: Metallic Bonding & Giant Structures',
        ],
      },
      {
        topicName: 'Topic 4: Introductory Organic Chemistry and Alkanes',
        subtopics: [
          '4.1-4.3: IUPAC Nomenclature & Functional Groups',
          '4.4-4.5: Structural Isomerism (Chain, Position, Functional)',
          '4.6-4.7: Fractional Distillation, Cracking & Fuel Economics',
          '4.8-4.9: Combustion & Environmental Impact (Pollutants)',
          '4.10-4.11: Free Radical Substitution of Alkanes & Reaction Steps',
        ],
      },
      {
        topicName: 'Topic 5: Alkenes',
        subtopics: [
          '5.1-5.2: Structure & Bonding in Alkenes (Sigma & Pi Bonds)',
          '5.3-5.4: Geometric Isomerism (E/Z & CIP Priority Rules)',
          '5.5: Addition Reactions of Alkenes (Halogens, Hydrogen Halides, Steam, KMnO4)',
          '5.6: Electrophilic Addition Mechanism & Carbocation Stability',
          '5.7-5.8: Addition Polymers & Waste Polymer Management',
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
          '6.1-6.3: Standard Enthalpy Changes (Reaction, Formation, Combustion, Neutralisation)',
          '6.4-6.5: Calorimetry & Experimental Enthalpy Determinations',
          '6.6-6.8: Hess\'s Law & Enthalpy Cycles',
          '6.9-6.10: Bond Enthalpies & Mean Bond Enthalpies',
        ],
      },
      {
        topicName: 'Topic 7: Intermolecular Forces',
        subtopics: [
          '7.1-7.2: London Dispersion Forces & Dipole-Dipole Interactions',
          '7.3-7.4: Hydrogen Bonding & Anomalous Properties of Water',
          '7.5-7.6: Physical Properties & Solvent Interactions',
        ],
      },
      {
        topicName: 'Topic 8: Redox Chemistry and Groups 1, 2 and 7',
        subtopics: [
          '8.1-8.3: Oxidation Numbers & Redox Half-Equations',
          '8.4-8.6: Group 2 Physical & Chemical Trends (Reactivity, Hydroxides, Sulfates)',
          '8.7-8.9: Thermal Stability of Nitrates & Carbonates',
          '8.10-8.11: Flame Tests & Origin of Flame Colours',
          '8.12-8.15: Group 7 Trends & Halogen-Halide Displacement',
          '8.16-8.18: Reactions of Halide Ions with H2SO4 & Silver Nitrate Testing',
          '8.19-8.20: Disproportionation of Chlorine & Water Treatment',
        ],
      },
      {
        topicName: 'Topic 9: Introduction to Kinetics and Equilibria',
        subtopics: [
          '9.1-9.3: Collision Theory, Activation Energy & Catalyst Action',
          '9.4-9.5: Maxwell-Boltzmann Distribution & Temperature Effects',
          '9.6-9.8: Dynamic Chemical Equilibrium & Le Chatelier\'s Principle',
          '9.9-9.10: Industrial Equilibrium Compromise (Haber & Contact Processes)',
        ],
      },
      {
        topicName: 'Topic 10: Organic Chemistry: Halogenoalkanes, Alcohols and Spectra',
        subtopics: [
          '10A: Classification & Reactions of Halogenoalkanes (Nucleophilic Substitution)',
          '10B: SN1 and SN2 Reaction Mechanisms',
          '10C: Elimination Reactions of Halogenoalkanes',
          '10D: Mass Spectrometry & Infrared (IR) Spectroscopy',
          '10E: Alcohols: Classification, Combustion & Oxidation (Primary, Secondary, Tertiary)',
          '10F: Halogenation & Dehydration of Alcohols',
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
        topicName: 'Topic 11: Core Practicals & Laboratory Techniques',
        subtopics: [
          '11.1: Volumetric Analysis (Standard Solutions & Acid-Base Titrations)',
          '11.2: Enthalpy Determination in the Laboratory (Solution & Combustion)',
          '11.3: Qualitative Inorganic Analysis (Flame Tests, Halides, Cations, Gases)',
          '11.4: Qualitative Organic Analysis (Tests for Alkenes, Haloalkanes, Alcohols)',
          '11.5: Preparation & Purification of Organic Liquids (Reflux, Distillation, Drying)',
          '11.6: Measurement Errors, Uncertainties & Accuracy Analysis',
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
        topicName: 'Topic 12: Kinetics',
        subtopics: [
          '12.1-12.3: Rate Equations, Orders of Reaction & Rate Constant (k)',
          '12.4-12.5: Arrhenius Equation & Activation Energy Calculations',
        ],
      },
      {
        topicName: 'Topic 13: Entropy and Energetics',
        subtopics: [
          '13.1-13.3: Lattice Energy & Born-Haber Cycles',
          '13.4-13.6: Entropy & Gibbs Free Energy',
        ],
      },
      {
        topicName: 'Topic 14: Chemical Equilibria',
        subtopics: [
          '14.1-14.3: Equilibrium Constants Kc and Kp',
        ],
      },
      {
        topicName: 'Topic 15: Acid-Base Equilibria',
        subtopics: [
          '15.1-15.3: Brønsted-Lowry Acids, pH, Kw, Ka and Buffer Solutions',
        ],
      },
      {
        topicName: 'Topic 16: Carbonyls, Carboxylic Acids and Chiral Molecules',
        subtopics: [
          '16.1-16.3: Optical Isomerism & Chirality',
          '16.4-16.6: Aldehydes, Ketones & Nucleophilic Addition',
          '16.7-16.9: Carboxylic Acids, Esters & Acyl Chlorides',
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
        topicName: 'Topic 17: Redox and Electrode Potentials',
        subtopics: [
          '17.1-17.3: Standard Electrode Potentials & Electrochemical Cells',
        ],
      },
      {
        topicName: 'Topic 18: Transition Metals and their Chemistry',
        subtopics: [
          '18.1-18.4: Transition Metal Characteristics, Complexes & Ligands',
          '18.5-18.7: Color, Catalysis & Redox Titrations (MnO4-, Cr2O7 2-)',
        ],
      },
      {
        topicName: 'Topic 19: Organic Nitrogen Chemistry',
        subtopics: [
          '19.1-19.3: Arenes (Benzene Structure & Electrophilic Aromatic Substitution)',
          '19.4-19.6: Amines, Amides, Amino Acids & Proteins',
          '19.7-19.8: Organic Synthesis & Multi-step Reaction Pathways',
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
        topicName: 'Topic 20: Advanced Practical Techniques',
        subtopics: [
          '20.1: Transition Metal Ion Qualitative Analysis & Precipitation',
          '20.2: Organic Synthesis, Recrystallisation & Melting Point Determination',
          '20.3: Electrochemical & Spectrophotometric Techniques',
          '20.4: Advanced Spectroscopic Analysis (1H and 13C NMR, IR, Mass Spec)',
        ],
      },
    ],
  },
];

export const OFFICIAL_IAL_PHYSICS_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: 'WPH11',
    unitName: 'Unit 1',
    title: 'Mechanics and Materials',
    topics: [
      {
        topicName: 'Topic 1: Mechanics',
        subtopics: [
          '1.1: Physical Quantities, SI Units & Vectors',
          '1.2: Kinematics, Motion Graphs & SUVAT Equations',
          '1.3: Projectile Motion & Trajectory Analysis',
          '1.4: Newton\'s Laws of Motion, Momentum & Impulse',
          '1.5: Forces in Equilibrium, Moments & Centre of Gravity',
          '1.6: Work, Kinetic & Potential Energy, Power & Efficiency',
        ],
      },
      {
        topicName: 'Topic 2: Materials',
        subtopics: [
          '2.1: Density, Upthrust, Archimedes\' Principle & Fluid Flow',
          '2.2: Viscosity, Temperature Effects, Stokes\' Law & Terminal Velocity',
          '2.3: Hooke\'s Law, Elastic & Plastic Deformation',
          '2.4: Stress, Strain, Young Modulus & Force-Extension Graphs',
          '2.5: Material Properties (Brittle, Ductile, Tough, Hard, Malleable)',
        ],
      },
    ],
  },
  {
    unitCode: 'WPH12',
    unitName: 'Unit 2',
    title: 'Waves and Electricity',
    topics: [
      {
        topicName: 'Topic 3: Waves and the Particle Nature of Light',
        subtopics: [
          '3.1: Wave Properties (Transverse & Longitudinal, Amplitude, Frequency, Wavelength, Wave Equation)',
          '3.2: Refraction, Reflection & Total Internal Reflection (Snell\'s Law, Critical Angle)',
          '3.3: Superposition & Interference (Path Difference, Phase Difference, Two-Source Interference, Young\'s Double Slit)',
          '3.4: Stationary Waves (Nodes, Antinodes, Harmonics on strings and in air columns)',
          '3.5: Diffraction (Diffraction gratings, Single slit, n*lambda = d*sin(theta))',
          '3.6: Polarization (Malus\' Law, Applications of polarized light)',
          '3.7: Pulse-Echo Techniques & Ultrasound',
          '3.8: Photons & The Photoelectric Effect (Work function, Threshold frequency, Einstein\'s Photoelectric Equation)',
          '3.9: Wave-Particle Duality & De Broglie Wavelength',
          '3.10: Atomic Line Spectra & Energy Levels (Photon emission/absorption, Transition equations)',
        ],
      },
      {
        topicName: 'Topic 4: Electric Circuits',
        subtopics: [
          '4.1: Electric Current, Charge & Drift Velocity (I = nqvA)',
          '4.2: Potential Difference, EMF & Electrical Energy/Power (P = VI, P = I^2*R, W = VQ)',
          '4.3: Resistance, Ohm\'s Law & I-V Characteristics (Ohmic conductors, Filament lamps, Diodes)',
          '4.4: Resistivity & Temperature Effects (R = rho*L/A, Thermistors, Superconductivity)',
          '4.5: Series and Parallel Circuits (Kirchhoff\'s First and Second Laws, Equivalent resistance)',
          '4.6: Potential Dividers & Sensor Circuits (LDRs, NTC thermistors, Potentiometers)',
          '4.7: Internal Resistance & Terminal Potential Difference (E = V + Ir, Load resistance matching)',
        ],
      },
    ],
  },
  {
    unitCode: 'WPH13',
    unitName: 'Unit 3',
    title: 'Practical Skills in Physics I',
    topics: [
      {
        topicName: 'Topic 5: Practical Skills and Techniques I',
        subtopics: [
          '5.1: Experimental Planning, Apparatus & Core Practicals (AS)',
          '5.2: Measurement Uncertainties, Errors & Percentage Uncertainties',
          '5.3: Graphical Analysis, Error Propagation & Evaluation of Results',
        ],
      },
    ],
  },
  {
    unitCode: 'WPH14',
    unitName: 'Unit 4',
    title: 'Further Mechanics, Fields and Particles',
    topics: [
      {
        topicName: 'Topic 6: Further Mechanics',
        subtopics: [
          '6.1: 2D Momentum, Elastic & Inelastic Collisions',
          '6.2: Circular Motion, Centripetal Acceleration & Centripetal Force',
        ],
      },
      {
        topicName: 'Topic 7: Electric and Magnetic Fields',
        subtopics: [
          '7.1: Electric Fields, Coulomb\'s Law, Field Strength & Potential',
          '7.2: Capacitors, Charging/Discharging & Energy Stored',
          '7.3: Magnetic Fields, Force on Moving Charges & Fleming\'s Left-Hand Rule',
          '7.4: Electromagnetic Induction, Magnetic Flux, Faraday\'s & Lenz\'s Laws',
        ],
      },
      {
        topicName: 'Topic 8: Particle Physics',
        subtopics: [
          '8.1: Particle Accelerators (Linacs, Cyclotrons) & Detectors',
          '8.2: Standard Model (Quarks, Leptons, Hadrons) & Conservation Laws',
        ],
      },
    ],
  },
  {
    unitCode: 'WPH15',
    unitName: 'Unit 5',
    title: 'Thermodynamics, Radiation, Oscillations and Cosmology',
    topics: [
      {
        topicName: 'Topic 9: Thermodynamics',
        subtopics: [
          '9.1: Specific Heat Capacity, Latent Heat & Internal Energy',
          '9.2: Ideal Gas Laws, pV = NkT & Kinetic Theory Model',
        ],
      },
      {
        topicName: 'Topic 10: Nuclear Radiation and Decay',
        subtopics: [
          '10.1: Alpha, Beta & Gamma Radiation, Radioactive Decay & Half-life',
          '10.2: Nuclear Binding Energy, Mass Defect, Fission & Fusion',
        ],
      },
      {
        topicName: 'Topic 11: Oscillations',
        subtopics: [
          '11.1: Simple Harmonic Motion (SHM) Kinematics & Energy Transfers',
          '11.2: Free & Forced Oscillations, Damping & Resonance',
        ],
      },
      {
        topicName: 'Topic 12: Astrophysics and Cosmology',
        subtopics: [
          '12.1: Gravitational Fields, Newton\'s Law of Gravitation & Gravitational Potential',
          '12.2: Stellar Radii, Luminosity, Black Body Radiation & Hertzsprung-Russell Diagrams',
          '12.3: Astronomical Distances (Standard Candles, Hubble\'s Law) & Cosmic Expansion',
        ],
      },
    ],
  },
  {
    unitCode: 'WPH16',
    unitName: 'Unit 6',
    title: 'Practical Skills in Physics II',
    topics: [
      {
        topicName: 'Topic 13: Practical Skills and Techniques II',
        subtopics: [
          '13.1: Advanced Core Practicals & Experimental Methods (A2)',
          '13.2: Instrument Calibration, Systematic & Random Error Analysis',
          '13.3: Logarithmic & Power-Law Graph Linearisation and Verification',
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
 * Builds the canonical subtopic hierarchy based strictly on the official specification taxonomy.
 * Subtopics are permanently locked to their official parent topic and unit.
 * Question counts are dynamically calculated from the questions dataset.
 */
export function buildStaticSubtopicHierarchy(
  unitFilter: string | string[],
  questions: { subtopic?: string; subtopics?: string[]; unit?: string; unitCode?: string; paperId?: string }[],
  subject?: 'chemistry' | 'physics'
): SubtopicGroup[] {
  // Normalize unitFilter to an array of unit identifiers
  const unitList: string[] = Array.isArray(unitFilter)
    ? unitFilter
    : (!unitFilter || unitFilter === 'all' ? [] : [unitFilter]);

  // Determine taxonomy: explicit subject or auto-detect from questions
  let taxonomy = OFFICIAL_IAL_CHEMISTRY_TAXONOMY;
  if (subject === 'physics') {
    taxonomy = OFFICIAL_IAL_PHYSICS_TAXONOMY;
  } else if (!subject && questions.length > 0) {
    const isPhys = questions.some((q) => {
      const code = (q.unitCode || '').toUpperCase();
      const pid = (q.paperId || '').toLowerCase();
      return code.startsWith('WPH') || pid.startsWith('wph');
    });
    if (isPhys) {
      taxonomy = OFFICIAL_IAL_PHYSICS_TAXONOMY;
    }
  }

  // Precompute subtopic frequency across the questions
  const subtopicCounts = new Map<string, number>();
  for (const q of questions) {
    if (unitList.length > 0 && q.unit && !unitList.includes(q.unit)) continue;
    const subs = q.subtopics && q.subtopics.length > 0 ? q.subtopics : (q.subtopic ? [q.subtopic] : []);
    for (const s of subs) {
      if (!s) continue;
      subtopicCounts.set(s, (subtopicCounts.get(s) || 0) + 1);
    }
  }

  // Filter unit definitions
  const relevantUnits = unitList.length === 0
    ? taxonomy
    : taxonomy.filter(
        (u) => unitList.includes(u.unitName) || unitList.includes(u.unitCode)
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
 * Resolves the canonical parent topic for any subtopic string across Physics and Chemistry.
 */
export function getParentTopicForSubtopic(subtopic: string): string {
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
 * Resolves the canonical Unit for any subtopic string across Physics and Chemistry.
 */
export function getUnitForSubtopic(subtopic: string): string {
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
