import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  Bot,
  FileCheck,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DetectedAnomaly } from '../../types/telemetry';
import { useMission } from '../../context/MissionContext';

interface AnomalyDetailModalProps {
  anomaly: DetectedAnomaly | null;
  onClose: () => void;
}

export const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({ anomaly, onClose }) => {
  const { currentTelemetry, acknowledgeAnomaly, resolveAnomaly, setActiveTab } = useMission();
  const [operatorNotes, setOperatorNotes] = useState(anomaly?.operatorNotes || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!anomaly) return null;

  // Extract a 16-sample telemetry window around this anomaly
  const anomalyMetSec = parseInt(anomaly.metString.split(':')[0]) * 3600 +
    parseInt(anomaly.metString.split(':')[1]) * 60;
  
  const targetIdx = currentTelemetry.findIndex(
    (pt) => Math.abs(pt.metSeconds - anomalyMetSec) <= 120
  );
  const startIdx = Math.max(0, (targetIdx !== -1 ? targetIdx : 0) - 8);
  const endIdx = Math.min(currentTelemetry.length, startIdx + 16);
  const sparkData = currentTelemetry.slice(startIdx, endIdx);

  const handleSaveNotes = () => {
    resolveAnomaly(anomaly.id, operatorNotes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAskAssistant = () => {
    onClose();
    setActiveTab('assistant');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0b1328] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                  anomaly.severity === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {anomaly.severity}
              </span>
              <span className="text-sm font-mono text-cyan-400">
                [{anomaly.subsystem}]
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  anomaly.status === 'RESOLVED'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : anomaly.status === 'ACKNOWLEDGED'
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {anomaly.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {anomaly.metricName} Excursion
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono">OBSERVED VALUE</div>
            <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
              {anomaly.observedValue}
            </div>
          </div>

          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono">NOMINAL BOUNDS</div>
            <div className="text-xs font-mono text-emerald-400 mt-1 font-semibold">
              {anomaly.expectedRange[0]} to {anomaly.expectedRange[1]}
            </div>
          </div>

          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono">DETECTION ENGINE</div>
            <div className="text-xs font-mono text-cyan-300 mt-1 font-medium">
              {anomaly.detectionMethod}
              {anomaly.zScore ? ` (${anomaly.zScore}σ)` : ''}
              {anomaly.rateOfChange ? ` (${anomaly.rateOfChange}/m)` : ''}
            </div>
          </div>

          <div className="bg-[#0e162d] p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono">ONSET MET</div>
            <div className="text-xs font-mono text-white mt-1 font-medium">
              {anomaly.metString}
            </div>
          </div>
        </div>

        {/* Context Trend Chart */}
        <div className="bg-[#0e162d] p-3.5 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold">Telemetry Window (±16 min around Event)</span>
            <span className="font-mono text-[10px] text-slate-400">
              Channel: {anomaly.metricKey}
            </span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metString" stroke="#475569" tick={{ fontSize: 9 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1328', borderColor: '#334155', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey={anomaly.metricKey}
                  stroke="#fb7185"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f43f5e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnostic Explanation */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Engineering Observation Summary
          </h4>
          <p className="text-xs text-slate-300 bg-[#0e162d] p-3 rounded-lg border border-slate-800 leading-relaxed">
            {anomaly.explanation}
          </p>
        </div>

        {/* Working Hypotheses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Scientific Hypotheses (Ranked by Likelihood)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Uncertainty quantified
            </span>
          </div>
          <div className="space-y-1.5">
            {anomaly.hypotheses.map((hyp, i) => (
              <div
                key={i}
                className="text-xs text-slate-300 bg-[#0e162d]/60 border border-slate-800/80 p-2.5 rounded-lg flex items-start gap-2"
              >
                <span className="w-4 h-4 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{hyp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Recommended Investigation Procedures
          </h4>
          <div className="space-y-1.5">
            {anomaly.suggestedActions.map((action, i) => (
              <div
                key={i}
                className="text-xs text-slate-300 bg-[#0e162d]/60 border border-slate-800/80 p-2.5 rounded-lg flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operator Notes & Resolution */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 block">
            Flight Controller Investigation Notes
          </label>
          <textarea
            rows={2}
            value={operatorNotes}
            onChange={(e) => setOperatorNotes(e.target.value)}
            placeholder="Record resolution rationale, commanding issued, or pass observations..."
            className="w-full bg-[#0e162d] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handleAskAssistant}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>Consult AI Flight Assistant</span>
          </button>

          <div className="flex items-center gap-2">
            {anomaly.status !== 'ACKNOWLEDGED' && anomaly.status !== 'RESOLVED' && (
              <button
                onClick={() => acknowledgeAnomaly(anomaly.id)}
                className="px-3 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
              >
                Acknowledge Event
              </button>
            )}

            <button
              onClick={handleSaveNotes}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaved ? 'Resolved!' : 'Mark Resolved'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
