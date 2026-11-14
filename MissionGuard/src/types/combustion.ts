/**
 * Real NASA Physical Sciences Informatics (PSI) Microgravity Combustion Types
 * Source: NASA PSI-100 (SAFFIRE-III), DOI: 10.60555/040q-4h36
 */

export interface NasaPsiContact {
  firstName: string;
  lastName: string;
  midInitials?: string;
  affiliation?: string;
  email?: string;
  roles?: Array<{ annotationValue: string }>;
}

export interface NasaPsiPublication {
  authorList: string;
  title: string;
  doi?: string;
}

export interface NasaPsiCsvFile {
  fileName: string;
  fileSize: number;
  remoteUrl?: string;
}

export interface NasaPsiStudyMetadata {
  accession: string;
  acronym: string;
  title: string;
  doi: string;
  licenseName: string;
  licenseIdentifier: string;
  managingNasaCenter: string;
  flightProgram: string;
  experimentHardware: string;
  experimentHardwareLink: string;
  researchArea: string;
  subResearchArea: string;
  investigationStartDate: string;
  releaseDate: string;
  objective: string;
  approach: string;
  hypothesis: string;
  researchImpacts: string;
  contacts: NasaPsiContact[];
  publications: NasaPsiPublication[];
  portalUrl: string;
  apiUrl: string;
  totalFilesCount: number;
  csvFiles: NasaPsiCsvFile[];
}

/**
 * Aligned telemetry frame parsed directly from NASA PSI-100 SAFFIRE-III CSV
 * (`PSI-100_Raw Data_Saffire_Data_Table2017.161.00.42.03-EU.csv`).
 *
 * Note on asynchronous packet merging in the official NASA CSV:
 * Saffire payload packets (radiometers, anemometers, igniters, fan tachometer)
 * and Cygnus vehicle packets (cabin pressure, ETS temp, smoke detectors, IMU)
 * are interleaved by timestamp in the raw table. Each aligned frame preserves
 * the exact measured values from the corresponding sensor packets without
 * synthesizing measurements.
 */
export interface CombustionTelemetryPoint {
  id: string;
  rowIndex: number;
  relativeSeconds: number; // RelativeSeconds / 1000 -> seconds from start of table
  elapsedLabel: string; // e.g., "5956.8s"
  cygnusTimestampMs: number;
  saffireTimestampMs: number;

  // Saffire-III Flame & Flow Sensors (null when row is a Cygnus-only packet or uninitialized sentinel)
  radiometer1: number | null;
  radiometer2: number | null;
  radiometer3: number | null;
  radiometer4: number | null;
  radiometerPeak: number | null;
  anemometer1: number | null; // cm/s airflow
  anemometer2: number | null; // cm/s airflow
  fanTachometer: number | null; // RPM
  smokeWireCurrent: number | null; // A
  sample1IgniterVoltage: number | null; // V
  sample1IgniterCurrent: number | null; // A
  sample2IgniterVoltage: number | null; // V
  sample2IgniterCurrent: number | null; // A

  // Cygnus Vehicle Environmental & Smoke Detection Sensors (null when packet field is 0 / absent)
  cabinTemp: number | null; // P@PCM_ETS_TEMP_SIG (°C)
  cabinPressure1: number | null; // P@F1PCM_AIR_PRES_EPS1_SIG_POS (psia)
  smokeObscuration2: number | null; // P@CDH_F2PCM_SMK_DET_OBS_SENS_P
  smokeScattering2: number | null; // P@CDH_F2PCM_SMK_DET_SCAT_SENS_P
  eclsFanPressure2: number | null; // P@CDH_F2PCM_ECLS_FAN_PRESSURE_P
  imuAccelMag: number | null; // g-magnitude from 3-axis IMU
}

export type CombustionAnomalyMethod =
  | 'IGNITER_ACTIVATION'
  | 'RADIOMETRIC_EXCURSION'
  | 'SMOKE_BREAKTHROUGH'
  | 'FLOW_PERTURBATION';

export type CombustionSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface CombustionAnomaly {
  id: string;
  relativeSeconds: number;
  elapsedLabel: string;
  channelKey: keyof CombustionTelemetryPoint;
  channelName: string;
  severity: CombustionSeverity;
  method: CombustionAnomalyMethod;
  observedValue: number;
  baselineContext: string;
  zScore?: number;
  measuredFact: string; // Strictly what the NASA sensor recorded
  aiHypotheses: string[]; // Clearly separated AI/engineering interpretations
  fireSafetyImplications: string[];
  uncertaintyNote: string;
}
