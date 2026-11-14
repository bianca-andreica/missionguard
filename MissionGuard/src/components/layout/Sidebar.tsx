import React from 'react';
import {
  Activity,
  LineChart,
  AlertTriangle,
  PlayCircle,
  Bot,
  FileText,
  Settings,
  Satellite,
  Radio,
  Clock,
  Flame,
} from 'lucide-react';
import { useMission } from '../../context/MissionContext';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { activeTab, setActiveTab, anomalies, missionStats, activeSimulation } = useMission();

  const activeAnomalyCount = anomalies.filter((a) => a.status === 'ACTIVE').length;
  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      badge: criticalCount > 0 ? `${criticalCount} alert` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'combustion',
      label: 'NASA Combustion Data',
      icon: Flame,
      badge: 'PSI-100',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'explorer',
      label: 'Telemetry Explorer',
      icon: LineChart,
    },
    {
      id: 'anomalies',
      label: 'Anomaly Center',
      icon: AlertTriangle,
      badge: activeAnomalyCount > 0 ? String(activeAnomalyCount) : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'simulator',
      label: 'Scenario Simulator',
      icon: PlayCircle,
      badge: activeSimulation ? 'Active' : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'assistant',
      label: 'AI Mission Assistant',
      icon: Bot,
    },
    {
      id: 'reports',
      label: 'Reports & Data',
      icon: FileText,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`w-64 bg-[#0a1020] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none ${className}`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Satellite className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-base">MissionGuard</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-mono">
                  v2.6
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-normal">
                NASA Space Apps 2026
              </p>
            </div>
          </div>
        </div>

        {/* Spacecraft / Mission Identification */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-[#0d152a]/40 text-xs text-slate-400">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-500">TARGET:</span>
            <span className="text-cyan-300 font-medium">AURA-SAT-4</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] mt-1">
            <span className="text-slate-500">ORBIT:</span>
            <span className="text-slate-300">LEO 415 km · INC 51.6°</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-cyan-400' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Live Mission Telemetry Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#080d1a]/80">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> MET:
            </span>
            <span className="font-mono text-cyan-300 font-medium text-[11px]">
              24:00:00 (ORB {missionStats.currentOrbit})
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Radio className="w-3.5 h-3.5 text-slate-500" /> LINK:
            </span>
            <span
              className={`font-mono text-[11px] font-semibold flex items-center gap-1.5 ${
                missionStats.contactStatus === 'AOS'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  missionStats.contactStatus === 'AOS'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              {missionStats.contactStatus === 'AOS' ? 'AOS (MADRID)' : 'LOS (STORE & FWD)'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 text-center">
            NASA Space Apps Challenge 2026
          </div>
        </div>
      </div>
    </aside>
  );
};
