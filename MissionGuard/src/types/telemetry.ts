/**
 * MissionGuard Telemetry and Anomaly Detection Type Definitions
 * NASA Space Apps Challenge 2026
 */

export type Subsystem = 'EPS' | 'TCS' | 'ADCS' | 'TT&C' | 'CDH' | 'PAYLOAD';

export type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type AnomalyStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type DetectionMethod = 'THRESHOLD' | 'Z_SCORE' | 'RATE_OF_CHANGE';

export interface TelemetryPoint {
  id: string;
  timestamp: string; // ISO 8601
  metSeconds: number; // Mission Elapsed Time in seconds
  metString: string; // MET formatted e.g. "08:24:00"
  orbitNumber: number;
  orbitalPhase: 'SUNLIGHT' | 'PENUMBRA' | 'ECLIPSE';
  groundPassActive: boolean;

  // Electrical Power System (EPS)
  batteryVoltage: number; // Volts (V)
  batteryCurrent: number; // Amperes (A)
  batteryTemp: number; // Celsius (°C)
  solarArrayPower: number; // Watts (W)
  busVoltage: number; // Main Bus Volts (V)

  // Attitude Determination and Control System (ADCS)
  angularRate: number; // deg/s net magnitude
  angularRateX: number; // deg/s
  angularRateY: number; // deg/s
  angularRateZ: number; // deg/s
  reactionWheelSpeed: number; // RPM

  // Telemetry, Tracking & Command (TT&C)
  commRssi: number; // dBm
  bitErrorRate: number; // e.g. 1e-6

  // Thermal & Payload
  payloadTemp: number; // Celsius (°C)
  avionicsTemp: number; // Celsius (°C)

  // Flag if synthetic injection is present
  isInjectedAnomaly?: boolean;
  anomalyTag?: string;
}

export interface MetricDefinition {
  key: keyof TelemetryPoint;
  name: string;
  subsystem: Subsystem;
  unit: string;
  nominalMin: number;
  nominalMax: number;
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  maxRateOfChange: number; // max allowable change per sample
  description: string;
  color: string;
}

export interface DetectedAnomaly {
  id: string;
  timestamp: string;
  metString: string;
  metricKey: keyof TelemetryPoint;
  metricName: string;
  subsystem: Subsystem;
  severity: AnomalySeverity;
  detectionMethod: DetectionMethod;
  observedValue: number;
  expectedRange: [number, number];
  zScore?: number;
  rateOfChange?: number;
  status: AnomalyStatus;
  explanation: string;
  hypotheses: string[];
  suggestedActions: string[];
  acknowledgedAt?: string;
  resolvedAt?: string;
  operatorNotes?: string;
}

export type FaultScenarioType =
  | 'BATTERY_THERMAL_RUNAWAY'
  | 'SOLAR_ARRAY_DEGRADATION'
  | 'COMM_TRANSPONDER_LOSS'
  | 'REACTION_WHEEL_RUNAWAY'
  | 'POWER_BUS_BROWNOUT';

export interface SimulationConfig {
  scenario: FaultScenarioType;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  startMetMinutes: number;
  durationMinutes: number;
}

export interface DetectionSettings {
  zScoreThreshold: number; // default 2.8
  rateMultiplier: number; // default 1.5
  sensitivity: 'CONSERVATIVE' | 'NOMINAL' | 'AGGRESSIVE';
  enableThresholdCheck: boolean;
  enableZScoreCheck: boolean;
  enableRateCheck: boolean;
  thresholdOverrides: Record<
    string,
    {
      nominalMin?: number;
      nominalMax?: number;
      warningLow?: number;
      warningHigh?: number;
      criticalLow?: number;
      criticalHigh?: number;
      maxRateOfChange?: number;
    }
  >;
}

export interface MissionStats {
  healthScore: number; // 0 - 100
  totalPoints: number;
  activeAnomaliesCount: number;
  criticalCount: number;
  warningCount: number;
  resolvedCount: number;
  orbitCount: number;
  currentOrbit: number;
  orbitalPhase: 'SUNLIGHT' | 'PENUMBRA' | 'ECLIPSE';
  contactStatus: 'AOS' | 'LOS'; // Acquisition of Signal / Loss of Signal
}
