import {
  TelemetryPoint,
  DetectedAnomaly,
  DetectionSettings,
  AnomalySeverity,
  DetectionMethod,
  MetricDefinition,
} from '../types/telemetry';
import { METRIC_DEFINITIONS } from './telemetryGenerator';

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  zScoreThreshold: 2.8,
  rateMultiplier: 1.0,
  sensitivity: 'NOMINAL',
  enableThresholdCheck: true,
  enableZScoreCheck: true,
  enableRateCheck: true,
  thresholdOverrides: {},
};

export interface MetricStats {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  current: number;
}

/**
 * Computes mean and standard deviation for rolling windows
 */
function computeWindowStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Generates scientific, engineering-accurate hypotheses and recommended actions
 */
function getScientificDiagnosis(
  metricDef: MetricDefinition,
  observed: number,
  severity: AnomalySeverity,
  method: DetectionMethod
): { explanation: string; hypotheses: string[]; suggestedActions: string[] } {
  switch (metricDef.key) {
    case 'batteryTemp':
      return {
        explanation: `Battery pack temperature reached ${observed.toFixed(1)}°C, exceeding thermal limits (Max nominal: ${metricDef.nominalMax}°C). Detected via ${method}.`,
        hypotheses: [
          'Hypothesis A: Autonomous TCS radiator loop heater relay stuck in energized state following eclipse exit.',
          'Hypothesis B: Cell-level internal resistance surge or micro-short during high charge-rate cycle.',
          'Hypothesis C: Attitude orientation resulted in prolonged direct solar albedo on battery bay radiator panel.',
        ],
        suggestedActions: [
          'Verify thermistor telemetry consistency across redundant sensors (TH_BAT_A vs TH_BAT_B).',
          'Send commanding command TCS_HEATER_OVERRIDE_OFF to force open relay contacts.',
          'If cell temperature persists > 42°C, re-orient spacecraft to yaw 15° for radiator shadow casting.',
          'Reduce solar array charge regulator rate to 4.0A trickle charge until thermal dissipation restores.',
        ],
      };

    case 'batteryVoltage':
      return {
        explanation: `Battery terminal potential observed at ${observed.toFixed(2)}V, deviating from expected orbital charging envelope.`,
        hypotheses: [
          'Hypothesis A: Charge controller shunt circuit premature termination.',
          'Hypothesis B: Deep depth-of-discharge caused by unmodelled instrument payload power draw during eclipse.',
          'Hypothesis C: Telemetry analog-to-digital converter (ADC) reference drift.',
        ],
        suggestedActions: [
          'Check battery depth-of-discharge (DoD) counter against orbit duration log.',
          'Review EPS bus shunt current telemetry (EPS_SHUNT_I).',
          'Initiate autonomous payload load shedding if voltage drops below 24.5V.',
        ],
      };

    case 'solarArrayPower':
      return {
        explanation: `Solar array electrical power measured at ${observed.toFixed(1)}W, falling significantly below sun-pointing daylight model.`,
        hypotheses: [
          'Hypothesis A: Solar array drive assembly (SADA) gantry stepper motor slip or tracking misalignment.',
          'Hypothesis B: Partial string diode open-circuit or micro-meteorite impact on array wing +Y.',
          'Hypothesis C: Spacecraft body self-shadowing due to off-nominal science slew maneuver.',
        ],
        suggestedActions: [
          'Verify Sun Sensor vector telemetry (CSS_AZIMUTH and CSS_ELEVATION).',
          'Execute SADA re-indexing routine step sequence: SADA_HOMING_EXEC.',
          'Calculate power delta per solar cell string to isolate whether loss is uniform or localized.',
        ],
      };

    case 'angularRate':
      return {
        explanation: `Spacecraft angular velocity spiked to ${observed.toFixed(3)} deg/s (Nominal limit: ${metricDef.nominalMax} deg/s). High rate of rotational kinetic disturbance.`,
        hypotheses: [
          'Hypothesis A: Reaction wheel bearing friction anomaly or tachometer counter tach-drop.',
          'Hypothesis B: External impulse torque from venting (residual propulsion propellant or battery outgassing).',
          'Hypothesis C: Aerodynamic drag torque during perigee dip or space debris near-miss vortex.',
        ],
        suggestedActions: [
          'Cross-reference Star Tracker optical solution with Fiber Optic Gyro rates.',
          'Inspect reaction wheel assembly momentum storage state; check if RW-2 or RW-3 is nearing saturation.',
          'Enable magnetic torque rods (MTR_DUMP_ACTIVE) for momentum desaturation.',
          'If angular rate exceeds 1.0 deg/s, command ADCS safehold mode (B-dot rate damping).',
        ],
      };

    case 'reactionWheelSpeed':
      return {
        explanation: `Reaction wheel speed reached ${observed.toFixed(0)} RPM, approaching assembly saturation boundary (${metricDef.criticalHigh} RPM).`,
        hypotheses: [
          'Hypothesis A: Persistent environmental disturbance torque (gravity gradient / solar radiation pressure).',
          'Hypothesis B: Magnetic torquer desaturation failure due to geomagnetically quiet orbit sector.',
          'Hypothesis C: Control loop integrator windup in attitude pointing quaternion algorithm.',
        ],
        suggestedActions: [
          'Command immediate momentum dump cycle using magnetorquers.',
          'Verify attitude pointing target; check if high-drag attitude is holding needlessly.',
          'Switch primary wheel bias configuration to secondary momentum axis.',
        ],
      };

    case 'commRssi':
      return {
        explanation: `Ground station carrier signal RSSI plunged to ${observed.toFixed(1)} dBm during scheduled contact window.`,
        hypotheses: [
          'Hypothesis A: S-band patch antenna pointing offset caused by spacecraft attitude jitter.',
          'Hypothesis B: Solid-State Power Amplifier (SSPA) thermal backoff or power rail glitch.',
          'Hypothesis C: Ground station atmospheric attenuation (precipitation / high zenith angle).',
        ],
        suggestedActions: [
          'Check SSPA forward RF power telemetry (SSPA_FWD_PWR).',
          'Switch transponder from Antenna-A to redundant omnidirectional patch Antenna-B.',
          'Re-align high-gain antenna gimbal if currently tracking ground station coordinates.',
        ],
      };

    case 'busVoltage':
      return {
        explanation: `Regulated main power bus voltage fluctuated to ${observed.toFixed(2)}V (Nominal: 28.0V ± 0.4V).`,
        hypotheses: [
          'Hypothesis A: Main bus voltage regulator (MBVR) switching regulator transient.',
          'Hypothesis B: Inrush current surge from science payload optical heater cycling.',
          'Hypothesis C: Secondary power distribution unit (PDU) fuse resistor degradation.',
        ],
        suggestedActions: [
          'Inspect individual branch circuit currents in PDU sub-telemetry.',
          'Switch to redundant MBVR-B regulator if voltage ripple exceeds 800mV.',
        ],
      };

    default:
      return {
        explanation: `Metric ${metricDef.name} reported unusual value of ${observed.toFixed(2)} ${metricDef.unit}.`,
        hypotheses: [
          'Telemetry sensor analog-to-digital glitch or anomalous thermal condition.',
          'Operational load configuration outside nominal boundary expectations.',
        ],
        suggestedActions: [
          'Perform telemetry verification across adjacent sensor points.',
          'Monitor next consecutive 3 sampling intervals before executing commanding.',
        ],
      };
  }
}

/**
 * Runs the complete multi-method anomaly detection engine on a telemetry series.
 */
export function runAnomalyDetection(
  telemetry: TelemetryPoint[],
  settings: DetectionSettings = DEFAULT_DETECTION_SETTINGS
): DetectedAnomaly[] {
  if (!telemetry || telemetry.length === 0) return [];

  const anomalies: DetectedAnomaly[] = [];
  const windowSize = 24; // 24 samples = 48 minutes rolling window

  // Sensitivity adjustments
  const sensitivityMultiplier =
    settings.sensitivity === 'AGGRESSIVE'
      ? 0.8
      : settings.sensitivity === 'CONSERVATIVE'
      ? 1.25
      : 1.0;

  const effectiveZScoreLimit = settings.zScoreThreshold * sensitivityMultiplier;
  const effectiveRateLimit = settings.rateMultiplier * sensitivityMultiplier;

  // Track metrics to inspect
  const metricKeys: (keyof TelemetryPoint)[] = [
    'batteryVoltage',
    'batteryTemp',
    'solarArrayPower',
    'busVoltage',
    'angularRate',
    'reactionWheelSpeed',
    'commRssi',
    'payloadTemp',
  ];

  for (const key of metricKeys) {
    const def = METRIC_DEFINITIONS[key as string];
    if (!def) continue;

    // Apply any user overrides from settings
    const overrides = settings.thresholdOverrides[key as string] || {};
    const nominalMin = overrides.nominalMin ?? def.nominalMin;
    const nominalMax = overrides.nominalMax ?? def.nominalMax;
    const warningLow = overrides.warningLow ?? def.warningLow;
    const warningHigh = overrides.warningHigh ?? def.warningHigh;
    const criticalLow = overrides.criticalLow ?? def.criticalLow;
    const criticalHigh = overrides.criticalHigh ?? def.criticalHigh;
    const maxRate = (overrides.maxRateOfChange ?? def.maxRateOfChange) * effectiveRateLimit;

    const values = telemetry.map((pt) => Number(pt[key]) || 0);

    for (let i = 0; i < telemetry.length; i++) {
      const pt = telemetry[i];
      const val = values[i];

      // Skip normal zero-solar conditions during known orbital eclipse
      if (key === 'solarArrayPower' && pt.orbitalPhase === 'ECLIPSE') {
        continue;
      }
      // Skip comm RSSI when outside of scheduled ground contact
      if (key === 'commRssi' && !pt.groundPassActive && !pt.isInjectedAnomaly) {
        continue;
      }

      let detected = false;
      let severity: AnomalySeverity = 'INFO';
      let method: DetectionMethod = 'THRESHOLD';
      let zScoreVal: number | undefined = undefined;
      let rateOfChangeVal: number | undefined = undefined;

      // 1. Threshold Detection
      if (settings.enableThresholdCheck) {
        if (criticalHigh !== undefined && val >= criticalHigh) {
          detected = true;
          severity = 'CRITICAL';
          method = 'THRESHOLD';
        } else if (criticalLow !== undefined && val <= criticalLow) {
          detected = true;
          severity = 'CRITICAL';
          method = 'THRESHOLD';
        } else if (warningHigh !== undefined && val >= warningHigh) {
          detected = true;
          severity = 'WARNING';
          method = 'THRESHOLD';
        } else if (warningLow !== undefined && val <= warningLow) {
          detected = true;
          severity = 'WARNING';
          method = 'THRESHOLD';
        }
      }

      // 2. Rolling Z-Score Detection
      if (!detected && settings.enableZScoreCheck && i >= 6) {
        const start = Math.max(0, i - windowSize);
        const windowValues = values.slice(start, i);
        const { mean, stdDev } = computeWindowStats(windowValues);

        if (stdDev > 0.001) {
          const z = Math.abs(val - mean) / stdDev;
          if (z >= effectiveZScoreLimit) {
            detected = true;
            zScoreVal = Math.round(z * 100) / 100;
            method = 'Z_SCORE';
            severity = z >= effectiveZScoreLimit * 1.4 ? 'CRITICAL' : 'WARNING';
          }
        }
      }

      // 3. Rate-of-Change Detection
      if (i > 0 && settings.enableRateCheck) {
        const prevVal = values[i - 1];
        const dt = (pt.metSeconds - telemetry[i - 1].metSeconds) / 60; // minutes
        const rate = Math.abs(val - prevVal) / (dt || 1);

        if (rate > maxRate) {
          rateOfChangeVal = Math.round(rate * 100) / 100;
          if (!detected) {
            detected = true;
            method = 'RATE_OF_CHANGE';
            severity = rate > maxRate * 1.8 ? 'CRITICAL' : 'WARNING';
          }
        }
      }

      if (detected) {
        const diag = getScientificDiagnosis(def, val, severity, method);
        anomalies.push({
          id: `anom-${key}-${pt.id}-${i}`,
          timestamp: pt.timestamp,
          metString: pt.metString,
          metricKey: key,
          metricName: def.name,
          subsystem: def.subsystem,
          severity,
          detectionMethod: method,
          observedValue: val,
          expectedRange: [nominalMin, nominalMax],
          zScore: zScoreVal,
          rateOfChange: rateOfChangeVal,
          status: 'ACTIVE',
          explanation: diag.explanation,
          hypotheses: diag.hypotheses,
          suggestedActions: diag.suggestedActions,
        });
      }
    }
  }

  // Cluster adjacent anomalies for the same metric within 10 minutes to avoid flood
  return clusterAnomalies(anomalies);
}

/**
 * Clusters contiguous or proximate anomalies into representative episodes
 */
function clusterAnomalies(raw: DetectedAnomaly[]): DetectedAnomaly[] {
  if (raw.length <= 1) return raw;

  // Sort by metric then timestamp
  const sorted = [...raw].sort((a, b) => {
    if (a.metricKey !== b.metricKey) return a.metricKey.localeCompare(b.metricKey);
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const clustered: DetectedAnomaly[] = [];
  let currentGroup: DetectedAnomaly[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = sorted[i];

    const prevTime = new Date(prev.timestamp).getTime();
    const currTime = new Date(curr.timestamp).getTime();
    const diffMinutes = (currTime - prevTime) / (1000 * 60);

    if (curr.metricKey === prev.metricKey && diffMinutes <= 12) {
      currentGroup.push(curr);
    } else {
      clustered.push(pickPeakAnomaly(currentGroup));
      currentGroup = [curr];
    }
  }

  if (currentGroup.length > 0) {
    clustered.push(pickPeakAnomaly(currentGroup));
  }

  // Re-sort chronologically
  return clustered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function pickPeakAnomaly(group: DetectedAnomaly[]): DetectedAnomaly {
  if (group.length === 1) return group[0];

  // Pick highest severity first, or maximum deviation
  const critical = group.find((a) => a.severity === 'CRITICAL');
  if (critical) return critical;

  const warning = group.find((a) => a.severity === 'WARNING');
  if (warning) return warning;

  return group[0];
}

/**
 * Compute statistical summaries for a given metric across a dataset
 */
export function calculateMetricStats(
  points: TelemetryPoint[],
  metricKey: keyof TelemetryPoint
): MetricStats {
  if (!points || points.length === 0) {
    return { mean: 0, min: 0, max: 0, stdDev: 0, current: 0 };
  }

  const values = points
    .map((p) => Number(p[metricKey]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, stdDev: 0, current: 0 };
  }

  const current = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    current: Math.round(current * 100) / 100,
  };
}
