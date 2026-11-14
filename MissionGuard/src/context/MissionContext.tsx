import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  TelemetryPoint,
  DetectedAnomaly,
  DetectionSettings,
  SimulationConfig,
  MissionStats,
} from '../types/telemetry';
import { generateBaselineTelemetry } from '../utils/telemetryGenerator';
import {
  runAnomalyDetection,
  DEFAULT_DETECTION_SETTINGS,
} from '../utils/anomalyDetector';
import { injectSimulationScenario } from '../utils/simulationEngine';
import { calculateMissionHealth } from '../utils/csvExporter';

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

  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedMetricKey: (metric: keyof TelemetryPoint) => void;
  setSelectedAnomaly: (anomaly: DetectedAnomaly | null) => void;
  setTimeRange: (range: '1h' | '6h' | '12h' | '24h' | 'all') => void;
  setIsComparingBaseline: (comparing: boolean) => void;
  runSimulation: (config: SimulationConfig) => void;
  resetSimulation: () => void;
  updateDetectionSettings: (newSettings: Partial<DetectionSettings>) => void;
  acknowledgeAnomaly: (id: string) => void;
  resolveAnomaly: (id: string, notes?: string) => void;
  loadCustomTelemetry: (points: TelemetryPoint[]) => void;
  resetToNominalBaseline: () => void;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export const MissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Baseline 24-hr orbital telemetry
  const [baselineTelemetry] = useState<TelemetryPoint[]>(() => generateBaselineTelemetry());
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPoint[]>(() => baselineTelemetry);
  const [activeSimulation, setActiveSimulation] = useState<SimulationConfig | null>(null);
  const [isComparingBaseline, setIsComparingBaseline] = useState<boolean>(false);
  const [isCustomDataLoaded, setIsCustomDataLoaded] = useState<boolean>(false);

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
        setActiveTab,
        setSelectedMetricKey,
        setSelectedAnomaly,
        setTimeRange,
        setIsComparingBaseline,
        runSimulation,
        resetSimulation,
        updateDetectionSettings,
        acknowledgeAnomaly,
        resolveAnomaly,
        loadCustomTelemetry,
        resetToNominalBaseline,
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
