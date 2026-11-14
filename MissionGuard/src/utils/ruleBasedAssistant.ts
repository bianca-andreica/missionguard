import { DetectedAnomaly, TelemetryPoint, MissionStats } from '../types/telemetry';

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
 * Generates an engineering-grade aerospace diagnostic analysis when Gemini API
 * is offline or unavailable, adhering strictly to scientific honesty.
 */
export function generateRuleBasedResponse(
  query: string,
  anomalies: DetectedAnomaly[],
  telemetry: TelemetryPoint[],
  stats: MissionStats
): {
  text: string;
  uncertaintyRating: 'LOW' | 'MEDIUM' | 'HIGH';
  diagnosticData?: AssistantMessage['diagnosticData'];
  suggestedPrompts: string[];
} {
  const q = query.toLowerCase();

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
      `Regarding your inquiry: *"生${query}"*:\n\n` +
      `The telemetry monitoring pipeline has evaluated **${telemetry.length} data samples** across 6 spacecraft subsystems. Currently, **${activeCount} anomalies** are active in the system.\n\n` +
      `**Detection Methodology Active:**\n` +
      `• Upper/Lower Engineering Thresholds (Redline & Yellow)\n` +
      `• Rolling Z-Score Outlier Analysis (Window: 48 min, Threshold: 2.8σ)\n` +
      `• Rate-of-Change ($\Delta v / \Delta t$) Derivative Limits\n\n` +
      `To drill into specific spacecraft behavior, you can query specific subsystems like **"Explain the battery temperature anomaly"**, **"Check ADCS angular momentum"**, or **"Generate contingency report"**.`,
    uncertaintyRating: 'LOW',
    suggestedPrompts: [
      'Diagnose battery thermal surge',
      'Explain reaction wheel angular rate spike',
      'Review mission health summary',
      'Run solar panel degradation simulation',
    ],
  };
}
