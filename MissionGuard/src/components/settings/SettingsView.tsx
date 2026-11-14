import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Gauge,
  Activity,
  Layers,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';
import { DEFAULT_DETECTION_SETTINGS } from '../../utils/anomalyDetector';
import { METRIC_DEFINITIONS } from '../../utils/telemetryGenerator';

export const SettingsView: React.FC = () => {
  const {
    detectionSettings,
    updateDetectionSettings,
    resetToNominalBaseline,
  } = useMission();

  const [savedNotice, setSavedNotice] = useState(false);

  const handleSensitivityChange = (sens: 'CONSERVATIVE' | 'NOMINAL' | 'AGGRESSIVE') => {
    updateDetectionSettings({ sensitivity: sens });
    flashSave();
  };

  const handleToggle = (key: 'enableThresholdCheck' | 'enableZScoreCheck' | 'enableRateCheck') => {
    updateDetectionSettings({ [key]: !detectionSettings[key] });
    flashSave();
  };

  const handleSliderChange = (key: 'zScoreThreshold' | 'rateMultiplier', val: number) => {
    updateDetectionSettings({ [key]: val });
    flashSave();
  };

  const handleThresholdOverride = (metric: string, field: string, val: number) => {
    const existing = detectionSettings.thresholdOverrides[metric] || {};
    updateDetectionSettings({
      thresholdOverrides: {
        ...detectionSettings.thresholdOverrides,
        [metric]: {
          ...existing,
          [field]: val,
        },
      },
    });
    flashSave();
  };

  const flashSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Mission Telemetry & Anomaly Engine Settings</span>
            <span className="text-xs font-mono text-cyan-400 font-normal">
              [Autonomous Pipeline Tuning]
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Adjust statistical boundaries, rolling window standard deviations, rate-of-change
            derivatives, and redline critical engineering limits.
          </p>
        </div>

        <button
          onClick={resetToNominalBaseline}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Factory Reset Telemetry & Settings</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Anomaly detection settings updated. Telemetry re-analyzed in real-time.</span>
        </div>
      )}

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Sensitivity Preset */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>Detection Sensitivity Profile</span>
          </h3>
          <p className="text-xs text-slate-400">
            Presets automatically calibrate sigma confidence intervals and rate filters.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              {
                id: 'CONSERVATIVE',
                title: 'Conservative',
                desc: 'Higher margins, fewer false positives, 3.5σ threshold.',
              },
              {
                id: 'NOMINAL',
                title: 'Nominal (Standard)',
                desc: 'Balanced standard NASA flight operations, 2.8σ threshold.',
              },
              {
                id: 'AGGRESSIVE',
                title: 'Aggressive',
                desc: 'Early warning for microscopic telemetry deviations, 2.2σ threshold.',
              },
            ].map((preset) => {
              const isSelected = detectionSettings.sensitivity === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSensitivityChange(preset.id as any)}
                  className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm shadow-cyan-950/20'
                      : 'bg-[#0e162d] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold font-mono text-cyan-300">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {preset.desc}
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-slate-500">
                    {isSelected ? '✓ Active Profile' : 'Select'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Algorithm Modules Toggle */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Active Detection Modules</span>
          </h3>
          <p className="text-xs text-slate-400">
            Toggle individual statistical and deterministic detectors on or off.
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                key: 'enableThresholdCheck',
                name: 'Engineering Boundary Checks',
                desc: 'Flags telemetry exceeding upper/lower warning and redline critical limits.',
              },
              {
                key: 'enableZScoreCheck',
                name: 'Rolling Z-Score Outlier Analysis',
                desc: 'Detects statistical variance anomalies relative to 48-minute rolling orbit mean.',
              },
              {
                key: 'enableRateCheck',
                name: 'Rate-of-Change (Δv/Δt) Derivative Filter',
                desc: 'Catches abrupt mechanical, thermal, or electrical transients before static limits breach.',
              },
            ].map((module) => {
              const enabled = Boolean(detectionSettings[module.key as keyof typeof detectionSettings]);
              return (
                <div
                  key={module.key}
                  className="flex items-center justify-between p-3 bg-[#0e162d] rounded-lg border border-slate-800"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-200 block">
                      {module.name}
                    </span>
                    <span className="text-[11px] text-slate-400 leading-tight block">
                      {module.desc}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle(module.key as any)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ml-4 ${
                      enabled ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      } mt-1`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Statistical Parameters Sliders */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Statistical Engine Sliders</span>
          </h3>

          {/* Z Score Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Z-Score Outlier Threshold (σ):</span>
              <span className="font-mono text-cyan-300 font-bold">
                {detectionSettings.zScoreThreshold.toFixed(1)}σ
              </span>
            </div>
            <input
              type="range"
              min={2.0}
              max={4.5}
              step={0.1}
              value={detectionSettings.zScoreThreshold}
              onChange={(e) => handleSliderChange('zScoreThreshold', parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2.0σ (Sensitive)</span>
              <span>2.8σ (Nominal)</span>
              <span>4.5σ (Extreme)</span>
            </div>
          </div>

          {/* Rate Multiplier */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Rate-of-Change Multiplier:</span>
              <span className="font-mono text-cyan-300 font-bold">
                {detectionSettings.rateMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={detectionSettings.rateMultiplier}
              onChange={(e) => handleSliderChange('rateMultiplier', parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.5x (Strict)</span>
              <span>1.0x (Standard)</span>
              <span>2.5x (Lenient)</span>
            </div>
          </div>
        </div>

        {/* Engineering Redline Limits Override */}
        <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Subsystem Engineering Redlines</span>
          </h3>
          <p className="text-xs text-slate-400">
            Customize specific metric thresholds to observe immediate dashboard updates.
          </p>

          <div className="space-y-3 pt-1">
            {/* Battery Temp Redline */}
            <div className="p-3 bg-[#0e162d] rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Battery Temp Critical High</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Default: {METRIC_DEFINITIONS.batteryTemp.criticalHigh}°C
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={25}
                  max={60}
                  step={1}
                  value={
                    detectionSettings.thresholdOverrides.batteryTemp?.criticalHigh ??
                    METRIC_DEFINITIONS.batteryTemp.criticalHigh
                  }
                  onChange={(e) =>
                    handleThresholdOverride('batteryTemp', 'criticalHigh', parseFloat(e.target.value))
                  }
                  className="w-20 px-2 py-1 bg-[#0b1328] border border-slate-700 rounded text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-400 font-mono">°C</span>
              </div>
            </div>

            {/* Angular Rate Redline */}
            <div className="p-3 bg-[#0e162d] rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Net Angular Rate Warning</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Default: {METRIC_DEFINITIONS.angularRate.warningHigh} deg/s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={
                    detectionSettings.thresholdOverrides.angularRate?.warningHigh ??
                    METRIC_DEFINITIONS.angularRate.warningHigh
                  }
                  onChange={(e) =>
                    handleThresholdOverride('angularRate', 'warningHigh', parseFloat(e.target.value))
                  }
                  className="w-20 px-2 py-1 bg-[#0b1328] border border-slate-700 rounded text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-400 font-mono">deg/s</span>
              </div>
            </div>

            {/* Comm RSSI Critical */}
            <div className="p-3 bg-[#0e162d] rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Comm RSSI Critical Low</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Default: {METRIC_DEFINITIONS.commRssi.criticalLow} dBm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={-140}
                  max={-70}
                  step={1}
                  value={
                    detectionSettings.thresholdOverrides.commRssi?.criticalLow ??
                    METRIC_DEFINITIONS.commRssi.criticalLow
                  }
                  onChange={(e) =>
                    handleThresholdOverride('commRssi', 'criticalLow', parseFloat(e.target.value))
                  }
                  className="w-20 px-2 py-1 bg-[#0b1328] border border-slate-700 rounded text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-400 font-mono">dBm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
