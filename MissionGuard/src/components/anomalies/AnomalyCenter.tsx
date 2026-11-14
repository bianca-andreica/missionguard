import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Filter,
  Eye,
  Check,
  Bot,
  LineChart,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';
import { AnomalyDetailModal } from './AnomalyDetailModal';
import { DetectedAnomaly, AnomalySeverity, Subsystem, AnomalyStatus } from '../../types/telemetry';

export const AnomalyCenter: React.FC = () => {
  const {
    anomalies,
    acknowledgeAnomaly,
    resolveAnomaly,
    selectedAnomaly,
    setSelectedAnomaly,
    setSelectedMetricKey,
    setActiveTab,
  } = useMission();

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AnomalySeverity>('ALL');
  const [subsystemFilter, setSubsystemFilter] = useState<'ALL' | Subsystem>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AnomalyStatus>('ALL');

  // Filtered list
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => {
      // Search match
      if (search) {
        const s = search.toLowerCase();
        const match =
          a.metricName.toLowerCase().includes(s) ||
          a.subsystem.toLowerCase().includes(s) ||
          a.metString.toLowerCase().includes(s) ||
          a.explanation.toLowerCase().includes(s);
        if (!match) return false;
      }

      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (subsystemFilter !== 'ALL' && a.subsystem !== subsystemFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

      return true;
    });
  }, [anomalies, search, severityFilter, subsystemFilter, statusFilter]);

  const handleInspect = (a: DetectedAnomaly) => {
    setSelectedAnomaly(a);
  };

  const handleViewTelemetry = (metricKey: any) => {
    setSelectedMetricKey(metricKey);
    setActiveTab('explorer');
  };

  const handleDiagnoseWithAI = (a: DetectedAnomaly) => {
    setSelectedAnomaly(a);
    setActiveTab('assistant');
  };

  // Severity count badges
  const counts = useMemo(() => {
    return {
      total: anomalies.length,
      active: anomalies.filter((a) => a.status === 'ACTIVE').length,
      critical: anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length,
      warning: anomalies.filter((a) => a.severity === 'WARNING' && a.status === 'ACTIVE').length,
      resolved: anomalies.filter((a) => a.status === 'RESOLVED').length,
    };
  }, [anomalies]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">TOTAL DETECTED EVENTS</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{counts.total}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">24h orbital audit</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-rose-400 font-medium">CRITICAL UNRESOLVED</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{counts.critical}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">Immediate intervention</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-amber-400 font-medium">ACTIVE WARNINGS</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{counts.warning}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">Monitor trend</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-emerald-400 font-medium">RESOLVED ANOMALIES</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{counts.resolved}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">Health restored</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by metric, subsystem, explanation, or MET..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0e162d] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="bg-[#0e162d] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
              <option value="INFO">Info Only</option>
            </select>

            {/* Subsystem Filter */}
            <select
              value={subsystemFilter}
              onChange={(e) => setSubsystemFilter(e.target.value as any)}
              className="bg-[#0e162d] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">All Subsystems</option>
              <option value="EPS">EPS (Power)</option>
              <option value="TCS">TCS (Thermal)</option>
              <option value="ADCS">ADCS (Attitude)</option>
              <option value="TT&C">TT&C (Comm)</option>
              <option value="PAYLOAD">Payload</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#0e162d] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Unresolved</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Anomaly Events Register List */}
      <div className="space-y-3">
        {filteredAnomalies.length === 0 ? (
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
            <h3 className="text-sm font-semibold text-white">No Matching Anomalies</h3>
            <p className="text-xs text-slate-500">
              Try relaxing your search terms or filter criteria.
            </p>
          </div>
        ) : (
          filteredAnomalies.map((anom) => {
            const isCritical = anom.severity === 'CRITICAL';
            const isResolved = anom.status === 'RESOLVED';
            const isAck = anom.status === 'ACKNOWLEDGED';

            return (
              <div
                key={anom.id}
                className={`bg-[#0b1328] border rounded-xl p-5 transition-all ${
                  isResolved
                    ? 'border-slate-800/60 opacity-75'
                    : isCritical
                    ? 'border-rose-500/40 shadow-sm shadow-rose-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Event Metadata & Description */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {anom.severity}
                      </span>

                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {anom.subsystem} · {anom.metricName}
                      </span>

                      <span className="text-xs text-slate-400 font-mono">
                        MET {anom.metString}
                      </span>

                      <span className="text-[10px] text-slate-500 font-mono">
                        Engine: {anom.detectionMethod}
                      </span>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isResolved
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : isAck
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {anom.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                      {anom.explanation}
                    </p>

                    {/* Numerical telemetry reading */}
                    <div className="flex items-center gap-4 text-xs font-mono pt-1 text-slate-400">
                      <span>
                        Observed:{' '}
                        <strong className="text-white font-bold">{anom.observedValue}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Nominal Envelope:{' '}
                        <span className="text-emerald-400">
                          {anom.expectedRange[0]} to {anom.expectedRange[1]}
                        </span>
                      </span>
                      {anom.zScore && (
                        <>
                          <span>·</span>
                          <span className="text-purple-300">Z-Score: {anom.zScore}σ</span>
                        </>
                      )}
                      {anom.rateOfChange && (
                        <>
                          <span>·</span>
                          <span className="text-amber-300">Rate: {anom.rateOfChange}/min</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handleInspect(anom)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e162d] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Inspect</span>
                    </button>

                    <button
                      onClick={() => handleViewTelemetry(anom.metricKey)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e162d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
                    >
                      <LineChart className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Telemetry</span>
                    </button>

                    <button
                      onClick={() => handleDiagnoseWithAI(anom)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Diagnose</span>
                    </button>

                    {!isAck && !isResolved && (
                      <button
                        onClick={() => acknowledgeAnomaly(anom.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e162d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
                      >
                        <span>Ack</span>
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => resolveAnomaly(anom.id, 'Resolved by flight operator.')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <AnomalyDetailModal
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
      />
    </div>
  );
};
