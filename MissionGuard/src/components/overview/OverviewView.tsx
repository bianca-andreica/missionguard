import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Zap,
  Thermometer,
  Sun,
  Compass,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';
import { METRIC_DEFINITIONS } from '../../utils/telemetryGenerator';
import { DetectedAnomaly } from '../../types/telemetry';

export const OverviewView: React.FC = () => {
  const {
    currentTelemetry,
    anomalies,
    missionStats,
    timeRange,
    setActiveTab,
    setSelectedAnomaly,
    setSelectedMetricKey,
  } = useMission();

  // Filter telemetry points by selected timeRange
  const filteredTelemetry = useMemo(() => {
    if (timeRange === 'all' || timeRange === '24h') return currentTelemetry;
    const countMap: Record<string, number> = {
      '1h': 30, // 30 samples @ 2min
      '6h': 180,
      '12h': 360,
    };
    const count = countMap[timeRange] || currentTelemetry.length;
    return currentTelemetry.slice(-count);
  }, [currentTelemetry, timeRange]);

  const activeAnomalies = useMemo(
    () => anomalies.filter((a) => a.status === 'ACTIVE'),
    [anomalies]
  );

  const criticalAnomalies = useMemo(
    () => anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE'),
    [anomalies]
  );

  // Subsystem statuses
  const subsystems = useMemo(() => {
    const list = [
      { id: 'EPS', name: 'Electrical Power', icon: Zap },
      { id: 'TCS', name: 'Thermal Control', icon: Thermometer },
      { id: 'ADCS', name: 'Attitude & Control', icon: Compass },
      { id: 'TT&C', name: 'Telemetry & Command', icon: Radio },
      { id: 'CDH', name: 'Command & Data', icon: Cpu },
    ];

    return list.map((sub) => {
      const subAnomalies = activeAnomalies.filter((a) => a.subsystem === sub.id);
      const isCritical = subAnomalies.some((a) => a.severity === 'CRITICAL');
      const isWarning = subAnomalies.some((a) => a.severity === 'WARNING');

      let statusText = 'NOMINAL';
      let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      if (isCritical) {
        statusText = 'CRITICAL ALERT';
        statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      } else if (isWarning) {
        statusText = 'DEGRADED';
        statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      }

      return {
        ...sub,
        statusText,
        statusColor,
        activeCount: subAnomalies.length,
      };
    });
  }, [activeAnomalies]);

  // Downsample for charts if dataset is long
  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(filteredTelemetry.length / 180));
    return filteredTelemetry.filter((_, idx) => idx % step === 0);
  }, [filteredTelemetry]);

  const handleInspectAnomaly = (anom: DetectedAnomaly) => {
    setSelectedAnomaly(anom);
    setActiveTab('anomalies');
  };

  const handleJumpToExplorer = (metricKey: any) => {
    setSelectedMetricKey(metricKey);
    setActiveTab('explorer');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Mission Status Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score Gauge */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">MISSION HEALTH INDEX</span>
            <span className="font-mono text-cyan-400">STATUS 01</span>
          </div>

          <div className="my-4 flex items-baseline gap-3">
            <span
              className={`text-4xl font-extrabold font-mono tracking-tight ${
                missionStats.healthScore >= 85
                  ? 'text-emerald-400'
                  : missionStats.healthScore >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {missionStats.healthScore}%
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {missionStats.healthScore >= 85
                ? 'Nominal Orbit Execution'
                : missionStats.healthScore >= 60
                ? 'Subsystem Degraded'
                : 'Safing Action Required'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                missionStats.healthScore >= 85
                  ? 'bg-emerald-500'
                  : missionStats.healthScore >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${missionStats.healthScore}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>RESOLVED: {missionStats.resolvedCount}</span>
            <span>TOTAL FRAMES: {missionStats.totalPoints}</span>
          </div>
        </div>

        {/* Active Anomalies Count */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">ANOMALIES REGISTER</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>

          <div className="my-3 flex items-baseline gap-3">
            <span
              className={`text-4xl font-extrabold font-mono ${
                activeAnomalies.length > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {activeAnomalies.length}
            </span>
            <span className="text-xs text-slate-400">Active Unresolved Events</span>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              {criticalAnomalies.length} Critical
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {activeAnomalies.length - criticalAnomalies.length} Warning
            </span>
          </div>

          <button
            onClick={() => setActiveTab('anomalies')}
            className="mt-3 text-left text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            Open Anomaly Center <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Orbit Mechanics Status */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">ORBITAL EPHEMERIS</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>

          <div className="my-3 space-y-1">
            <div className="text-2xl font-bold font-mono text-white">
              Orbit #{missionStats.currentOrbit}
            </div>
            <div className="text-xs text-cyan-400 font-mono">
              Phase: {missionStats.orbitalPhase}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Altitude / Inc:</span>
              <span className="text-slate-300">415 km / 51.6°</span>
            </div>
            <div className="flex justify-between">
              <span>Period:</span>
              <span className="text-slate-300">92.8 min</span>
            </div>
          </div>
        </div>

        {/* Communication Link Status */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide">GROUND LINK (TT&C)</span>
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="my-3 space-y-1">
            <div
              className={`text-2xl font-bold font-mono flex items-center gap-2 ${
                missionStats.contactStatus === 'AOS' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  missionStats.contactStatus === 'AOS' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              {missionStats.contactStatus === 'AOS' ? 'AOS PASS ACTIVE' : 'LOS CARRIER STANDBY'}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Station: DSN Madrid (Pass #12)
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>S-BAND DOWNLINK:</span>
            <span className="text-slate-300">2.2 GHz · 4.0 Mbps</span>
          </div>
        </div>
      </div>

      {/* Subsystem Status Matrix */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
            <span>Spacecraft Subsystem Health Matrix</span>
            <span className="text-xs font-mono text-slate-500 font-normal">
              (5 Telemetry Domains)
            </span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">AUTONOMOUS MONITOR ACTIVE</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {subsystems.map((sub) => {
            const Icon = sub.icon;
            return (
              <div
                key={sub.id}
                className="bg-[#0e162d] border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono font-semibold text-slate-200">{sub.id}</span>
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="my-2">
                  <div className="text-xs font-medium text-slate-300">{sub.name}</div>
                  <div className="text-[11px] font-mono mt-1 text-slate-400">
                    {sub.activeCount > 0 ? `${sub.activeCount} Alert Active` : 'All nominal'}
                  </div>
                </div>
                <div
                  className={`text-[10px] font-mono font-semibold px-2 py-1 rounded border text-center ${sub.statusColor}`}
                >
                  {sub.statusText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5 Core Spacecraft Telemetry Charts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Real-Time Aerospace Telemetry Streams
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic 24-Hour LEO Orbital Stream · Hover to inspect telemetry frames
            </p>
          </div>
          <button
            onClick={() => setActiveTab('explorer')}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>Open Telemetry Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Chart 1: Battery Voltage */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">Battery Voltage (V)</span>
              </div>
              <button
                onClick={() => handleJumpToExplorer('batteryVoltage')}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300"
              >
                Inspect →
              </button>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metString" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis domain={[24, 31]} stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d152a', borderColor: '#334155', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <ReferenceLine y={24.8} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Warn Low', fill: '#f43f5e', fontSize: 9 }} />
                  <ReferenceLine y={30.2} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Warn High', fill: '#f43f5e', fontSize: 9 }} />
                  <Line
                    type="monotone"
                    dataKey="batteryVoltage"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    dot={false}
                    name="Voltage (V)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Nominal: 25.5V - 29.5V</span>
              <span className="text-cyan-400">Li-Ion 8S Bus</span>
            </div>
          </div>

          {/* Chart 2: Battery Core Temperature */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-slate-200">Battery Temperature (°C)</span>
              </div>
              <button
                onClick={() => handleJumpToExplorer('batteryTemp')}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300"
              >
                Inspect →
              </button>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metString" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis domain={[5, 48]} stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d152a', borderColor: '#334155', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <ReferenceLine y={32} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn (32°C)', fill: '#f59e0b', fontSize: 9 }} />
                  <ReferenceLine y={38} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Critical (38°C)', fill: '#f43f5e', fontSize: 9 }} />
                  <Line
                    type="monotone"
                    dataKey="batteryTemp"
                    stroke="#fb7185"
                    strokeWidth={1.5}
                    dot={false}
                    name="Temp (°C)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Nominal: 12°C - 28°C</span>
              <span className="text-rose-400">Heater Loop Monitored</span>
            </div>
          </div>

          {/* Chart 3: Solar Array Power */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Solar Array Power (W)</span>
              </div>
              <button
                onClick={() => handleJumpToExplorer('solarArrayPower')}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300"
              >
                Inspect →
              </button>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metString" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 560]} stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d152a', borderColor: '#334155', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="solarArrayPower"
                    stroke="#facc15"
                    strokeWidth={1.5}
                    dot={false}
                    name="Power (W)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Daylight Peak: ~500W</span>
              <span className="text-amber-400">Eclipse: 0W</span>
            </div>
          </div>

          {/* Chart 4: Net Angular Rate (ADCS) */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">Net Angular Rate (deg/s)</span>
              </div>
              <button
                onClick={() => handleJumpToExplorer('angularRate')}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300"
              >
                Inspect →
              </button>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metString" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 1.2]} stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d152a', borderColor: '#334155', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <ReferenceLine y={0.45} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn (0.45)', fill: '#f59e0b', fontSize: 9 }} />
                  <ReferenceLine y={0.9} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Redline (0.90)', fill: '#f43f5e', fontSize: 9 }} />
                  <Line
                    type="monotone"
                    dataKey="angularRate"
                    stroke="#a78bfa"
                    strokeWidth={1.5}
                    dot={false}
                    name="Rate (deg/s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Nominal: &lt; 0.25 deg/s</span>
              <span className="text-purple-400">3-Axis FOG Gyro</span>
            </div>
          </div>

          {/* Chart 5: Communication Signal (RSSI) */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">Ground Link RSSI (dBm)</span>
              </div>
              <button
                onClick={() => handleJumpToExplorer('commRssi')}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300"
              >
                Inspect →
              </button>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metString" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis domain={[-130, -65]} stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0d152a', borderColor: '#334155', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <ReferenceLine y={-108} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn (-108)', fill: '#f59e0b', fontSize: 9 }} />
                  <ReferenceLine y={-120} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Crit (-120)', fill: '#f43f5e', fontSize: 9 }} />
                  <Line
                    type="monotone"
                    dataKey="commRssi"
                    stroke="#22d3ee"
                    strokeWidth={1.5}
                    dot={false}
                    name="RSSI (dBm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Pass Nominal: -80 dBm</span>
              <span className="text-cyan-400">S-Band Transponder</span>
            </div>
          </div>

          {/* Action Card: AI Flight Assistant Quick Access */}
          <div className="bg-gradient-to-br from-[#0e1730] to-[#0a1224] border border-cyan-500/20 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-cyan-950/20">
            <div>
              <div className="flex items-center justify-between text-xs text-cyan-300 mb-2">
                <span className="font-semibold uppercase tracking-wider">AI Flight Director</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                  Ready
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Autonomous Telemetry Assistant
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Evaluates multi-sensor correlations, quantifies uncertainty, and proposes flight
                contingency procedures for active alerts.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => setActiveTab('assistant')}
                className="w-full py-2 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Consult Mission Assistant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTab('simulator')}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors text-center"
              >
                Simulate Spacecraft Fault Scenarios
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Alerts Feed */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              Actionable Anomaly Feed
            </h2>
            <span className="text-xs font-mono text-slate-500">
              ({activeAnomalies.length} active events requiring attention)
            </span>
          </div>
          <button
            onClick={() => setActiveTab('anomalies')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            <span>View All in Anomaly Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeAnomalies.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
            <span>All spacecraft telemetry channels operating within nominal flight envelope.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {activeAnomalies.slice(0, 4).map((anom) => (
              <div
                key={anom.id}
                className="py-3.5 flex items-start justify-between gap-4 hover:bg-slate-800/20 px-2 rounded-lg transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        anom.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {anom.severity}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {anom.subsystem} · {anom.metricName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      MET {anom.metString}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      via {anom.detectionMethod}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{anom.explanation}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleInspectAnomaly(anom)}
                    className="px-3 py-1.5 bg-[#0e162d] hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 rounded text-xs font-medium transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
