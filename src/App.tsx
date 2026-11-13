import { useState } from 'react';
import DashboardPage from './features/dashboard/DashboardPage';
import ObservationsPage from './features/observations/ObservationsPage';
import TimeSeriesPage from './features/time-series/TimeSeriesPage';
import TrendPage from './features/trend/TrendPage';
import CorrelationPage from './features/analysis/CorrelationPage';
import ClusteringPage from './features/clustering/ClusteringPage';
import ForecastPage from './features/forecast/ForecastPage';
import ModelsPage from './features/models/ModelsPage';
import PipelinePage from './features/pipeline-monitor/PipelinePage';
import DemoControlPage from './features/demo-control/DemoControlPage';

import {
  Waves,
  Grid,
  Layers,
  TrendingUp,
  Database,
  Activity,
  ShieldAlert,
  Compass,
  TableProperties,
  ChartNoAxesCombined,
  TrendingUpDown,
  Radio,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('demo');

  const navSections = [
    {
      title: 'Khai phá & Dự báo (TL03)',
      items: [
        { id: 'forecast', label: 'Dự báo & Phân loại', icon: TrendingUp, code: 'S07', desc: 'Hồi quy T+1 & Cấp sóng' },
        { id: 'correlations', label: 'Ma trận tương quan', icon: Grid, code: 'S05', desc: 'Pearson & Spearman' },
        { id: 'clustering', label: 'Phân cụm K-means', icon: Layers, code: 'S06', desc: 'Chế độ sóng & Centroid' },
        { id: 'models', label: 'Model Evaluation', icon: Database, code: 'S08', desc: 'Registry & Benchmarks' },
      ],
    },
    {
      title: 'Quản trị & Diễn tập (Admin)',
      items: [
        { id: 'demo', label: 'Demo Control Sandbox', icon: ShieldAlert, code: 'S11', desc: 'Xóa & Tái tạo Gold' },
        { id: 'pipeline', label: 'Pipeline Monitor', icon: Activity, code: 'S10', desc: 'Giám sát dịch vụ DAG' },
      ],
    },
    {
      title: 'Quan trắc & Thống kê (TL02)',
      items: [
        { id: 'dashboard', label: 'Overview Dashboard', icon: Compass, code: 'S01', desc: 'Tổng quan trạm NOAA' },
        { id: 'observations', label: 'Observations Explorer', icon: TableProperties, code: 'S02', desc: 'Dữ liệu quan trắc sóng' },
        { id: 'time-series', label: 'Time-Series Analytics', icon: ChartNoAxesCombined, code: 'S03', desc: 'Daily / Weekly / Monthly' },
        { id: 'trend', label: 'Trend & Seasonality', icon: TrendingUpDown, code: 'S04', desc: 'Phân rã chuỗi thời gian' },
      ],
    },
  ];

  // Tìm tab hiện tại để render breadcrumb
  const currentItem = navSections.flatMap((s) => s.items).find((i) => i.id === activeTab);
  const currentSection = navSections.find((s) => s.items.some((i) => i.id === activeTab));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#04090e] text-[#f1f5f9] font-sans antialiased">
      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 flex-none bg-[#071018] border-r border-white/[0.07] flex flex-col justify-between select-none z-20">
        <div className="p-4 flex flex-col min-h-0">
          {/* BRAND HEADER */}
          <div className="flex items-center gap-3 px-2 py-2 mb-4 border-b border-white/[0.06] pb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Waves className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
                WAIMEA <span className="text-cyan-400 font-semibold">WAVECAST</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                NOAA 51201 · Hawaii
              </div>
            </div>
          </div>

          {/* NAV LIST */}
          <nav aria-label="Điều hướng hệ thống" className="space-y-5 overflow-y-auto pr-1 flex-1 min-h-0">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2.5 py-1">
                  {sec.title}
                </div>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full group text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-white/[0.08] text-white font-medium border border-white/[0.12] shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                            : 'text-slate-600 group-hover:text-slate-400'
                        }`}
                      >
                        {item.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* SIDEBAR FOOTER STATION INFO */}
        <div className="p-3.5 border-t border-white/[0.06] bg-[#050c13] text-[11px] text-slate-400 space-y-1.5 shrink-0">
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <MapPin className="w-3 h-3 text-cyan-400" /> Vị trí
            </span>
            <span className="text-[11px] font-medium text-slate-200">Waimea Bay, Oahu, HI</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <Clock className="w-3 h-3 text-cyan-400" /> Múi giờ
            </span>
            <span className="text-[11px] font-mono text-cyan-300">HST (UTC-10)</span>
          </div>
          <div className="pt-2 border-t border-white/[0.05] flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>Phân hệ: <strong className="text-slate-400">TL03</strong></span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400"></span> Online
            </span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* TOP SYSTEM BAR */}
        <header className="h-12 flex-none border-b border-white/[0.07] bg-[#071018]/90 backdrop-blur px-6 flex items-center justify-between text-xs z-10">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span>Waimea WaveCast</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-500">{currentSection?.title}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium">{currentItem?.label}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px]">NDBC 51201 Live Polling</span>
            </div>
            <div className="h-3 w-px bg-white/[0.1]"></div>
            <div className="text-[11px] text-slate-400">
              Target: <span className="text-cyan-400 font-semibold">T+1 Daily Median (HST)</span>
            </div>
          </div>
        </header>

        {/* MAIN VIEWPORT */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8 bg-[#04090e]">
          <div className="max-w-7xl mx-auto pb-16">
            {/* TL03: DATA MINING & FORECAST */}
            {activeTab === 'forecast' && <ForecastPage />}
            {activeTab === 'correlations' && <CorrelationPage />}
            {activeTab === 'clustering' && <ClusteringPage />}
            {activeTab === 'models' && <ModelsPage />}

            {/* TL03: ADMIN & DEMO */}
            {activeTab === 'demo' && <DemoControlPage />}
            {activeTab === 'pipeline' && <PipelinePage />}

            {/* TL02: FRONTEND CORE */}
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'observations' && <ObservationsPage />}
            {activeTab === 'time-series' && <TimeSeriesPage />}
            {activeTab === 'trend' && <TrendPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
