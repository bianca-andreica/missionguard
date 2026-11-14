import { TelemetryPoint, MetricDefinition } from '../types/telemetry';

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  batteryVoltage: {
    key: 'batteryVoltage',
    name: 'Battery Voltage',
    subsystem: 'EPS',
    unit: 'V',
    nominalMin: 25.5,
    nominalMax: 29.5,
    warningLow: 24.8,
    warningHigh: 30.2,
    criticalLow: 23.5,
    criticalHigh: 31.5,
    maxRateOfChange: 0.8,
    description: 'Main Li-ion battery pack terminal potential',
    color: '#38bdf8', // cyan-400
  },
  batteryTemp: {
    key: 'batteryTemp',
    name: 'Battery Temperature',
    subsystem: 'TCS',
    unit: '°C',
    nominalMin: 12.0,
    nominalMax: 28.0,
    warningLow: 8.0,
    warningHigh: 32.0,
    criticalLow: 0.0,
    criticalHigh: 38.0,
    maxRateOfChange: 2.5,
    description: 'Battery core temperature monitored via redundant thermistors',
    color: '#fb7185', // rose-400
  },
  solarArrayPower: {
    key: 'solarArrayPower',
    name: 'Solar Array Power',
    subsystem: 'EPS',
    unit: 'W',
    nominalMin: 0.0,
    nominalMax: 540.0,
    warningLow: 0.0,
    warningHigh: 560.0,
    criticalLow: 0.0,
    criticalHigh: 600.0,
    maxRateOfChange: 80.0,
    description: 'Total generated power from dual articulated photovoltaic wings',
    color: '#facc15', // amber-400
  },
  busVoltage: {
    key: 'busVoltage',
    name: 'Regulated Bus Voltage',
    subsystem: 'EPS',
    unit: 'V',
    nominalMin: 27.6,
    nominalMax: 28.4,
    warningLow: 26.8,
    warningHigh: 29.0,
    criticalLow: 25.5,
    criticalHigh: 30.0,
    maxRateOfChange: 0.5,
    description: 'Internal 28V regulated avionics and instrument bus line',
    color: '#34d399', // emerald-400
  },
  angularRate: {
    key: 'angularRate',
    name: 'Net Angular Rate',
    subsystem: 'ADCS',
    unit: 'deg/s',
    nominalMin: 0.0,
    nominalMax: 0.25,
    warningHigh: 0.45,
    criticalHigh: 0.90,
    maxRateOfChange: 0.18,
    description: 'Total spacecraft body rotation rate computed from 3-axis FOG gyroscopes',
    color: '#a78bfa', // purple-400
  },
  reactionWheelSpeed: {
    key: 'reactionWheelSpeed',
    name: 'Reaction Wheel Speed',
    subsystem: 'ADCS',
    unit: 'RPM',
    nominalMin: 1000,
    nominalMax: 3500,
    warningLow: 600,
    warningHigh: 4200,
    criticalLow: 200,
    criticalHigh: 4800,
    maxRateOfChange: 450,
    description: 'Momentum wheel assembly flywheel angular speed',
    color: '#c084fc', // purple-300
  },
  commRssi: {
    key: 'commRssi',
    name: 'Ground Signal (RSSI)',
    subsystem: 'TT&C',
    unit: 'dBm',
    nominalMin: -98.0,
    nominalMax: -70.0,
    warningLow: -108.0,
    warningHigh: -60.0,
    criticalLow: -120.0,
    criticalHigh: -50.0,
    maxRateOfChange: 15.0,
    description: 'S-band receiver carrier signal strength at ground contact pass',
    color: '#22d3ee', // cyan-400
  },
  payloadTemp: {
    key: 'payloadTemp',
    name: 'Payload Instrument Temp',
    subsystem: 'PAYLOAD',
    unit: '°C',
    nominalMin: -5.0,
    nominalMax: 20.0,
    warningLow: -12.0,
    warningHigh: 28.0,
    criticalLow: -20.0,
    criticalHigh: 36.0,
    maxRateOfChange: 3.0,
    description: 'Earth Observation Multispectral sensor optical bench temperature',
    color: '#2dd4bf', // teal-400
  },
};

// Format MET seconds to "HH:MM:SS"
export function formatMET(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Pseudo-random deterministic noise based on seed
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 999.123) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generates 24 hours of deterministic synthetic spacecraft telemetry.
 * 720 points @ 2-minute cadence.
 */
export function generateBaselineTelemetry(): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const baseEpoch = new Date('2026-10-19T00:00:00Z').getTime();
  const totalMinutes = 24 * 60; // 1440 minutes
  const stepMinutes = 2; // 720 steps
  const orbitPeriodMinutes = 92.8;

  for (let m = 0; m < totalMinutes; m += stepMinutes) {
    const metSeconds = m * 60;
    const timestamp = new Date(baseEpoch + metSeconds * 1000).toISOString();
    const metString = formatMET(metSeconds);

    const orbitNumber = Math.floor(m / orbitPeriodMinutes) + 1;
    const orbitProgress = (m % orbitPeriodMinutes) / orbitPeriodMinutes;

    // Day/Night orbital phase: ~60% sunlight, 40% eclipse
    let orbitalPhase: 'SUNLIGHT' | 'PENUMBRA' | 'ECLIPSE' = 'SUNLIGHT';
    let sunFactor = 0; // 0 to 1

    if (orbitProgress < 0.58) {
      orbitalPhase = 'SUNLIGHT';
      // Bell curve for solar angle during daylight
      sunFactor = Math.sin((orbitProgress / 0.58) * Math.PI);
    } else if (orbitProgress < 0.62) {
      orbitalPhase = 'PENUMBRA';
      sunFactor = Math.max(0, 1 - (orbitProgress - 0.58) / 0.04);
    } else {
      orbitalPhase = 'ECLIPSE';
      sunFactor = 0;
    }

    // Ground station passes every ~95 minutes for 10 minutes
    const passCycle = m % 96;
    const groundPassActive = passCycle >= 20 && passCycle <= 30;

    // Micro-jitter noise
    const noiseA = (seededNoise(m * 1.3) - 0.5) * 2;
    const noiseB = (seededNoise(m * 2.7) - 0.5) * 2;
    const noiseC = (seededNoise(m * 4.1) - 0.5) * 2;

    // 1. Solar Array Power (W)
    let solarPower = sunFactor > 0.05 ? sunFactor * 485 + noiseA * 8 : 0;
    solarPower = Math.max(0, Math.round(solarPower * 10) / 10);

    // 2. Battery Voltage (V): 26.1V in deep eclipse up to 29.3V at solar peak
    let batteryVoltage = 26.3 + sunFactor * 2.8 + noiseB * 0.08;

    // 3. Battery Temperature (°C): thermal lag behind solar absorption (nominal 16 - 25°C)
    let batteryTemp = 17.5 + Math.sin(((orbitProgress - 0.15) * 2 * Math.PI)) * 5.5 + noiseC * 0.3;

    // 4. Regulated Bus Voltage (V): tightly regulated at 28.0V ± 0.15V
    let busVoltage = 28.02 + noiseA * 0.06;

    // 5. Battery Current (A): positive when charging in sunlight, negative when discharging in eclipse
    let batteryCurrent = sunFactor > 0.2 ? 12.0 * sunFactor + noiseB * 0.4 : -7.5 + noiseB * 0.3;

    // 6. Net Angular Rate (deg/s): nominal 0.04 - 0.12 deg/s
    let angularRate = 0.06 + Math.abs(noiseC) * 0.05;
    let angularRateX = noiseA * 0.04;
    let angularRateY = noiseB * 0.04;
    let angularRateZ = noiseC * 0.04;

    // 7. Reaction Wheel Speed (RPM): nominal 2200 RPM with gentle control oscillations
    let reactionWheelSpeed = 2200 + Math.sin(m * 0.05) * 350 + noiseA * 40;

    // 8. Comm RSSI (dBm): active during ground passes (-78 to -88 dBm); quiescent outside
    let commRssi = groundPassActive ? -82.0 + noiseB * 3.5 : -104.0 + noiseB * 2.0;
    let bitErrorRate = groundPassActive ? 2e-7 : 8e-5;

    // 9. Payload Optical Bench Temp (°C): nominal 4°C to 16°C
    let payloadTemp = 10.0 + sunFactor * 6.0 + noiseA * 0.4;
    let avionicsTemp = 22.0 + sunFactor * 4.0 + noiseB * 0.3;

    // --- Injected Deterministic Baseline Anomalies ---
    let isInjectedAnomaly = false;
    let anomalyTag: string | undefined = undefined;

    // Anomaly 1: Battery thermal surge at MET 08:20 to 08:50 (m: 500 to 530)
    // Thermal heater relay chatter causes steep thermal runaway to 43.8°C
    if (m >= 500 && m <= 530) {
      const severityCurve = Math.sin(((m - 500) / 30) * Math.PI);
      batteryTemp += severityCurve * 19.5; // reaches ~42.8°C (Critical > 38.0°C)
      isInjectedAnomaly = true;
      anomalyTag = 'EPS-BAT-TCS-OVERHEAT';
    }

    // Anomaly 2: Reaction Wheel 2 friction disturbance at MET 13:40 to 14:04 (m: 820 to 844)
    // Mechanical drag causes sudden angular velocity spike (0.78 deg/s) and wheel speed perturbation
    if (m >= 820 && m <= 844) {
      const severityCurve = Math.sin(((m - 820) / 24) * Math.PI);
      angularRate += severityCurve * 0.72; // reaches ~0.84 deg/s (Warning > 0.45 deg/s)
      reactionWheelSpeed += severityCurve * 1650; // climbs above 4000 RPM
      isInjectedAnomaly = true;
      anomalyTag = 'ADCS-RW-FRICTION-SPIKE';
    }

    // Anomaly 3: TT&C Transponder RF SSPA power slump at MET 19:10 to 19:30 (m: 1150 to 1170)
    // Occurs during what should be an active ground pass, RSSI plunges to -122 dBm
    if (m >= 1150 && m <= 1170) {
      if (groundPassActive || (m >= 1152 && m <= 1168)) {
        commRssi = -121.5 + noiseB * 2.0; // plunges to critical LOS threshold
        bitErrorRate = 4.5e-3;
        isInjectedAnomaly = true;
        anomalyTag = 'TTC-SSPA-SIGNAL-DROP';
      }
    }

    points.push({
      id: `pt-${m}`,
      timestamp,
      metSeconds,
      metString,
      orbitNumber,
      orbitalPhase,
      groundPassActive,
      batteryVoltage: Math.round(batteryVoltage * 100) / 100,
      batteryCurrent: Math.round(batteryCurrent * 100) / 100,
      batteryTemp: Math.round(batteryTemp * 10) / 10,
      solarArrayPower: Math.round(solarPower * 10) / 10,
      busVoltage: Math.round(busVoltage * 100) / 100,
      angularRate: Math.round(angularRate * 1000) / 1000,
      angularRateX: Math.round(angularRateX * 1000) / 1000,
      angularRateY: Math.round(angularRateY * 1000) / 1000,
      angularRateZ: Math.round(angularRateZ * 1000) / 1000,
      reactionWheelSpeed: Math.round(reactionWheelSpeed),
      commRssi: Math.round(commRssi * 10) / 10,
      bitErrorRate,
      payloadTemp: Math.round(payloadTemp * 10) / 10,
      avionicsTemp: Math.round(avionicsTemp * 10) / 10,
      isInjectedAnomaly,
      anomalyTag,
    });
  }

  return points;
}
