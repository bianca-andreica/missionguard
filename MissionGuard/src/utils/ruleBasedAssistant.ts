import { DetectedAnomaly, TelemetryPoint, MissionStats } from '../types/telemetry';
import { CombustionAnomaly, CombustionTelemetryPoint } from '../types/combustion';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
  text: string;
  anomalyReference?: string;
  suggestedPrompts?: string[];
  uncertaintyRating?: 'LOW' | 'MEDIUM' | 'HIGH';
  diagnosticData?: {
    subsystem: string;
    hypotheses: { title: string; likelihood: string; rationale: string }[];
    contingencyPlan: string[];
  };
}

/**
 * Generates an engineering-grade aerospace & microgravity combustion diagnostic analysis
 * when Gemini API is offline or unavailable, adhering strictly to scientific honesty.
 */
export function generateRuleBasedResponse(
  query: string,
  anomalies: DetectedAnomaly[],
  telemetry: TelemetryPoint[],
  stats: MissionStats,
  combustionData: CombustionTelemetryPoint[] = [],
  combustionAnomalies: CombustionAnomaly[] = []
): {
  text: string;
  uncertaintyRating: 'LOW' | 'MEDIUM' | 'HIGH';
  diagnosticData?: AssistantMessage['diagnosticData'];
  suggestedPrompts: string[];
} {
  const q = query.toLowerCase();

  // 0. Microgravity Combustion / NASA PSI-100 SAFFIRE-III Queries
  if (
    q.includes('saffire') ||
    q.includes('combustion') ||
    q.includes('flame') ||
    q.includes('fire') ||
    q.includes('smoke') ||
    q.includes('radiometer') ||
    q.includes('igniter') ||
    q.includes('anemometer') ||
    q.includes('psi-100') ||
    q.includes('microgravity') ||
    q.includes('compare real')
  ) {
    let peakRad = -Infinity;
    let peakRadTime = 'N/A';
    let peakSmoke = -Infinity;
    let peakSmokeTime = 'N/A';
    let maxAnem = -Infinity;
    let ign1Peak = -Infinity;
    let ign1Time = 'N/A';
    let ign2Peak = -Infinity;
    let ign2Time = 'N/A';

    for (const pt of combustionData) {
      if (pt.radiometerPeak !== null && pt.radiometerPeak > peakRad) {
        peakRad = pt.radiometerPeak;
        peakRadTime = pt.elapsedLabel;
      }
      if (pt.smokeScattering2 !== null && pt.smokeScattering2 > peakSmoke) {
        peakSmoke = pt.smokeScattering2;
        peakSmokeTime = pt.elapsedLabel;
      }
      if (pt.anemometer1 !== null && pt.anemometer1 > maxAnem) maxAnem = pt.anemometer1;
      if (pt.anemometer2 !== null && pt.anemometer2 > maxAnem) maxAnem = pt.anemometer2;
      if (pt.sample1IgniterCurrent !== null && pt.sample1IgniterCurrent > ign1Peak) {
        ign1Peak = pt.sample1IgniterCurrent;
        ign1Time = pt.elapsedLabel;
      }
      if (pt.sample2IgniterCurrent !== null && pt.sample2IgniterCurrent > ign2Peak) {
        ign2Peak = pt.sample2IgniterCurrent;
        ign2Time = pt.elapsedLabel;
      }
    }

    const radEvents = combustionAnomalies.filter((a) => a.method === 'RADIOMETRIC_EXCURSION');
    const smkEvents = combustionAnomalies.filter((a) => a.method === 'SMOKE_BREAKTHROUGH');

    if (q.includes('compare real') || q.includes('synthetic')) {
      return {
        text: `### Data Provenance Comparison: Real NASA PSI-100 vs. Synthetic AURA-SAT-4 Demo\n\n` +
          `**1. Real NASA Experimental Data (NASA PSI-100 · SAFFIRE-III, DOI: 10.60555/040q-4h36):**\n` +
          `• **Source:** Official NASA Physical Sciences Informatics portal (\`psi.nasa.gov\`), Cygnus OA-7 microgravity combustion tests.\n` +
          `• **Measured Frames Loaded:** ${combustionData.length} aligned 2-second frames with peak Radiometer flux **${peakRad > -Infinity ? peakRad.toFixed(2) : 'N/A'} EU** (@ ${peakRadTime}) and peak Cygnus Smoke Scattering **${peakSmoke > -Infinity ? peakSmoke.toFixed(3) : 'N/A'}** (@ ${peakSmokeTime}).\n` +
          `• **Detector Isolation:** Evaluated exclusively with combustion rules (igniter pulses, radiometer Z-scores, smoke scattering, anemometer airflow).\n\n` +
          `**2. Synthetic Spacecraft Demonstration Data (AURA-SAT-4):**\n` +
          `• **Source:** Deterministic 24-hour LEO orbital mechanics simulator (${telemetry.length} frames, Health Score ${stats.healthScore}%).\n` +
          `• **Purpose:** Demonstrates spacecraft EPS/TCS/ADCS/TT&C anomaly detection and hypothetical fault simulation without claiming live orbital telemetry.\n\n` +
          `**3. AI-Generated Interpretations:**\n` +
          `• Both datasets use separate physical models; causal explanations are presented strictly as working engineering hypotheses with stated sensor limitations.`,
        uncertaintyRating: 'LOW',
        suggestedPrompts: [
          'Analyze NASA SAFFIRE-III radiometer & ignition sequence',
          'Assess microgravity fire risks from Cygnus smoke scattering peak',
          'What sensors are missing from the SAFFIRE-III EU table?',
        ],
      };
    }

    return {
      text: `### Microgravity Fire Safety Analysis — Real NASA PSI-100 (SAFFIRE-III)\n\n` +
        `**1. Measured NASA Experimental Observations (${combustionData.length} aligned 2s frames):**\n` +
        `• **Ignition Pulses:** Sample 2 igniter peaked at **${ign2Peak > -Infinity ? ign2Peak.toFixed(2) : 'N/A'} A** (${ign2Time}); Sample 1 igniter peaked at **${ign1Peak > -Infinity ? ign1Peak.toFixed(2) : 'N/A'} A** (${ign1Time}).\n` +
        `• **Radiometric Flame Output:** Peak Radiometer reading reached **${peakRad > -Infinity ? peakRad.toFixed(2) : 'N/A'} EU** at **t=${peakRadTime}** across ${radEvents.length} detected radiometric excursion episode(s).\n` +
        `• **Forced Duct Airflow:** Anemometers recorded up to **${maxAnem > -Infinity ? maxAnem.toFixed(2) : 'N/A'} cm/s** convective flow inside the Saffire enclosure.\n` +
        `• **Downstream Cygnus Smoke Response:** F2PCM Smoke Scattering reached **${peakSmoke > -Infinity ? peakSmoke.toFixed(3) : 'N/A'}** at **t=${peakSmokeTime}** (${smkEvents.length} breakthrough episode(s)).\n\n` +
        `**2. AI / Engineering Hypotheses (Not Confirmed Root Causes):**\n` +
        `• *Buoyancy-Free Forced Convection:* Without natural gravity buoyancy, forced ventilation (~20–30 cm/s) supplies oxidizer directly to the flame front, sustaining radiative heat release across the SIBAL cotton-fiberglass sample.\n` +
        `• *Downstream Aerosol Transport:* Elevated F2PCM scattering indicates combustion soot or smoke-wire aerosols migrated from the Saffire duct into the pressurized Cygnus module.\n\n` +
        `**3. Uncertainty & Sensor Limitations:**\n` +
        `This EU telemetry table contains radiometer EU counts, anemometer speeds, igniter currents, and Cygnus environmental channels, but does not include O₂/CO₂ mole fraction species columns or high-speed flame camera imagery (archived separately in PSI-100).`,
      uncertaintyRating: 'MEDIUM',
      diagnosticData: {
        subsystem: 'NASA PSI-100 SAFFIRE-III (Microgravity Combustion)',
        hypotheses: [
          {
            title: 'Forced-Flow Sustained Flame Spread',
            likelihood: 'Primary Physical Mechanism',
            rationale: `Radiometric excursion (${peakRad > -Infinity ? peakRad.toFixed(1) : 'N/A'} EU) closely follows igniter energization under active anemometer airflow.`,
          },
          {
            title: 'Microgravity Soot Aerosol Breakthrough',
            likelihood: 'High Correlated Evidence',
            rationale: `Cygnus F2PCM smoke scattering peaked at ${peakSmoke > -Infinity ? peakSmoke.toFixed(3) : 'N/A'} following active combustion.`,
          },
        ],
        contingencyPlan: [
          'In crewed spacecraft fire events, immediately secure module ventilation fans to remove forced convective oxygen transport.',
          'Cross-check optical scattering alarms against CO/HCN electrochemical gas sensors before confirming suppressed smoldering.',
          'Correlate EU radiometer spikes with PSI-100 Experimental Details & camera imagery to compute flame spread velocity.',
        ],
      },
      suggestedPrompts: [
        'Compare real NASA SAFFIRE-III data vs synthetic telemetry',
        'Assess microgravity fire risks from Cygnus smoke scattering peak',
        'Review synthetic AURA-SAT-4 mission health summary',
      ],
    };
  }

  // 1. Overall health / status query
  if (q.includes('health') || q.includes('status') || q.includes('overview') || q.includes('summary')) {
    const activeCritical = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE');
    const activeWarning = anomalies.filter((a) => a.severity === 'WARNING' && a.status === 'ACTIVE');

    return {
      text: `### Flight Operations Assessment — Mission Health: ${stats.healthScore}%\n\n` +
        `**Current Orbit:** Orbit ${stats.currentOrbit} (${stats.orbitalPhase})\n` +
        `**Telemetry Frame Status:** ${telemetry.length} data frames logged across 24 hours.\n` +
        `**Active Anomalies:** ${activeCritical.length} Critical, ${activeWarning.length} Warning.\n\n` +
        `**Subsystem State:**\n` +
        `• **EPS (Electrical Power):** ${activeCritical.some(a => a.subsystem === 'EPS') ? 'DEGRADED — Review charge state.' : 'NOMINAL'}\n` +
        `• **TCS (Thermal Control):** ${activeCritical.some(a => a.subsystem === 'TCS') ? 'ACTION REQUIRED — Elevated thermal excursions detected.' : 'NOMINAL'}\n` +
        `• **ADCS (Attitude & Control):** ${activeWarning.some(a => a.subsystem === 'ADCS') ? 'CAUTION — Momentum or rate perturbations flagged.' : 'STABLE'}\n` +
        `• **TT&C (RF Communications):** ${stats.contactStatus === 'AOS' ? 'Carrier Acquisition Active (AOS)' : 'Loss of Signal Window (LOS)'}\n\n` +
        `*Scientific Note: All telemetry is deterministic simulation for the NASA Space Apps Challenge 2026.*`,
      uncertaintyRating: 'LOW',
      suggestedPrompts: [
        'Diagnose active battery temperature surge',
        'Evaluate ADCS angular rate disturbance',
        'Explain solar array power generation curve',
        'Generate contingency procedure for TT&C loss',
      ],
    };
  }

  // 2. Battery / Thermal query
  if (q.includes('battery') || q.includes('thermal') || q.includes('heat') || q.includes('temp')) {
    const batAnom = anomalies.find((a) => a.metricKey === 'batteryTemp' || a.metricKey === 'batteryVoltage');
    const peakTemp = Math.max(...telemetry.map((t) => t.batteryTemp));

    return {
      text: `### Subsystem Diagnostic: Battery & Thermal Control (EPS/TCS)\n\n` +
        `Telemetry confirms peak battery core temperature recorded at **${peakTemp.toFixed(1)}°C** (Nominal operating envelope: 12.0°C to 28.0°C; Redline Limit: 38.0°C).\n\n` +
        `**Telemetry Observations:**\n` +
        `• High rate-of-change onset observed shortly following orbital eclipse exit (MET 08:24).\n` +
        `• Bus charging current was simultaneously at maximum constant-current phase (12.4A).\n\n` +
        `**Probabilistic Hypotheses:**\n` +
        `1. **Heater Relay Latch (Likelihood: 65%):** Mechanical or solid-state relay in thermal control loop failed closed, maintaining heater activation when radiant solar flux returned.\n` +
        `2. **Cell Internal Impedance Surge (Likelihood: 25%):** Thermal runaway initiation due to separator degradation or micro-dendrite growth.\n` +
        `3. **Radiator Earth-Albedo Incidence (Likelihood: 10%):** Spacecraft attitude orientation caused thermal radiator face to view Earth limb during high albedo pass.\n\n` +
        `*Confidence Assessment: Telemetry cannot conclusively distinguish between relay latch and internal cell impedance without secondary current draw telemetry from HK_TCS_PWR.*`,
      uncertaintyRating: 'MEDIUM',
      diagnosticData: {
        subsystem: 'TCS / EPS',
        hypotheses: [
          {
            title: 'TCS Heater Relay Stuck Closed',
            likelihood: '65% (Primary)',
            rationale: 'Thermal ramp correlates with eclipse transition where heater cycle is triggered.',
          },
          {
            title: 'Electrochemical Cell Micro-Short',
            likelihood: '25% (Secondary)',
            rationale: 'Elevated internal cell resistance heating under nominal 12A charge current.',
          },
          {
            title: 'Thermal Radiator Albedo Glint',
            likelihood: '10% (Tertiary)',
            rationale: 'Unplanned solar or planetary reflection onto optical solar reflectors.',
          },
        ],
        contingencyPlan: [
          'Command HK_TCS_RELAY_CYCLE to pulse relay contacts open.',
          'Command battery charge current clamp from 12.0A down to 4.5A trickle charge.',
          'Execute 12-degree roll maneuver away from local vertical to point radiator bay into cold space.',
          'If battery core remains > 42°C for 2 consecutive telemetry frames, initiate non-essential instrument load shed.',
        ],
      },
      suggestedPrompts: [
        'How can we confirm if the heater relay is stuck?',
        'What are the safe limits for Li-ion spacecraft cells in LEO?',
        'Simulate solar panel degradation scenario',
      ],
    };
  }

  // 3. ADCS / Angular rate / Reaction wheel query
  if (q.includes('angular') || q.includes('rate') || q.includes('rotation') || q.includes('wheel') || q.includes('adcs') || q.includes('tumble')) {
    const peakRate = Math.max(...telemetry.map((t) => t.angularRate));
    const peakRpm = Math.max(...telemetry.map((t) => t.reactionWheelSpeed));

    return {
      text: `### Subsystem Diagnostic: Attitude Determination & Control System (ADCS)\n\n` +
        `**Telemetry Metrics:**\n` +
        `• Net Angular Rate: Peak **${peakRate.toFixed(3)} deg/s** (Nominal: < 0.25 deg/s, Warning: > 0.45 deg/s).\n` +
        `• Reaction Wheel Assembly: Peak speed **${peakRpm} RPM** (Saturation threshold: 4800 RPM).\n\n` +
        `**Engineering Assessment:**\n` +
        `The spacecraft experienced an abrupt rotational disturbance with an anomalous rate-of-change. The reaction wheel assembly accelerated sharply to counter the body rate, indicating the closed-loop attitude controller is functional but compensating for external or mechanical torque.\n\n` +
        `**Hypotheses Under Consideration:**\n` +
        `• **Bearing Friction / Lubricant Migration:** Reaction wheel bearing experienced transient drag, transferring torque into spacecraft bus.\n` +
        `• **Propellant / Venting Leak:** Residual valve micro-leak or battery venting producing impulsive moment.\n` +
        `• **Aerodynamic Perturbation:** Upper atmospheric density fluctuation during perigee passage.\n\n` +
        `**Suggested Action Protocol:**\n` +
        `1. Query Magnetometer and Star Tracker telemetry for cross-axis confirmation.\n` +
        `2. Command autonomous desaturation via Magnetic Torquer Rods (MTR_DUMP_ENABLE).\n` +
        `3. If angular rate exceeds 1.0 deg/s, initiate safe-mode Sun-pointing tumble recovery.`,
      uncertaintyRating: 'MEDIUM',
      diagnosticData: {
        subsystem: 'ADCS',
        hypotheses: [
          {
            title: 'Reaction Wheel Bearing Drag',
            likelihood: '55%',
            rationale: 'Transient mechanical resistance transferred angular momentum to spacecraft frame.',
          },
          {
            title: 'Spacecraft Outgassing / Venting Impulsive Torque',
            likelihood: '30%',
            rationale: 'Gas expansion through micro-aperture creates persistent torque arm.',
          },
          {
            title: 'Gravity Gradient / Aero Disturbance',
            likelihood: '15%',
            rationale: 'Off-nominal drag profile during low perigee excursion.',
          },
        ],
        contingencyPlan: [
          'Verify gyroscopic rate drift against Star Tracker quaternions.',
          'Activate magnetic torque rods to desaturate accumulated wheel momentum.',
          'Isolate reaction wheel 2 to determine if vibration harmonics match bearing wear models.',
        ],
      },
      suggestedPrompts: [
        'What is magnetic desaturation and how does it work?',
        'Inspect the anomaly in the Anomaly Center',
        'Compare simulated tumble against nominal baseline',
      ],
    };
  }

  // 4. Comm / RSSI / Signal query
  if (q.includes('comm') || q.includes('signal') || q.includes('rssi') || q.includes('ground') || q.includes('contact')) {
    return {
      text: `### Subsystem Diagnostic: Telemetry, Tracking & Command (TT&C)\n\n` +
        `**Signal Analysis:**\n` +
        `During scheduled ground station contact, S-band carrier signal RSSI dropped to **-121.5 dBm**, crossing the Critical threshold (-120.0 dBm) and triggering bit error rate degradation.\n\n` +
        `**Investigation Hypotheses:**\n` +
        `1. **Antenna Pointing Misalignment (Likelihood: 50%):** Spacecraft attitude pitch offset moved the high-gain or directional patch beam off ground station boresight.\n` +
        `2. **SSPA RF Power Rail Throttle (Likelihood: 35%):** Solid-State Power Amplifier entered thermal foldback protection.\n` +
        `3. **Ground Station Local Weather (Likelihood: 15%):** Heavy precipitation or ionospheric scintillation at the terrestrial receiver.\n\n` +
        `**Recommended Ground Response:**\n` +
        `• Command automatic switch to omnidirectional low-gain antenna (LGA-B).\n` +
        `• Request ground station boost uplink power and slew antenna angle.\n` +
        `• Review SSPA temperature telemetry on next pass.`,
      uncertaintyRating: 'LOW',
      suggestedPrompts: [
        'Simulate communication transponder loss',
        'Show active alerts for TT&C',
        'What are nominal S-band RSSI levels in LEO?',
      ],
    };
  }

  // 5. Default generic query response
  const activeCount = anomalies.filter((a) => a.status === 'ACTIVE').length;
  return {
    text: `### Mission Flight Controller Response\n\n` +
      `Regarding your inquiry: *"${query}"*:\n\n` +
      `• **Real NASA Data (PSI-100 SAFFIRE-III):** ${combustionData.length} aligned microgravity combustion frames and **${combustionAnomalies.length} combustion events** loaded.\n` +
      `• **Synthetic Spacecraft Demo (AURA-SAT-4):** ${telemetry.length} orbital samples evaluated with **${activeCount} active anomalies**.\n\n` +
      `You can ask about either dataset—for example: **"Analyze NASA SAFFIRE-III radiometer & ignition sequence"**, **"Assess microgravity fire risks from Cygnus smoke scattering peak"**, or **"Diagnose active battery temperature surge"**.`,
    uncertaintyRating: 'LOW',
    suggestedPrompts: [
      'Analyze NASA SAFFIRE-III radiometer & ignition sequence',
      'Compare real NASA SAFFIRE-III data vs synthetic telemetry',
      'Diagnose battery thermal surge',
      'Review mission health summary',
    ],
  };
}
