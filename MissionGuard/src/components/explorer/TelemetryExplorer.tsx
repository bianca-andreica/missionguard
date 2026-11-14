import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
  ReferenceDot,
} from 'recharts';
import {
  Upload,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';
import { METRIC_DEFINITIONS } from '../../utils/telemetryGenerator';
import { calculateMetricStats } from '../../utils/anomalyDetector';
import { exportTelemetryToCSV, downloadFile } from '../../utils/csvExporter';
import { CsvUploadModal } from './CsvUploadModal';
import { TelemetryPoint } from '../../types/telemetry';

export const TelemetryExplorer: React.FC = () => {
  const {
    currentTelemetry,
    selectedMetricKey,
    setSelectedMetricKey,
    anomalies,
    timeRange,
    setTimeRange,
    setSelectedAnomaly,
    setActiveTab,
  } = useMission();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showAnomalyOverlay, setShowAnomalyOverlay] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const metricDef = METRIC_DEFINITIONS[selectedMetricKey as string] || METRIC_DEFINITIONS.batteryVoltage;

  // Filter telemetry by timeRange
  const timeFilteredData = useMemo(() => {
    if (timeRange === 'all' || timeRange === '24h') return currentTelemetry;
    const countMap: Record<string, number> = {
      '1h': 30,
      '6h': 180,
      '12h': 360,
    };
    const count = countMap[timeRange] || currentTelemetry.length;
    return currentTelemetry.slice(-count);
  }, [currentTelemetry, timeRange]);

  // Compute metric stats
  const stats = useMemo(() => {
    return calculateMetricStats(timeFilteredData, selectedMetricKey);
  }, [timeFilteredData, selectedMetricKey]);

  // Anomalies for the selected metric
  const metricAnomalies = useMemo(() => {
    return anomalies.filter((a) => a.metricKey === selectedMetricKey);
  }, [anomalies, selectedMetricKey]);

  // Prepare chart data with anomaly flags
  const chartPoints = useMemo(() => {
    return timeFilteredData.map((pt) => {
      const val = Number(pt[selectedMetricKey]) || 0;
      const anom = metricAnomalies.find((a) => a.metString === pt.metString);
      return {
        ...pt,
        chartValue: val,
        hasAnomaly: Boolean(anom),
        anomalySeverity: anom?.severity,
      };
    });
  }, [timeFilteredData, selectedMetricKey, metricAnomalies]);

  // Anomaly reference dots
  const anomalyDots = useMemo(() => {
    if (!showAnomalyOverlay) return [];
    return chartPoints.filter((pt) => pt.hasAnomaly);
  }, [chartPoints, showAnomalyOverlay]);

  // Filter table data
  const tableData = useMemo(() => {
    if (!tableSearch) return timeFilteredData;
    const s = tableSearch.toLowerCase();
    return timeFilteredData.filter(
      (pt) =>
        pt.metString.toLowerCase().includes(s) ||
        pt.orbitalPhase.toLowerCase().includes(s) ||
        String(pt.orbitNumber).includes(s)
    );
  }, [timeFilteredData, tableSearch]);

  const totalPages = Math.ceil(tableData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableData.slice(start, start + pageSize);
  }, [tableData, currentPage, pageSize]);

  const handleExportFiltered = () => {
    const csv = exportTelemetryToCSV(timeFilteredData);
    downloadFile(csv, `telemetry_${selectedMetricKey}_${timeRange}.csv`, 'text/csv');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Metric Selector and Explorer Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap bg-[#0a1020] p-1.5 border border-slate-800 rounded-xl">
          {Object.values(METRIC_DEFINITIONS).map((def) => {
            const isSelected = selectedMetricKey === def.key;
            const hasAnom = anomalies.some(
              (a) => a.metricKey === def.key && a.status === 'ACTIVE'
            );

            return (
              <button
                key={def.key}
                onClick={() => {
                  setSelectedMetricKey(def.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: def.color }}
                />
                <span>{def.name}</span>
                {hasAnom && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-[#0e162d] px-3 py-2 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={showAnomalyOverlay}
              onChange={(e) => setShowAnomalyOverlay(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Overlay Anomalies</span>
          </label>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={handleExportFiltered}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export View</span>
          </button>
        </div>
      </div>

      {/* Metric Descriptive Kicker & Statistical Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">LATEST VALUE</div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {stats.current} <span className="text-xs font-normal text-slate-400">{metricDef.unit}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">MET: 24:00:00</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">MEAN (μ)</div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">
            {stats.mean} <span className="text-xs font-normal text-slate-400">{metricDef.unit}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Rolling window</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">MINIMUM</div>
          <div className="text-xl font-bold font-mono text-blue-300 mt-1">
            {stats.min} <span className="text-xs font-normal text-slate-400">{metricDef.unit}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">In selected range</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">MAXIMUM</div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {stats.max} <span className="text-xs font-normal text-slate-400">{metricDef.unit}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Peak excursion</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">STD DEV (σ)</div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">
            ±{stats.stdDev} <span className="text-xs font-normal text-slate-400">{metricDef.unit}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Statistical variance</div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">ANOMALIES FLAGGED</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              metricAnomalies.length > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {metricAnomalies.length}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {metricAnomalies.length > 0 ? 'Review flagged frames' : 'Envelope nominal'}
          </div>
        </div>
      </div>

      {/* Main Interactive Time-Series Chart */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{metricDef.name}</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                [{metricDef.subsystem}] · {metricDef.description}
              </span>
            </h2>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              Nominal Range: {metricDef.nominalMin} to {metricDef.nominalMax} {metricDef.unit}
              {metricDef.warningHigh && ` · Warning: >${metricDef.warningHigh} ${metricDef.unit}`}
              {metricDef.criticalHigh && ` · Critical: >${metricDef.criticalHigh} ${metricDef.unit}`}
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono hidden md:block">
            Drag the bottom slider brush to pan and zoom
          </div>
        </div>

        <div className="h-96 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartPoints}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="metString" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                domain={['auto', 'auto']}
                unit={metricDef.unit ? ` ${metricDef.unit}` : ''}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d152a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
              />

              {/* Threshold Guidelines */}
              {metricDef.nominalMin !== undefined && (
                <ReferenceLine
                  y={metricDef.nominalMin}
                  stroke="#34d399"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: 'Nominal Min', fill: '#34d399', fontSize: 9 }}
                />
              )}
              {metricDef.nominalMax !== undefined && (
                <ReferenceLine
                  y={metricDef.nominalMax}
                  stroke="#34d399"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: 'Nominal Max', fill: '#34d399', fontSize: 9 }}
                />
              )}
              {metricDef.warningHigh !== undefined && (
                <ReferenceLine
                  y={metricDef.warningHigh}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: 'Warn High', fill: '#f59e0b', fontSize: 9 }}
                />
              )}
              {metricDef.criticalHigh !== undefined && (
                <ReferenceLine
                  y={metricDef.criticalHigh}
                  stroke="#f43f5e"
                  strokeDasharray="2 2"
                  label={{ value: 'Crit High', fill: '#f43f5e', fontSize: 9 }}
                />
              )}

              {/* Anomaly Dots Overlay */}
              {anomalyDots.map((pt) => (
                <ReferenceDot
                  key={pt.id}
                  x={pt.metString}
                  y={pt.chartValue}
                  r={5}
                  fill={pt.anomalySeverity === 'CRITICAL' ? '#f43f5e' : '#f59e0b'}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              ))}

              <Line
                type="monotone"
                dataKey="chartValue"
                stroke={metricDef.color}
                strokeWidth={2}
                dot={false}
                name={`${metricDef.name} (${metricDef.unit})`}
              />

              {/* Interactive Zoom Brush */}
              <Brush
                dataKey="metString"
                height={26}
                stroke="#334155"
                fill="#0e172e"
                tickFormatter={(v) => String(v)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Observations Data Table */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
              Observations Telemetry Log
            </h3>
            <p className="text-xs text-slate-400">
              Showing {tableData.length} discrete telemetry samples for {metricDef.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search MET, Orbit, Phase..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-1.5 bg-[#0e162d] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0e162d] text-slate-400 border-y border-slate-800">
              <tr>
                <th className="py-2.5 px-3">MET</th>
                <th className="py-2.5 px-3">UTC TIMESTAMP</th>
                <th className="py-2.5 px-3">ORBIT #</th>
                <th className="py-2.5 px-3">PHASE</th>
                <th className="py-2.5 px-3 text-right">OBSERVED VALUE</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedData.map((pt) => {
                const val = Number(pt[selectedMetricKey]);
                const anom = metricAnomalies.find((a) => a.metString === pt.metString);

                return (
                  <tr
                    key={pt.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      anom ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-cyan-300 font-semibold">{pt.metString}</td>
                    <td className="py-2.5 px-3 text-slate-400">{pt.timestamp}</td>
                    <td className="py-2.5 px-3 text-slate-300">Orbit {pt.orbitNumber}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          pt.orbitalPhase === 'SUNLIGHT'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : pt.orbitalPhase === 'PENUMBRA'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {pt.orbitalPhase}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {val.toFixed(2)} {metricDef.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {anom ? (
                        <button
                          onClick={() => {
                            setSelectedAnomaly(anom);
                            setActiveTab('anomalies');
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                            anom.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          }`}
                        >
                          {anom.severity} ANOMALY
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-400">NOMINAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, tableData.length)} of {tableData.length} records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-[#0e162d] hover:bg-slate-800 disabled:opacity-40 rounded border border-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-[#0e162d] hover:bg-slate-800 disabled:opacity-40 rounded border border-slate-800 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <CsvUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};
