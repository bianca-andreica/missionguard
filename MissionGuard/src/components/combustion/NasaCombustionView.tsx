import React, { useMemo, useRef, useState } from 'react';
import {
  Flame,
  RefreshCw,
  Upload,
  Download,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  Info,
  ShieldAlert,
  Sparkles,
  Database,
  Wind,
  Thermometer,
  Search,
  ChevronLeft,
  ChevronRight,
  Bot,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useMission } from '../../context/MissionContext';
import { CombustionAnomaly, CombustionAnomalyMethod, NasaPsiStudyMetadata } from '../../types/combustion';
import { exportCombustionPointsToCSV } from '../../utils/combustionParser';
import { downloadFile } from '../../utils/csvExporter';

export const NasaCombustionView: React.FC = () => {
  const {
    combustionData,
    combustionAnomalies,
    combustionLoading,
    combustionError,
    combustionSourceLabel,
    combustionRawRows,
    psiCatalog,
    loadCustomCombustionCsv,
    refreshLiveNasaSaffire,
    resetToVerifiedNasaBaseline,
    setSelectedCombustionAnomaly,
    setActiveTab,
  } = useMission();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadNotice, setUploadNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedStudyAccession, setSelectedStudyAccession] = useState<string>('PSI-100');
  const [eventFilter, setEventFilter] = useState<'ALL' | CombustionAnomalyMethod>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 12;

  const selectedStudy: NasaPsiStudyMetadata | undefined = useMemo(
    () => psiCatalog.find((s) => s.accession === selectedStudyAccession) || psiCatalog[0],
    [psiCatalog, selectedStudyAccession]
  );

  // Real summary statistics computed strictly from parsed NASA measurements
  const stats = useMemo(() => {
    if (combustionData.length === 0) {
      return {
        peakRad: null as number | null,
        peakRadTime: 'N/A',
        peakSmoke: null as number | null,
        peakSmokeTime: 'N/A',
        maxAnem: null as number | null,
        minAnem: null as number | null,
        maxTemp: null as number | null,
        avgPres: null as number | null,
        ign1Peak: null as number | null,
        ign1Time: 'N/A',
        ign2Peak: null as number | null,
        ign2Time: 'N/A',
      };
    }

    let peakRad = -Infinity;
    let peakRadTime = 'N/A';
    let peakSmoke = -Infinity;
    let peakSmokeTime = 'N/A';
    let maxAnem = -Infinity;
    let minAnem = Infinity;
    let maxTemp = -Infinity;
    let presSum = 0;
    let presCount = 0;
    let ign1Peak = -Infinity;
    let ign1Time = 'N/A';
    let ign2Peak = -Infinity;
    let ign2Time = 'N/A';

    for (const pt of combustionData) {
      if (pt.radiometerPeak !== null && pt.radiometerPeak > peakRad) {
        peakRad = pt.radiometerPeak;
        peakRadTime = pt.elapsedLabel;
      }
      if (pt.smokeScattering2 !== null && pt.smokeScattering2 > peakSmoke) {
        peakSmoke = pt.smokeScattering2;
        peakSmokeTime = pt.elapsedLabel;
      }
      if (pt.anemometer1 !== null) {
        if (pt.anemometer1 > maxAnem) maxAnem = pt.anemometer1;
        if (pt.anemometer1 < minAnem) minAnem = pt.anemometer1;
      }
      if (pt.anemometer2 !== null) {
        if (pt.anemometer2 > maxAnem) maxAnem = pt.anemometer2;
        if (pt.anemometer2 < minAnem) minAnem = pt.anemometer2;
      }
      if (pt.cabinTemp !== null && pt.cabinTemp > maxTemp) {
        maxTemp = pt.cabinTemp;
      }
      if (pt.cabinPressure1 !== null) {
        presSum += pt.cabinPressure1;
        presCount++;
      }
      if (pt.sample1IgniterCurrent !== null && pt.sample1IgniterCurrent > ign1Peak) {
        ign1Peak = pt.sample1IgniterCurrent;
        ign1Time = pt.elapsedLabel;
      }
      if (pt.sample2IgniterCurrent !== null && pt.sample2IgniterCurrent > ign2Peak) {
        ign2Peak = pt.sample2IgniterCurrent;
        ign2Time = pt.elapsedLabel;
      }
    }

    return {
      peakRad: peakRad === -Infinity ? null : peakRad,
      peakRadTime,
      peakSmoke: peakSmoke === -Infinity ? null : peakSmoke,
      peakSmokeTime,
      maxAnem: maxAnem === -Infinity ? null : maxAnem,
      minAnem: minAnem === Infinity ? null : minAnem,
      maxTemp: maxTemp === -Infinity ? null : maxTemp,
      avgPres: presCount > 0 ? Math.round((presSum / presCount) * 100) / 100 : null,
      ign1Peak: ign1Peak === -Infinity ? null : ign1Peak,
      ign1Time,
      ign2Peak: ign2Peak === -Infinity ? null : ign2Peak,
      ign2Time,
    };
  }, [combustionData]);

  const filteredAnomalies = useMemo(() => {
    if (eventFilter === 'ALL') return combustionAnomalies;
    return combustionAnomalies.filter((e) => e.method === eventFilter);
  }, [combustionAnomalies, eventFilter]);

  const filteredRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return combustionData;
    return combustionData.filter(
      (p) =>
        p.elapsedLabel.toLowerCase().includes(q) ||
        String(p.relativeSeconds).includes(q) ||
        (p.radiometerPeak !== null && String(p.radiometerPeak).includes(q)) ||
        (p.smokeScattering2 !== null && String(p.smokeScattering2).includes(q))
    );
  }, [combustionData, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const safePage = Math.min(tablePage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, tablePage, totalPages]);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const result = loadCustomCombustionCsv(text, file.name);
      if (result.success) {
        setUploadNotice({
          type: 'ok',
          text: `Imported ${result.count} aligned frames from ${file.name}.`,
        });
      } else {
        setUploadNotice({
          type: 'err',
          text: result.error || 'Invalid NASA SAFFIRE CSV format.',
        });
      }
      setTimeout(() => setUploadNotice(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportAlignedCsv = () => {
    const csv = exportCombustionPointsToCSV(combustionData);
    downloadFile(csv, 'NASA_PSI100_SAFFIRE3_Aligned_Telemetry.csv', 'text/csv');
  };

  const handleAnalyzeInAssistant = (event: CombustionAnomaly) => {
    setSelectedCombustionAnomaly(event);
    setActiveTab('assistant');
  };

  const fmt = (val: number | null, digits = 2, unit = '') =>
    val === null ? '—' : `${val.toFixed(digits)}${unit ? ` ${unit}` : ''}`;

  const igniterMarkers = useMemo(
    () =>
      combustionAnomalies.filter(
        (a) => a.method === 'IGNITER_ACTIVATION' && a.channelKey !== 'smokeWireCurrent'
      ),
    [combustionAnomalies]
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* 1. Data Provenance & Scientific Honesty Separation Banner */}
      <div className="bg-[#0b1328] border border-cyan-500/30 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold">
                <Database className="w-3.5 h-3.5" />
                REAL NASA EXPERIMENTAL DATA
              </span>
              <span className="text-xs font-mono text-cyan-300">
                NASA PSI-100 · SAFFIRE-III · DOI: 10.60555/040q-4h36 · CC0-1.0
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Flame in Freefall: Microgravity Combustion &amp; Spacecraft Fire Safety
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
              Active source: <span className="text-slate-200 font-medium">{combustionSourceLabel}</span>.
              Interleaved 1 Hz Saffire payload and Cygnus vehicle packets are sentinel-cleaned (fill codes
              like <span className="font-mono">-4002.47</span>, <span className="font-mono">-76.18</span>,
              and <span className="font-mono">-3.05</span> nulled) and binned into 2s frames without
              synthesizing missing readings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={refreshLiveNasaSaffire}
              disabled={combustionLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${combustionLoading ? 'animate-spin' : ''}`} />
              <span>Fetch Live NASA PSI</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import NASA CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileImport}
              className="hidden"
            />

            <button
              onClick={handleExportAlignedCsv}
              disabled={combustionData.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Aligned CSV</span>
            </button>

            <button
              onClick={resetToVerifiedNasaBaseline}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0e162d] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset PSI-100</span>
            </button>
          </div>
        </div>

        {/* Explicit Three-Tier Provenance Distinction */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-[11px]">
          <div className="bg-[#0e162d] border border-emerald-500/25 rounded-lg p-3 space-y-1">
            <div className="font-mono font-bold text-emerald-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              1. REAL NASA EXPERIMENTAL DATA
            </div>
            <p className="text-slate-400 leading-relaxed">
              Measurements on this tab come directly from NASA PSI-100 (<span className="text-slate-200">SAFFIRE-III</span>,
              Cygnus OA-7, June 2017) raw engineering-unit telemetry (<span className="font-mono">psi.nasa.gov</span>).
            </p>
          </div>

          <div className="bg-[#0e162d] border border-slate-700/80 rounded-lg p-3 space-y-1">
            <div className="font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              2. SYNTHETIC DEMO TELEMETRY
            </div>
            <p className="text-slate-400 leading-relaxed">
              The AURA-SAT-4 Overview, Explorer, and Fault Simulator tabs remain deterministic synthetic
              spacecraft demos. Spacecraft EPS/RSSI thresholds are never applied to SAFFIRE combustion sensors.
            </p>
          </div>

          <div className="bg-[#0e162d] border border-amber-500/25 rounded-lg p-3 space-y-1">
            <div className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              3. AI HYPOTHESES &amp; RISK INSIGHTS
            </div>
            <p className="text-slate-400 leading-relaxed">
              Combustion event interpretations and fire-safety recommendations are framed strictly as working
              engineering hypotheses with explicit sensor limitations.
            </p>
          </div>
        </div>
      </div>

      {/* Notices & Errors */}
      {uploadNotice && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            uploadNotice.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {uploadNotice.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{uploadNotice.text}</span>
        </div>
      )}

      {combustionError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{combustionError}</span>
        </div>
      )}

      {/* 2. Measured NASA SAFFIRE-III Telemetry KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">ALIGNED TELEMETRY FRAMES</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {combustionData.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            From {combustionRawRows.toLocaleString()} raw NASA CSV rows (5525s–6900s)
          </div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">PEAK RADIOMETER FLUX</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-300 font-mono">
            {fmt(stats.peakRad, 2, 'EU')}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Recorded at t={stats.peakRadTime} (Ign1 peak: {fmt(stats.ign1Peak, 2, 'A')} @ {stats.ign1Time})
          </div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">DUCT FORCED AIRFLOW</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono">
            {stats.minAnem !== null && stats.maxAnem !== null
              ? `${stats.minAnem.toFixed(1)}–${stats.maxAnem.toFixed(1)} cm/s`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Anemometers 1 &amp; 2 inside Saffire III flow duct
          </div>
        </div>

        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">CYGNUS SMOKE &amp; CABIN</span>
            <Thermometer className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300 font-mono">
            {fmt(stats.peakSmoke, 3)} <span className="text-xs text-slate-400 font-normal">scat</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Peak @ {stats.peakSmokeTime} · Max Cabin {fmt(stats.maxTemp, 1, '°C')} · {fmt(stats.avgPres, 2, 'psia')}
          </div>
        </div>
      </div>

      {/* 3. Visualizations Tailored to Actual SAFFIRE-III Channels */}
      <div className="grid grid-cols-1 gap-6">
        {/* Chart 1: Radiometers + Igniter Currents */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Radiometric Heat Flux (R1–R4) &amp; Igniter Activation Sequence</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Measured <span className="font-mono text-slate-300">P@sfsHk.Radiometer1value..4value</span> (EU)
                correlated with <span className="font-mono text-slate-300">Sample1/2IgniterCurrent</span> (A).
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#0e162d] border border-slate-800 text-emerald-300">
              NASA PSI-100 EU Table
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combustionData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="elapsedLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  minTickGap={35}
                />
                <YAxis
                  yAxisId="rad"
                  stroke="#fb923c"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{
                    value: 'Radiometer (EU)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#fb923c',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  yAxisId="curr"
                  orientation="right"
                  stroke="#38bdf8"
                  domain={[0, 1.5]}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{
                    value: 'Igniter Current (A)',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#38bdf8',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1020',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />

                {igniterMarkers.map((m) => (
                  <ReferenceLine
                    key={m.id}
                    yAxisId="rad"
                    x={m.elapsedLabel}
                    stroke="#facc15"
                    strokeDasharray="4 4"
                    label={{
                      value: m.channelKey === 'sample1IgniterCurrent' ? 'Ign 1' : 'Ign 2',
                      fill: '#facc15',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                ))}

                <Line
                  yAxisId="rad"
                  type="monotone"
                  dataKey="radiometer1"
                  name="Radiometer 1 (EU)"
                  stroke="#fb923c"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="rad"
                  type="monotone"
                  dataKey="radiometer2"
                  name="Radiometer 2 (EU)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="rad"
                  type="monotone"
                  dataKey="radiometer3"
                  name="Radiometer 3 (EU)"
                  stroke="#eab308"
                  strokeWidth={1.6}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="rad"
                  type="monotone"
                  dataKey="radiometer4"
                  name="Radiometer 4 (EU)"
                  stroke="#c084fc"
                  strokeWidth={1.6}
                  dot={false}
                  connectNulls
                />
                <Bar
                  yAxisId="curr"
                  dataKey="sample1IgniterCurrent"
                  name="Sample 1 Igniter (A)"
                  fill="#22d3ee"
                  barSize={4}
                />
                <Bar
                  yAxisId="curr"
                  dataKey="sample2IgniterCurrent"
                  name="Sample 2 Igniter (A)"
                  fill="#34d399"
                  barSize={4}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 & Chart 3 Side-by-Side on XL */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chart 2: Airflow & Fan RPM */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span>Microgravity Forced Airflow &amp; Fan Tachometer</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-slate-300">Anemometer1 / Anemometer2</span> (cm/s) vs{' '}
                <span className="font-mono text-slate-300">FanTachometer</span> (RPM).
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combustionData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="elapsedLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    minTickGap={35}
                  />
                  <YAxis
                    yAxisId="flow"
                    stroke="#22d3ee"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{
                      value: 'Airflow (cm/s)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#22d3ee',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="rpm"
                    orientation="right"
                    stroke="#a78bfa"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{
                      value: 'Fan (RPM)',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#a78bfa',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a1020',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    yAxisId="flow"
                    type="monotone"
                    dataKey="anemometer1"
                    name="Anemometer 1 (cm/s)"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="flow"
                    type="monotone"
                    dataKey="anemometer2"
                    name="Anemometer 2 (cm/s)"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Area
                    yAxisId="rpm"
                    type="monotone"
                    dataKey="fanTachometer"
                    name="Fan Tachometer (RPM)"
                    stroke="#a78bfa"
                    fill="#a78bfa"
                    fillOpacity={0.12}
                    strokeWidth={1.5}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Cygnus Smoke Detectors & Cabin Temp */}
          <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Cygnus Cabin Smoke Breakthrough &amp; Environmental Sensors</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Downstream <span className="font-mono text-slate-300">F2PCM Smoke Scattering/Obscuration</span>{' '}
                &amp; <span className="font-mono text-slate-300">ETS Temperature</span> (°C).
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combustionData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="elapsedLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    minTickGap={35}
                  />
                  <YAxis
                    yAxisId="smk"
                    stroke="#f43f5e"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{
                      value: 'Smoke Signal',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#f43f5e',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="temp"
                    orientation="right"
                    stroke="#fbbf24"
                    domain={['auto', 'auto']}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{
                      value: 'Cabin Temp (°C)',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#fbbf24',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a1020',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area
                    yAxisId="smk"
                    type="monotone"
                    dataKey="smokeScattering2"
                    name="Smoke Scattering (F2PCM)"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.18}
                    strokeWidth={2}
                    connectNulls
                  />
                  <Line
                    yAxisId="smk"
                    type="monotone"
                    dataKey="smokeObscuration2"
                    name="Smoke Obscuration (F2PCM)"
                    stroke="#38bdf8"
                    strokeWidth={1.6}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="cabinTemp"
                    name="Cygnus Cabin Temp (°C)"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Detected Microgravity Combustion Events & Fire-Safety Insights */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Detected Combustion &amp; Fire-Safety Events ({filteredAnomalies.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Combustion-specific detector (igniters, radiometric Z-score/flux excursions, Cygnus smoke
              breakthrough, duct airflow shifts).
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'ALL', label: 'All Events' },
                { id: 'RADIOMETRIC_EXCURSION', label: 'Radiometric' },
                { id: 'SMOKE_BREAKTHROUGH', label: 'Smoke' },
                { id: 'IGNITER_ACTIVATION', label: 'Igniters' },
                { id: 'FLOW_PERTURBATION', label: 'Airflow' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setEventFilter(f.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                  eventFilter === f.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-[#0e162d] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredAnomalies.map((ev) => {
            const isExpanded = expandedEventId === ev.id;
            return (
              <div
                key={ev.id}
                className="bg-[#0e162d] border border-slate-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                        ev.severity === 'CRITICAL'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                          : ev.severity === 'WARNING'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      {ev.severity}
                    </span>
                    <span className="text-xs font-mono text-cyan-300 font-semibold">
                      t={ev.elapsedLabel}
                    </span>
                    <span className="text-sm font-bold text-white">{ev.channelName}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({ev.method} · Obs: {ev.observedValue.toFixed(2)}
                      {ev.zScore ? ` · Z=${ev.zScore}` : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalyzeInAssistant(ev)}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded text-[11px] font-medium transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Analyze in AI Assistant</span>
                    </button>
                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                      className="px-2.5 py-1 bg-slate-800/70 hover:bg-slate-800 text-slate-300 rounded text-[11px] font-mono"
                    >
                      {isExpanded ? 'Hide Details' : 'Inspect'}
                    </button>
                  </div>
                </div>

                {/* Measured Fact always visible */}
                <div className="bg-[#080d1a] border border-emerald-500/20 rounded p-2.5 text-xs">
                  <span className="font-mono text-[10px] text-emerald-300 font-bold uppercase mr-2">
                    [Measured NASA Observation]
                  </span>
                  <span className="text-slate-200">{ev.measuredFact}</span>
                </div>

                {isExpanded && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="bg-[#080d1a] border border-amber-500/20 rounded p-3 space-y-1.5">
                      <div className="font-mono text-[10px] text-amber-300 font-bold uppercase">
                        [AI / Engineering Hypotheses — Not Confirmed Root Cause]
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {ev.aiHypotheses.map((h, idx) => (
                          <li key={idx}>{h}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#080d1a] border border-cyan-500/20 rounded p-3 space-y-1.5">
                      <div className="font-mono text-[10px] text-cyan-300 font-bold uppercase">
                        [Microgravity Fire-Safety Implications &amp; Uncertainty]
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {ev.fireSafetyImplications.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                        Uncertainty: {ev.uncertaintyNote}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Official NASA PSI Microgravity Combustion Resource Catalog */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Verified NASA Physical Sciences Informatics (PSI) Combustion Catalog</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Official investigation metadata fetched from <span className="font-mono">psi.nasa.gov</span>.
              Select a study to inspect its scientific objective, experimental hardware, and publications.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {psiCatalog.map((study) => (
              <button
                key={study.accession}
                onClick={() => setSelectedStudyAccession(study.accession)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                  selectedStudyAccession === study.accession
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                    : 'bg-[#0e162d] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {study.accession} · {study.acronym}
              </button>
            ))}
          </div>
        </div>

        {selectedStudy && (
          <div className="bg-[#0e162d] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                    {selectedStudy.accession}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    DOI: {selectedStudy.doi || 'N/A'} · License: {selectedStudy.licenseIdentifier || 'Public'}
                  </span>
                  {selectedStudy.accession === 'PSI-100' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      TELEMETRY LOADED ABOVE
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white">
                  {selectedStudy.title} ({selectedStudy.acronym})
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedStudy.managingNasaCenter} · {selectedStudy.flightProgram} · Hardware:{' '}
                  <span className="text-slate-200">{selectedStudy.experimentHardware}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={selectedStudy.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium"
                >
                  <span>Open NASA PSI Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] font-bold text-cyan-300 uppercase">
                  Research Objective
                </div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedStudy.objective}
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] font-bold text-cyan-300 uppercase">
                  Experimental Approach
                </div>
                <p className="text-slate-300 leading-relaxed">{selectedStudy.approach}</p>
              </div>
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] font-bold text-amber-300 uppercase">
                  Scientific Hypothesis &amp; Investigators
                </div>
                <p className="text-slate-300 leading-relaxed">{selectedStudy.hypothesis}</p>
                {selectedStudy.contacts?.length > 0 && (
                  <div className="pt-2 text-[11px] text-slate-400 font-mono">
                    Investigators:{' '}
                    {selectedStudy.contacts
                      .slice(0, 3)
                      .map((c) => `${c.firstName} ${c.lastName}${c.affiliation ? ` (${c.affiliation})` : ''}`)
                      .join(', ')}
                  </div>
                )}
              </div>
            </div>

            {selectedStudy.publications && selectedStudy.publications.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="font-mono text-[11px] font-bold text-slate-400 uppercase">
                  Peer-Reviewed NASA PSI Publications ({selectedStudy.publications.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedStudy.publications.slice(0, 4).map((pub, i) => (
                    <div
                      key={i}
                      className="bg-[#080d1a] border border-slate-800 rounded p-2.5 text-[11px] space-y-0.5"
                    >
                      <div className="text-slate-200 font-medium">{pub.title}</div>
                      <div className="text-slate-400">
                        {pub.authorList}
                        {pub.doi ? ` · DOI: ${pub.doi}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Paginated Raw Aligned NASA Telemetry Table */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Aligned NASA PSI-100 SAFFIRE-III Sensor Measurements
            </h3>
            <p className="text-xs text-slate-400">
              Showing {paginatedRows.length} of {filteredRows.length} 2-second aligned frames (missing packet
              values shown as —).
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setTablePage(1);
              }}
              placeholder="Filter by time (e.g. 5956)..."
              className="w-full bg-[#0e162d] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0e162d] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">TIME (s)</th>
                <th className="py-2.5 px-3">RAD PEAK</th>
                <th className="py-2.5 px-3">RAD 1–4 (EU)</th>
                <th className="py-2.5 px-3">ANEM 1/2 (cm/s)</th>
                <th className="py-2.5 px-3">FAN (RPM)</th>
                <th className="py-2.5 px-3">IGN 1/2 (A)</th>
                <th className="py-2.5 px-3">SMOKE SCAT</th>
                <th className="py-2.5 px-3">CABIN T/P</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {paginatedRows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-cyan-300 font-semibold">{p.elapsedLabel}</td>
                  <td
                    className={`py-2 px-3 font-bold ${
                      p.radiometerPeak !== null && p.radiometerPeak >= 100
                        ? 'text-orange-400'
                        : p.radiometerPeak !== null && p.radiometerPeak >= 40
                        ? 'text-amber-300'
                        : 'text-slate-200'
                    }`}
                  >
                    {fmt(p.radiometerPeak, 2)}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {fmt(p.radiometer1, 1)} / {fmt(p.radiometer2, 1)} / {fmt(p.radiometer3, 1)} /{' '}
                    {fmt(p.radiometer4, 1)}
                  </td>
                  <td className="py-2 px-3 text-cyan-200">
                    {fmt(p.anemometer1, 1)} / {fmt(p.anemometer2, 1)}
                  </td>
                  <td className="py-2 px-3 text-slate-300">{fmt(p.fanTachometer, 0)}</td>
                  <td className="py-2 px-3 text-amber-300">
                    {fmt(p.sample1IgniterCurrent, 2)} / {fmt(p.sample2IgniterCurrent, 2)}
                  </td>
                  <td
                    className={`py-2 px-3 font-semibold ${
                      p.smokeScattering2 !== null && p.smokeScattering2 >= 1.0
                        ? 'text-rose-400'
                        : p.smokeScattering2 !== null && p.smokeScattering2 >= 0.1
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {fmt(p.smokeScattering2, 3)}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {fmt(p.cabinTemp, 1, '°C')} / {fmt(p.cabinPressure1, 2, 'psia')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>
            Page {Math.min(tablePage, totalPages)} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              disabled={tablePage <= 1}
              className="p-1.5 rounded bg-[#0e162d] border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
              disabled={tablePage >= totalPages}
              className="p-1.5 rounded bg-[#0e162d] border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
