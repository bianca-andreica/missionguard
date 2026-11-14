import React from 'react';
import {
  RotateCcw,
  Download,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';
import { exportTelemetryToCSV, downloadFile } from '../../utils/csvExporter';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const {
    missionStats,
    activeSimulation,
    resetSimulation,
    timeRange,
    setTimeRange,
    currentTelemetry,
    resetToNominalBaseline,
    isCustomDataLoaded,
  } = useMission();

  const handleExportCSV = () => {
    const csv = exportTelemetryToCSV(currentTelemetry);
    const filename = `missionguard_telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv');
  };

  const getHealthColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <header className="bg-[#0a1020]/90 backdrop-blur border-b border-slate-800 px-6 py-4 sticky top-0 z-30 flex flex-col gap-3">
      {/* Top Banner if Simulation is actively injecting faults */}
      {activeSimulation && (
        <div className="bg-amber-950/60 border border-amber-500/40 text-amber-200 px-4 py-2 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>FAULT SIMULATION ACTIVE:</strong> {activeSimulation.scenario} (Severity:{' '}
              {activeSimulation.severity}, MET {activeSimulation.startMetMinutes}m to{' '}
              {activeSimulation.startMetMinutes + activeSimulation.durationMinutes}m)
            </span>
          </div>
          <button
            onClick={resetSimulation}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-medium transition-colors"
          >
            Revert to Baseline
          </button>
        </div>
      )}

      {isCustomDataLoaded && !activeSimulation && (
        <div className="bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 px-4 py-2 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>CUSTOM DATASET LOADED:</strong> Displaying {currentTelemetry.length} user
              telemetry records.
            </span>
          </div>
          <button
            onClick={resetToNominalBaseline}
            className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-xs font-medium transition-colors"
          >
            Restore Default Baseline
          </button>
        </div>
      )}

      {/* Main Header Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {title}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Orbital Solar Phase indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e162d] border border-slate-800 rounded-lg text-xs text-slate-300">
            {missionStats.orbitalPhase === 'SUNLIGHT' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px]">SUNLIGHT · 100% SOLAR</span>
              </>
            ) : missionStats.orbitalPhase === 'PENUMBRA' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-300/60" />
                <span className="font-mono text-[11px]">PENUMBRA TRANSITION</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-mono text-[11px]">ECLIPSE UMBRA (BATTERY DRAIN)</span>
              </>
            )}
          </div>

          {/* Mission Health Metric */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-medium ${getHealthColor(
              missionStats.healthScore
            )}`}
          >
            <span>HEALTH:</span>
            <span className="text-sm font-bold">{missionStats.healthScore}%</span>
          </div>

          {/* Time range selector */}
          <div className="flex items-center bg-[#0e162d] p-1 border border-slate-800 rounded-lg text-xs">
            {(['1h', '6h', '12h', '24h', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  timeRange === r
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              title="Export current telemetry to CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e162d] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={resetToNominalBaseline}
              title="Reset telemetry and thresholds to factory default"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e162d] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
