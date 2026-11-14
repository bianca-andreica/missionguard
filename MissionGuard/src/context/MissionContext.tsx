import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import {
  TelemetryPoint,
  DetectedAnomaly,
  DetectionSettings,
  SimulationConfig,
  MissionStats,
} from '../types/telemetry';
import {
  CombustionTelemetryPoint,
  CombustionAnomaly,
  NasaPsiStudyMetadata,
} from '../types/combustion';
import { generateBaselineTelemetry } from '../utils/telemetryGenerator';
import {
  runAnomalyDetection,
  DEFAULT_DETECTION_SETTINGS,
} from '../utils/anomalyDetector';
import { injectSimulationScenario } from '../utils/simulationEngine';
import { calculateMissionHealth } from '../utils/csvExporter';
import { parseNasaSaffireCsv } from '../utils/combustionParser';
import { detectCombustionAnomalies } from '../utils/combustionAnomalyDetector';
import nasaPsiCatalogData from '../data/nasaPsiCatalog.json';

interface MissionContextType {
  baselineTelemetry: TelemetryPoint[];
  currentTelemetry: TelemetryPoint[];
  detectionSettings: DetectionSettings;
  anomalies: DetectedAnomaly[];
  missionStats: MissionStats;
  activeSimulation: SimulationConfig | null;
  isComparingBaseline: boolean;
  selectedMetricKey: keyof TelemetryPoint;
  activeTab: string;
  selectedAnomaly: DetectedAnomaly | null;
  timeRange: '1h' | '6h' | '12h' | '24h' | 'all';
  isCustomDataLoaded: boolean;

  // Real NASA Combustion Data (PSI-100 SAFFIRE-III)
  combustionData: CombustionTelemetryPoint[];
  combustionAnomalies: CombustionAnomaly[];
  combustionLoading: boolean;
  combustionError: string | null;
  combustionSourceLabel: string;
  combustionRawRows: number;
  selectedCombustionAnomaly: CombustionAnomaly | null;
  psiCatalog: NasaPsiStudyMetadata[];

  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedMetricKey: (metric: keyof TelemetryPoint) => void;
  setSelectedAnomaly: (anomaly: DetectedAnomaly | null) => void;
  setSelectedCombustionAnomaly: (anomaly: CombustionAnomaly | null) => void;
  setTimeRange: (range: '1h' | '6h' | '12h' | '24h' | 'all') => void;
  setIsComparingBaseline: (comparing: boolean) => void;
  runSimulation: (config: SimulationConfig) => void;
  resetSimulation: () => void;
  updateDetectionSettings: (newSettings: Partial<DetectionSettings>) => void;
  acknowledgeAnomaly: (id: string) => void;
  resolveAnomaly: (id: string, notes?: string) => void;
  loadCustomTelemetry: (points: TelemetryPoint[]) => void;
  resetToNominalBaseline: () => void;
  loadCustomCombustionCsv: (
    csvText: string,
    fileName: string
  ) => { success: boolean; error?: string; count?: number };
  refreshLiveNasaSaffire: () => Promise<void>;
  resetToVerifiedNasaBaseline: () => Promise<void>;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export const MissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Baseline 24-hr orbital telemetry (Synthetic Demonstration Data)
  const [baselineTelemetry] = useState<TelemetryPoint[]>(() => generateBaselineTelemetry());
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPoint[]>(() => baselineTelemetry);
  const [activeSimulation, setActiveSimulation] = useState<SimulationConfig | null>(null);
  const [isComparingBaseline, setIsComparingBaseline] = useState<boolean>(false);
  const [isCustomDataLoaded, setIsCustomDataLoaded] = useState<boolean>(false);

  // Real NASA Combustion Data State (PSI-100 SAFFIRE-III)
  const [combustionData, setCombustionData] = useState<CombustionTelemetryPoint[]>([]);
  const [combustionLoading, setCombustionLoading] = useState<boolean>(true);
  const [combustionError, setCombustionError] = useState<string | null>(null);
  const [combustionSourceLabel, setCombustionSourceLabel] = useState<string>(
    'NASA PSI-100 (SAFFIRE-III) — Verified Official CSV Extract'
  );
  const [combustionRawRows, setCombustionRawRows] = useState<number>(0);
  const [selectedCombustionAnomaly, setSelectedCombustionAnomaly] =
    useState<CombustionAnomaly | null>(null);
  const [psiCatalog, setPsiCatalog] = useState<NasaPsiStudyMetadata[]>(
    () => nasaPsiCatalogData as unknown as NasaPsiStudyMetadata[]
  );

  // Settings
  const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>(
    DEFAULT_DETECTION_SETTINGS
  );

  // UI Navigation & selection
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedMetricKey, setSelectedMetricKey] = useState<keyof TelemetryPoint>('batteryVoltage');
  const [selectedAnomaly, setSelectedAnomaly] = useState<DetectedAnomaly | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h' | 'all'>('24h');

  // Track status overrides (acknowledged, resolved, notes) across runs
  const [anomalyStatusMap, setAnomalyStatusMap] = useState<
    Record<string, { status: 'ACKNOWLEDGED' | 'RESOLVED'; notes?: string }>
  >({});

  // Load verified NASA PSI-100 SAFFIRE-III CSV extract on mount
  const loadBundledSaffireData = useCallback(async () => {
    setCombustionLoading(true);
    setCombustionError(null);
    try {
      const res = await fetch('/data/PSI-100_Saffire3_ActiveWindow.csv');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching bundled NASA PSI-100 CSV`);
      }
      const csvText = await res.text();
      const parsed = parseNasaSaffireCsv(csvText);
      if (!parsed.success || parsed.points.length === 0) {
        throw new Error(parsed.error || 'Parsed 0 combustion telemetry frames');
      }
      setCombustionData(parsed.points);
      setCombustionRawRows(parsed.rawRowCount);
      setCombustionSourceLabel(
        'NASA PSI-100 (SAFFIRE-III) — Verified Official CSV Extract (psi.nasa.gov)'
      );
    } catch (err: any) {
      setCombustionError(err?.message || 'Failed to load NASA SAFFIRE-III dataset.');
    } finally {
      setCombustionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBundledSaffireData();
  }, [loadBundledSaffireData]);

  // Live fetch from NASA PSI API via server proxy
  const refreshLiveNasaSaffire = useCallback(async () => {
    setCombustionLoading(true);
    setCombustionError(null);
    try {
      const [csvRes, catRes] = await Promise.all([
        fetch('/api/nasa/psi/saffire3'),
        fetch('/api/nasa/psi/catalog'),
      ]);

      if (catRes.ok) {
        const catJson = await catRes.json();
        if (Array.isArray(catJson.studies) && catJson.studies.length > 0) {
          setPsiCatalog(catJson.studies);
        }
      }

      if (!csvRes.ok) {
        throw new Error(`NASA PSI proxy returned HTTP ${csvRes.status}`);
      }
      const csvText = await csvRes.text();
      const parsed = parseNasaSaffireCsv(csvText);
      if (!parsed.success || parsed.points.length === 0) {
        throw new Error(parsed.error || 'Failed to parse live NASA PSI CSV');
      }
      setCombustionData(parsed.points);
      setCombustionRawRows(parsed.rawRowCount);
      setCombustionSourceLabel(
        'Live NASA PSI-100 Stream (psi.nasa.gov/geode-py/ws/studies/PSI-100)'
      );
    } catch (err: any) {
      setCombustionError(
        `Live NASA PSI fetch unavailable (${err?.message}). Retained verified local NASA CSV.`
      );
    } finally {
      setCombustionLoading(false);
    }
  }, []);

  const loadCustomCombustionCsv = useCallback((csvText: string, fileName: string) => {
    const parsed = parseNasaSaffireCsv(csvText);
    if (!parsed.success || parsed.points.length === 0) {
      return {
        success: false,
        error: parsed.error || 'No valid SAFFIRE combustion rows found.',
      };
    }
    setCombustionData(parsed.points);
    setCombustionRawRows(parsed.rawRowCount);
    setCombustionSourceLabel(`User-Imported NASA PSI CSV: ${fileName}`);
    setCombustionError(null);
    return {
      success: true,
      count: parsed.points.length,
    };
  }, []);

  const resetToVerifiedNasaBaseline = useCallback(async () => {
    await loadBundledSaffireData();
  }, [loadBundledSaffireData]);

  // Compute combustion anomalies dynamically when combustionData or Z-score setting changes
  const combustionAnomalies = useMemo(() => {
    return detectCombustionAnomalies(combustionData, detectionSettings.zScoreThreshold);
  }, [combustionData, detectionSettings.zScoreThreshold]);

  // Compute detected anomalies dynamically when currentTelemetry or detectionSettings change
  const anomalies = useMemo(() => {
    const raw = runAnomalyDetection(currentTelemetry, detectionSettings);

    // Apply any user acknowledgments/resolutions
    return raw.map((a) => {
      const override = anomalyStatusMap[a.id];
      if (override) {
        return {
          ...a,
          status: override.status,
          operatorNotes: override.notes,
        };
      }
      return a;
    });
  }, [currentTelemetry, detectionSettings, anomalyStatusMap]);

  // Compute mission statistics
  const missionStats: MissionStats = useMemo(() => {
    const health = calculateMissionHealth(anomalies);
    const lastPoint = currentTelemetry[currentTelemetry.length - 1] || baselineTelemetry[0];
    const critical = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;
    const warning = anomalies.filter((a) => a.severity === 'WARNING' && a.status === 'ACTIVE').length;
    const resolved = anomalies.filter((a) => a.status === 'RESOLVED').length;

    return {
      healthScore: health,
      totalPoints: currentTelemetry.length,
      activeAnomaliesCount: critical + warning,
      criticalCount: critical,
      warningCount: warning,
      resolvedCount: resolved,
      orbitCount: 16,
      currentOrbit: lastPoint.orbitNumber,
      orbitalPhase: lastPoint.orbitalPhase,
      contactStatus: lastPoint.groundPassActive ? 'AOS' : 'LOS',
    };
  }, [anomalies, currentTelemetry, baselineTelemetry]);

  // Actions
  const runSimulation = useCallback(
    (config: SimulationConfig) => {
      setActiveSimulation(config);
      const simulated = injectSimulationScenario(baselineTelemetry, config);
      setCurrentTelemetry(simulated);
    },
    [baselineTelemetry]
  );

  const resetSimulation = useCallback(() => {
    setActiveSimulation(null);
    setIsComparingBaseline(false);
    setCurrentTelemetry(baselineTelemetry);
  }, [baselineTelemetry]);

  const updateDetectionSettings = useCallback((newSettings: Partial<DetectionSettings>) => {
    setDetectionSettings((prev) => ({
      ...prev,
      ...newSettings,
      thresholdOverrides: {
        ...prev.thresholdOverrides,
        ...(newSettings.thresholdOverrides || {}),
      },
    }));
  }, []);

  const acknowledgeAnomaly = useCallback((id: string) => {
    setAnomalyStatusMap((prev) => ({
      ...prev,
      [id]: { status: 'ACKNOWLEDGED' },
    }));
  }, []);

  const resolveAnomaly = useCallback((id: string, notes?: string) => {
    setAnomalyStatusMap((prev) => ({
      ...prev,
      [id]: { status: 'RESOLVED', notes },
    }));
  }, []);

  const loadCustomTelemetry = useCallback((points: TelemetryPoint[]) => {
    setIsCustomDataLoaded(true);
    setActiveSimulation(null);
    setCurrentTelemetry(points);
  }, []);

  const resetToNominalBaseline = useCallback(() => {
    setActiveSimulation(null);
    setIsComparingBaseline(false);
    setIsCustomDataLoaded(false);
    setAnomalyStatusMap({});
    setDetectionSettings(DEFAULT_DETECTION_SETTINGS);
    setCurrentTelemetry(baselineTelemetry);
  }, [baselineTelemetry]);

  return (
    <MissionContext.Provider
      value={{
        baselineTelemetry,
        currentTelemetry,
        detectionSettings,
        anomalies,
        missionStats,
        activeSimulation,
        isComparingBaseline,
        selectedMetricKey,
        activeTab,
        selectedAnomaly,
        timeRange,
        isCustomDataLoaded,
        combustionData,
        combustionAnomalies,
        combustionLoading,
        combustionError,
        combustionSourceLabel,
        combustionRawRows,
        selectedCombustionAnomaly,
        psiCatalog,
        setActiveTab,
        setSelectedMetricKey,
        setSelectedAnomaly,
        setSelectedCombustionAnomaly,
        setTimeRange,
        setIsComparingBaseline,
        runSimulation,
        resetSimulation,
        updateDetectionSettings,
        acknowledgeAnomaly,
        resolveAnomaly,
        loadCustomTelemetry,
        resetToNominalBaseline,
        loadCustomCombustionCsv,
        refreshLiveNasaSaffire,
        resetToVerifiedNasaBaseline,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
};

export function useMission(): MissionContextType {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
}
