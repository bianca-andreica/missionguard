import React, { useState } from 'react';
import { MissionProvider, useMission } from './context/MissionContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewView } from './components/overview/OverviewView';
import { TelemetryExplorer } from './components/explorer/TelemetryExplorer';
import { AnomalyCenter } from './components/anomalies/AnomalyCenter';
import { ScenarioSimulator } from './components/simulator/ScenarioSimulator';
import { MissionAssistant } from './components/assistant/MissionAssistant';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { NasaCombustionView } from './components/combustion/NasaCombustionView';
import { Menu, X } from 'lucide-react';

function DashboardContent() {
  const { activeTab } = useMission();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabMetadata: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Mission Operations Overview',
      subtitle: 'Real-time spacecraft telemetry streams, subsystem health score, and active anomaly alerts.',
    },
    combustion: {
      title: 'NASA Microgravity Combustion Data (PSI-100)',
      subtitle: 'Real NASA Physical Sciences Informatics SAFFIRE-III experimental telemetry, flame radiation, airflow, and fire-safety analysis.',
    },
    explorer: {
      title: 'Telemetry Explorer',
      subtitle: 'Multi-metric deep analysis, rolling statistical variance, and time-correlated anomaly overlays.',
    },
    anomalies: {
      title: 'Anomaly Center & Register',
      subtitle: 'Searchable event log, empirical threshold breaches, Z-score outliers, and operator resolution actions.',
    },
    simulator: {
      title: 'Hypothetical Scenario Simulator',
      subtitle: 'Inject spacecraft subsystem faults, compare with baseline telemetry, and evaluate detector sensitivity.',
    },
    assistant: {
      title: 'AI Mission Assistant',
      subtitle: 'Telemetry-aware diagnostics reasoning, physical hypothesis rankings, and flight contingency procedures.',
    },
    reports: {
      title: 'Flight Reports & Data Provenance',
      subtitle: 'Download 24h orbital CSV records, incident JSON files, and printable mission briefing sheets.',
    },
    settings: {
      title: 'Detection Engine Configuration',
      subtitle: 'Calibrate rolling Z-score parameters, rate-of-change multipliers, and subsystem redlines.',
    },
  };

  const currentMeta = tabMetadata[activeTab] || tabMetadata.overview;

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'combustion':
        return <NasaCombustionView />;
      case 'explorer':
        return <TelemetryExplorer />;
      case 'anomalies':
        return <AnomalyCenter />;
      case 'simulator':
        return <ScenarioSimulator />;
      case 'assistant':
        return <MissionAssistant />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080d1a] text-slate-100">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Mobile Sidebar Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 bg-[#0a1020] h-full shadow-2xl">
            <div className="p-4 flex justify-end">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile menu toggle bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-[#0a1020] border-b border-slate-800">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>
          <span className="font-bold text-xs tracking-wider text-cyan-400 uppercase font-mono">
            MissionGuard · NASA Space Apps 2026
          </span>
          <div className="w-5" />
        </div>

        <Header title={currentMeta.title} subtitle={currentMeta.subtitle} />

        <main className="flex-1 overflow-y-auto space-grid">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MissionProvider>
      <DashboardContent />
    </MissionProvider>
  );
}
