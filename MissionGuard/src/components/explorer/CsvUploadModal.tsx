import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { parseCSVTelemetry } from '../../utils/csvExporter';
import { useMission } from '../../context/MissionContext';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose }) => {
  const { loadCustomTelemetry } = useMission();
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      processFile(selected);
    }
  };

  const processFile = (f: File) => {
    setIsParsing(true);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseCSVTelemetry(text);
      setIsParsing(false);

      if (res.success && res.points) {
        setPreviewCount(res.points.length);
        setParsedData(res.points);
      } else {
        setParseError(res.error || 'Failed to parse CSV format.');
      }
    };

    reader.onerror = () => {
      setIsParsing(false);
      setParseError('Error reading file from disk.');
    };

    reader.readAsText(f);
  };

  const handleApply = () => {
    if (parsedData && parsedData.length > 0) {
      loadCustomTelemetry(parsedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0b1328] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Upload Telemetry CSV</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p>
            Upload your own spacecraft telemetry data. Supported columns include timestamp,
            batteryvoltage, batterytemp, solar, angular, wheel, rssi.
          </p>
          <p className="text-slate-500">
            Missing values will be automatically interpolated to maintain continuous orbital time
            series.
          </p>
        </div>

        {/* Drop Area */}
        <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#0e162d]/50 hover:bg-[#0e162d] transition-colors">
          <FileText className="w-8 h-8 text-cyan-400/80" />
          <span className="text-xs font-medium text-slate-200">
            {file ? file.name : 'Click to select or drag and drop telemetry CSV'}
          </span>
          <span className="text-[11px] text-slate-500">Up to 50MB · .csv format</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {isParsing && (
          <div className="text-xs text-cyan-400 flex items-center gap-2 font-mono">
            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Parsing telemetry frame records...</span>
          </div>
        )}

        {parseError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{parseError}</span>
          </div>
        )}

        {previewCount !== null && !parseError && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Valid telemetry data: {previewCount} points loaded successfully.</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!parsedData || parsedData.length === 0}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
          >
            Load into Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
