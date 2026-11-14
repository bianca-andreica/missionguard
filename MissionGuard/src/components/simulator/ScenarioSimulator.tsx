import React, { useState, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  GitCompare,
  AlertTriangle,
  Zap,
  Flame,
  Sun,
  Radio,
  Compass,
  CheckCircle2,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from 'recharts';
import { useMission } from '../../context/MissionContext';
import {
  SCENARIO_CATALOG,
  ScenarioMeta,
} from '../../utils/simulationEngine';
import { FaultScenarioType, SimulationConfig } from '../../types/telemetry';
import { METRIC_DEFINITIONS } from '../../utils/telemetryGenerator';

export const ScenarioSimulator: React.FC = () => {
  const {
    baselineTelemetry,
    currentTelemetry,
    activeSimulation,
    isComparingBaseline,
    setIsComparingBaseline,
    runSimulation,
    resetSimulation,
    anomalies,
  } = useMission();

  const [selectedScenario, setSelectedScenario] = useState<FaultScenarioType>(
    activeSimulation?.scenario || 'BATTERY_THERMAL_RUNAWAY'
  );
  const [severity, setSeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE'>(
    activeSimulation?.severity || 'MODERATE'
  );
  const [startMetMinutes, setStartMetMinutes] = useState<number>(
    activeSimulation?.startMetMinutes || 600 // 10:00 MET
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    activeSimulation?.durationMinutes || 45
  );

  const scenarioMeta: ScenarioMeta = SCENARIO_CATALOG[selectedScenario];

  // Determine primary metric to compare on chart for the selected scenario
  const targetMetricKey = useMemo(() => {
    switch (selectedScenario) {
      case 'BATTERY_THERMAL_RUNAWAY':
        return 'batteryTemp';
      case 'SOLAR_ARRAY_DEGRADATION':
        return 'solarArrayPower';
      case 'COMM_TRANSPONDER_LOSS':
        return 'commRssi';
      case 'REACTION_WHEEL_RUNAWAY':
        return 'angularRate';
      case 'POWER_BUS_BROWNOUT':
        return 'busVoltage';
      default:
        return 'batteryTemp';
    }
  }, [selectedScenario]);

  const metricDef = METRIC_DEFINITIONS[targetMetricKey as string] || METRIC_DEFINITIONS.batteryTemp;

  const handleRunSimulation = () => {
    const config: SimulationConfig = {
      scenario: selectedScenario,
      severity,
      startMetMinutes,
      durationMinutes,
    };
    runSimulation(config);
  };

  // Compare telemetry points (baseline vs current)
  const comparisonData = useMemo(() => {
    // Downsample to 120 points for fast rendering
    const step = Math.max(1, Math.floor(baselineTelemetry.length / 120));
    return baselineTelemetry
      .filter((_, idx) => idx % step === 0)
      .map((basePt) => {
        const simPt = currentTelemetry.find((p) => p.metString === basePt.metString) || basePt;
        return {
          metString: basePt.metString,
          baselineValue: Number(basePt[targetMetricKey as keyof typeof basePt]) || 0,
          simulatedValue: Number(simPt[targetMetricKey as keyof typeof simPt]) || 0,
          isInjected: simPt.isInjectedAnomaly,
        };
      });
  }, [baselineTelemetry, currentTelemetry, targetMetricKey]);

  // Anomalies specifically tagged from simulation
  const simulationAnomalies = useMemo(() => {
    return anomalies.filter((a) => a.metricKey === targetMetricKey && a.status === 'ACTIVE');
  }, [anomalies, targetMetricKey]);

  const scenarioIcons: Record<FaultScenarioType, any> = {
    BATTERY_THERMAL_RUNAWAY: Flame,
    SOLAR_ARRAY_DEGRADATION: Sun,
    COMM_TRANSPONDER_LOSS: Radio,
    REACTION_WHEEL_RUNAWAY: Compass,
    POWER_BUS_BROWNOUT: Zap,
  };

  const getFormatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Introduction Card */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Spacecraft Fault Scenario Simulator</span>
            <span className="text-xs font-mono text-cyan-400 font-normal">
              [Deterministic Physics Engine]
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Inject hypothetical anomalies into spacecraft subsystems to evaluate real-time detector
            sensitivity, Z-score responses, and autonomous contingency procedures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComparingBaseline(!isComparingBaseline)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
              isComparingBaseline
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#0e162d] text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{isComparingBaseline ? 'Hide Baseline Compare' : 'Compare with Baseline'}</span>
          </button>

          <button
            onClick={resetSimulation}
            disabled={!activeSimulation}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e162d] hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </button>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.keys(SCENARIO_CATALOG).map((key) => {
          const type = key as FaultScenarioType;
          const meta = SCENARIO_CATALOG[type];
          const Icon = scenarioIcons[type];
          const isSelected = selectedScenario === type;
          const isLive = activeSimulation?.scenario === type;

          return (
            <button
              key={type}
              onClick={() => setSelectedScenario(type)}
              className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all relative ${
                isSelected
                  ? 'bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-950/20'
                  : 'bg-[#0b1328] border-slate-800 hover:border-slate-700'
              }`}
            >
              {isLive && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{meta.subsystem}</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">{meta.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {meta.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-cyan-400">
                {isSelected ? '✓ Selected' : 'Click to select'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Simulator Control Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Simulation Injection Controls</span>
            </h3>
            {activeSimulation && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ACTIVE
              </span>
            )}
          </div>

          {/* Severity selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Fault Severity Level:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['MILD', 'MODERATE', 'SEVERE'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverity(sev)}
                  className={`py-2 text-xs font-mono font-medium rounded-lg border transition-colors ${
                    severity === sev
                      ? sev === 'SEVERE'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : sev === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-[#0e162d] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Start Time Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Injection Onset (MET):</span>
              <span className="font-mono text-cyan-300 font-semibold">
                MET {getFormatTime(startMetMinutes)}:00 ({startMetMinutes}m)
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={1320}
              step={30}
              value={startMetMinutes}
              onChange={(e) => setStartMetMinutes(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>MET 01:00</span>
              <span>MET 12:00</span>
              <span>MET 22:00</span>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Fault Duration:</span>
              <span className="font-mono text-cyan-300 font-semibold">
                {durationMinutes} Minutes
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>15 min</span>
              <span>60 min</span>
              <span>120 min</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleRunSimulation}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Inject Fault Scenario into Telemetry</span>
          </button>
        </div>

        {/* Physics Mechanism & Real-Time Anomaly Output */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  {scenarioMeta.title} · Aerospace Domain Overview
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Primary Telemetry Impact: {metricDef.name} ({metricDef.unit})
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Subsystem: {scenarioMeta.subsystem}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0e162d] p-3.5 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-amber-300 block">Physical Failure Mechanism:</span>
                <p className="text-slate-300 leading-relaxed">
                  {scenarioMeta.physicalMechanism}
                </p>
              </div>

              <div className="bg-[#0e162d] p-3.5 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-cyan-300 block">Flight Controller Procedure:</span>
                <p className="text-slate-300 leading-relaxed">
                  {scenarioMeta.nominalRecovery}
                </p>
              </div>
            </div>

            {/* Anomaly Detection Response Badge */}
            <div className="p-3.5 bg-[#0e162d]/70 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-200">
                  Anomaly Detection Engine Status for {metricDef.name}:
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                  simulationAnomalies.length > 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {simulationAnomalies.length > 0
                  ? `${simulationAnomalies.length} ALERTS FLAGGED IN TELEMETRY`
                  : 'NOMINAL (NO THRESHOLD BREACH)'}
              </span>
            </div>
          </div>

          {/* Baseline Comparison Chart */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wide">
                  {isComparingBaseline
                    ? `Baseline vs. Injected Divergence: ${metricDef.name}`
                    : `Telemetry Stream: ${metricDef.name}`}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  Dashed line = Nominal Baseline · Solid line = Active Spacecraft Telemetry
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400">{metricDef.unit}</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metString" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d152a', borderColor: '#334155', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                  {/* Baseline line */}
                  <Line
                    type="monotone"
                    dataKey="baselineValue"
                    stroke="#34d399"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="Nominal Baseline"
                  />

                  {/* Active / Injected line */}
                  <Line
                    type="monotone"
                    dataKey="simulatedValue"
                    stroke={activeSimulation ? '#f43f5e' : '#38bdf8'}
                    strokeWidth={2}
                    dot={false}
                    name={activeSimulation ? 'Simulated Fault Telemetry' : 'Active Telemetry'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
