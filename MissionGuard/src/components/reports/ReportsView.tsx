import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileText,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';
import {
  exportTelemetryToCSV,
  downloadFile,
  generateAnomalyReportJSON,
} from '../../utils/csvExporter';
import { exportCombustionPointsToCSV } from '../../utils/combustionParser';
import { generateBaselineTelemetry } from '../../utils/telemetryGenerator';

export const ReportsView: React.FC = () => {
  const { currentTelemetry, anomalies, missionStats, combustionData, combustionAnomalies } = useMission();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const showSuccessNotice = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadTelemetryCSV = () => {
    const csv = exportTelemetryToCSV(currentTelemetry);
    downloadFile(csv, `MissionGuard_Telemetry_24h_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    showSuccessNotice('Telemetry CSV successfully exported.');
  };

  const handleDownloadSampleCSV = () => {
    // Generate clean sample slice (2 hours = 60 points)
    const sampleSlice = generateBaselineTelemetry().slice(0, 60);
    const csv = exportTelemetryToCSV(sampleSlice);
    downloadFile(csv, 'MissionGuard_Sample_Telemetry_Template.csv', 'text/csv');
    showSuccessNotice('Sample Telemetry Template CSV exported.');
  };

  const handleDownloadJSONReport = () => {
    const jsonStr = generateAnomalyReportJSON(anomalies, missionStats);
    downloadFile(
      jsonStr,
      `MissionGuard_Anomaly_Report_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    showSuccessNotice('Anomaly Incident JSON Report exported.');
  };

  const handleDownloadCombustionCSV = () => {
    const csv = exportCombustionPointsToCSV(combustionData);
    downloadFile(csv, 'NASA_PSI100_SAFFIRE3_Aligned_Telemetry.csv', 'text/csv');
    showSuccessNotice('Real NASA PSI-100 SAFFIRE-III aligned CSV exported.');
  };

  const handleDownloadCombustionJSON = () => {
    const payload = JSON.stringify(
      {
        source: 'NASA Physical Sciences Informatics (PSI-100: SAFFIRE-III)',
        doi: '10.60555/040q-4h36',
        portalUrl: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-100',
        alignedFrames: combustionData.length,
        detectedCombustionEvents: combustionAnomalies,
      },
      null,
      2
    );
    downloadFile(payload, 'NASA_PSI100_SAFFIRE3_FireSafety_Insights.json', 'application/json');
    showSuccessNotice('NASA SAFFIRE-III Fire Safety Insights JSON exported.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Top Banner and Download Actions */}
      <div className="no-print bg-[#0b1328] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Mission Telemetry Reports & Data Export</span>
            <span className="text-xs font-mono text-cyan-400 font-normal">
              [Scientific Telemetry Provenance]
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Generate audit packages, telemetry datasets, and flight incident reports for
            evaluation by NASA Space Apps Challenge judges.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDownloadTelemetryCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>Full CSV Telemetry</span>
          </button>

          <button
            onClick={handleDownloadSampleCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Sample Template</span>
          </button>

          <button
            onClick={handleDownloadJSONReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            <FileCode className="w-4 h-4 text-purple-400" />
            <span>Incident JSON</span>
          </button>

          <button
            onClick={handleDownloadCombustionCSV}
            disabled={combustionData.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>NASA SAFFIRE-III CSV</span>
          </button>

          <button
            onClick={handleDownloadCombustionJSON}
            disabled={combustionData.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <FileCode className="w-4 h-4 text-orange-400" />
            <span>Combustion JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Flight Briefing</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="no-print p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Printable Mission Telemetry Briefing Sheet */}
      <div className="bg-[#0b1328] border border-slate-800 print-card rounded-xl p-8 space-y-6">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                Official Flight Report · Form MG-2026-A
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Spacecraft Telemetry Status & Anomaly Incident Brief
            </h1>
            <p className="text-xs text-slate-400">
              NASA Space Apps Challenge 2026 · Target: AURA-SAT-4 (LEO 415 km, 51.6° Inclination)
            </p>
          </div>

          <div className="text-right font-mono text-xs text-slate-400 space-y-1">
            <div>GENERATED: {new Date().toUTCString()}</div>
            <div>STATUS: ORBIT {missionStats.currentOrbit} ({missionStats.orbitalPhase})</div>
            <div className="text-cyan-400 font-bold">HEALTH INDEX: {missionStats.healthScore}%</div>
          </div>
        </div>

        {/* Scientific Honesty & Provenance Statement */}
        <div className="bg-[#0e162d] p-4 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Info className="w-4 h-4" />
            <span>Data Provenance & Scientific Honesty Notice</span>
          </div>
          <p className="leading-relaxed">
            <strong>1. Real NASA Experimental Data:</strong> Microgravity combustion measurements in the{' '}
            <em>NASA Combustion Data</em> section originate directly from NASA Physical Sciences Informatics
            Investigation <strong>PSI-100 (SAFFIRE-III, DOI: 10.60555/040q-4h36)</strong> via{' '}
            <span className="font-mono text-cyan-300">psi.nasa.gov</span>.
          </p>
          <p className="leading-relaxed">
            <strong>2. Synthetic Spacecraft Demonstration Data:</strong> All AURA-SAT-4 orbital telemetry
            metrics below are generated by a deterministic 92.8-minute LEO orbital simulator for fault
            detection demonstration. Spacecraft battery/RSSI limits are never applied to combustion data.
          </p>
          <p className="leading-relaxed">
            <strong>3. AI-Generated Hypotheses:</strong> All potential root causes and fire-safety insights
            are presented strictly as <strong>working engineering hypotheses</strong> with explicit
            sensor limitations.
          </p>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">MISSION HEALTH SCORE</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {missionStats.healthScore}%
            </div>
          </div>

          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">ACTIVE CRITICAL ALERTS</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {missionStats.criticalCount}
            </div>
          </div>

          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">TOTAL DATA FRAMES</div>
            <div className="text-2xl font-bold text-white mt-1">
              {missionStats.totalPoints}
            </div>
          </div>

          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">RESOLVED INCIDENTS</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {missionStats.resolvedCount}
            </div>
          </div>
        </div>

        {/* Anomaly Incident Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Detected Anomaly Incident Register
          </h3>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e162d] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">MET</th>
                  <th className="py-2.5 px-3">SUBSYSTEM</th>
                  <th className="py-2.5 px-3">METRIC</th>
                  <th className="py-2.5 px-3">SEVERITY</th>
                  <th className="py-2.5 px-3">OBSERVED</th>
                  <th className="py-2.5 px-3">METHOD</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {anomalies.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-cyan-300 font-semibold">{a.metString}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-bold">{a.subsystem}</td>
                    <td className="py-2.5 px-3 text-white">{a.metricName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          a.severity === 'CRITICAL'
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">{a.observedValue}</td>
                    <td className="py-2.5 px-3 text-slate-400">{a.detectionMethod}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          a.status === 'RESOLVED'
                            ? 'text-emerald-400'
                            : a.status === 'ACKNOWLEDGED'
                            ? 'text-blue-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Investigation & Hypotheses Log */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Detailed Diagnostic Findings & Working Hypotheses
          </h3>

          <div className="space-y-3">
            {anomalies.map((a, idx) => (
              <div
                key={a.id}
                className="bg-[#0e162d] border border-slate-800 rounded-lg p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    Incident #{idx + 1}: {a.metricName} ({a.subsystem}) at MET {a.metString}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Expected Nominal: {a.expectedRange[0]} to {a.expectedRange[1]}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{a.explanation}</p>

                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <div className="font-semibold text-amber-300">Hypotheses Considered:</div>
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                    {a.hypotheses.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <div className="font-semibold text-cyan-300">Contingency Procedures:</div>
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                    {a.suggestedActions.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>

                {a.operatorNotes && (
                  <div className="pt-2 border-t border-slate-800/80 text-emerald-400 font-mono text-[11px]">
                    Operator Resolution Note: {a.operatorNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Real NASA PSI-100 SAFFIRE-III Summary */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Real NASA PSI-100 (SAFFIRE-III) Microgravity Combustion Findings</span>
          </h3>
          <p className="text-xs text-slate-400">
            Verified experimental telemetry frames loaded: <strong className="text-white">{combustionData.length}</strong>{' '}
            · Combustion events detected: <strong className="text-white">{combustionAnomalies.length}</strong> · Source:
            NASA PSI (<span className="font-mono">psi.nasa.gov/physci/repo/data/investigations/PSI-100</span>).
          </p>
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e162d] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">TIME</th>
                  <th className="py-2 px-3">CHANNEL</th>
                  <th className="py-2 px-3">METHOD</th>
                  <th className="py-2 px-3">OBSERVED</th>
                  <th className="py-2 px-3">MEASURED FACT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {combustionAnomalies.slice(0, 10).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-cyan-300">{c.elapsedLabel}</td>
                    <td className="py-2 px-3 text-white font-semibold">{c.channelName}</td>
                    <td className="py-2 px-3 text-amber-300">{c.method}</td>
                    <td className="py-2 px-3 text-white font-bold">{c.observedValue}</td>
                    <td className="py-2 px-3 text-slate-300 font-sans">{c.measuredFact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sign-Off Footer */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div>MissionGuard Autonomous Flight &amp; Fire-Safety Monitor</div>
          <div>NASA Space Apps Challenge 2026 Evaluation Ready</div>
        </div>
      </div>
    </div>
  );
};
