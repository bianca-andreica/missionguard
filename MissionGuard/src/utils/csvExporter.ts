import { TelemetryPoint, DetectedAnomaly, MissionStats } from '../types/telemetry';

/**
 * Converts telemetry points into CSV format string
 */
export function exportTelemetryToCSV(points: TelemetryPoint[]): string {
  const headers = [
    'timestamp',
    'metString',
    'metSeconds',
    'orbitNumber',
    'orbitalPhase',
    'batteryVoltage_V',
    'batteryCurrent_A',
    'batteryTemp_C',
    'solarArrayPower_W',
    'busVoltage_V',
    'angularRate_deg_s',
    'reactionWheelSpeed_RPM',
    'commRssi_dBm',
    'bitErrorRate',
    'payloadTemp_C',
    'avionicsTemp_C',
    'isInjectedAnomaly',
    'anomalyTag',
  ];

  const rows = points.map((p) => [
    p.timestamp,
    p.metString,
    p.metSeconds,
    p.orbitNumber,
    p.orbitalPhase,
    p.batteryVoltage,
    p.batteryCurrent,
    p.batteryTemp,
    p.solarArrayPower,
    p.busVoltage,
    p.angularRate,
    p.reactionWheelSpeed,
    p.commRssi,
    p.bitErrorRate,
    p.payloadTemp,
    p.avionicsTemp,
    p.isInjectedAnomaly ? 'true' : 'false',
    p.anomalyTag || '',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Triggers a browser download of text data
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses a CSV string into TelemetryPoint array
 */
export function parseCSVTelemetry(csvText: string): {
  success: boolean;
  points?: TelemetryPoint[];
  error?: string;
  rowCount?: number;
} {
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'CSV file contains no data rows.' };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    // Check essential columns
    const hasTimestamp = headers.some((h) => h.includes('time') || h.includes('timestamp'));
    const hasVoltage = headers.some((h) => h.includes('voltage') || h.includes('battery'));

    if (!hasTimestamp && !hasVoltage) {
      return {
        success: false,
        error: 'Missing required telemetry columns (timestamp, voltage, etc.).',
      };
    }

    const points: TelemetryPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map((v) => v.trim());

      const getVal = (colMatch: string, fallback: number = 0): number => {
        const idx = headers.findIndex((h) => h.includes(colMatch));
        if (idx !== -1 && values[idx] !== undefined) {
          const num = parseFloat(values[idx]);
          return isNaN(num) ? fallback : num;
        }
        return fallback;
      };

      const timeIdx = headers.findIndex((h) => h.includes('timestamp') || h.includes('time'));
      const timestamp =
        timeIdx !== -1 && values[timeIdx]
          ? values[timeIdx]
          : new Date(Date.now() - (lines.length - i) * 120000).toISOString();

      const metSec = getVal('metsec', (i - 1) * 120);
      const hours = Math.floor(metSec / 3600);
      const minutes = Math.floor((metSec % 3600) / 60);
      const seconds = Math.floor(metSec % 60);
      const metString = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      points.push({
        id: `uploaded-${i}`,
        timestamp,
        metSeconds: metSec,
        metString,
        orbitNumber: Math.floor(getVal('orbit', 1)),
        orbitalPhase: (values[headers.findIndex((h) => h.includes('phase'))] as any) || 'SUNLIGHT',
        groundPassActive: getVal('solar', 300) > 0,
        batteryVoltage: getVal('batteryvoltage', 28.0),
        batteryCurrent: getVal('batterycurrent', 5.0),
        batteryTemp: getVal('batterytemp', 20.0),
        solarArrayPower: getVal('solar', 400.0),
        busVoltage: getVal('bus', 28.0),
        angularRate: getVal('angular', 0.05),
        angularRateX: 0.01,
        angularRateY: 0.01,
        angularRateZ: 0.01,
        reactionWheelSpeed: getVal('wheel', 2200),
        commRssi: getVal('rssi', -85.0),
        bitErrorRate: 1e-6,
        payloadTemp: getVal('payload', 12.0),
        avionicsTemp: getVal('avionics', 21.0),
        isInjectedAnomaly: false,
      });
    }

    return {
      success: true,
      points,
      rowCount: points.length,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse CSV: ${err.message || String(err)}`,
    };
  }
}

/**
 * Calculates deterministic mission health index
 */
export function calculateMissionHealth(anomalies: DetectedAnomaly[]): number {
  let score = 100;
  for (const anom of anomalies) {
    if (anom.status === 'RESOLVED') continue;

    const penaltyWeight = anom.status === 'ACKNOWLEDGED' ? 0.6 : 1.0;

    if (anom.severity === 'CRITICAL') {
      score -= 22 * penaltyWeight;
    } else if (anom.severity === 'WARNING') {
      score -= 9 * penaltyWeight;
    } else {
      score -= 3 * penaltyWeight;
    }
  }

  return Math.max(12, Math.min(100, Math.round(score)));
}

/**
 * Generates an engineering anomaly report JSON
 */
export function generateAnomalyReportJSON(
  anomalies: DetectedAnomaly[],
  stats: MissionStats
): string {
  const report = {
    reportTitle: 'MissionGuard Spacecraft Telemetry Anomaly Report',
    conference: 'NASA Space Apps Challenge 2026',
    generatedAt: new Date().toISOString(),
    missionStats: stats,
    detectedAnomaliesCount: anomalies.length,
    activeAnomalies: anomalies.filter((a) => a.status === 'ACTIVE').length,
    acknowledgedAnomalies: anomalies.filter((a) => a.status === 'ACKNOWLEDGED').length,
    resolvedAnomalies: anomalies.filter((a) => a.status === 'RESOLVED').length,
    anomalies: anomalies.map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      missionElapsedTime: a.metString,
      subsystem: a.subsystem,
      metric: a.metricName,
      severity: a.severity,
      detectionMethod: a.detectionMethod,
      observedValue: a.observedValue,
      nominalBounds: a.expectedRange,
      zScore: a.zScore ?? null,
      rateOfChange: a.rateOfChange ?? null,
      status: a.status,
      hypotheses: a.hypotheses,
      investigationSteps: a.suggestedActions,
      operatorNotes: a.operatorNotes ?? '',
    })),
  };

  return JSON.stringify(report, null, 2);
}
