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
  CloudSun,
  Wind,
  Thermometer,
  Gauge,
  Satellite,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('demo');

  const navSections = [
    {
      title: 'Khí hậu & Dự báo Hải văn (TL03)',
      items: [
        { id: 'forecast', label: 'Dự báo & Phân loại', icon: TrendingUp, code: 'S07', desc: 'Hồi quy T+1 (WVHT) & Cấp sóng' },
        { id: 'correlations', label: 'Ma trận tương quan', icon: Grid, code: 'S05', desc: 'Pearson & Spearman đa biến' },
        { id: 'clustering', label: 'Phân cụm K-means', icon: Layers, code: 'S06', desc: 'Chế độ vi khí hậu & Centroid' },
        { id: 'models', label: 'Model Evaluation', icon: Database, code: 'S08', desc: 'Registry & Benchmarks khí hậu' },
      ],
    },
    {
      title: 'Quản trị Trạm & Diễn tập (Admin)',
      items: [
        { id: 'demo', label: 'Demo Control Sandbox', icon: ShieldAlert, code: 'S11', desc: 'Xóa & Tái tạo Gold Sandbox' },
        { id: 'pipeline', label: 'Pipeline Monitor', icon: Activity, code: 'S10', desc: 'Giám sát viễn thám & DAG' },
      ],
    },
    {
      title: 'Chuỗi dữ liệu Quan trắc (TL02)',
      items: [
        { id: 'dashboard', label: 'Overview Dashboard', icon: Compass, code: 'S01', desc: 'Trạm khí tượng hải dương' },
        { id: 'observations', label: 'Observations Explorer', icon: TableProperties, code: 'S02', desc: 'Dữ liệu phao biển thực tế' },
        { id: 'time-series', label: 'Time-Series Analytics', icon: ChartNoAxesCombined, code: 'S03', desc: 'Chuỗi thời gian Khí tượng' },
        { id: 'trend', label: 'Trend & Seasonality', icon: TrendingUpDown, code: 'S04', desc: 'Xu hướng & Mùa vụ Thái Bình Dương' },
      ],
    },
  ];

  const currentItem = navSections.flatMap((s) => s.items).find((i) => i.id === activeTab);
  const currentSection = navSections.find((s) => s.items.some((i) => i.id === activeTab));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#03080e] text-[#f1f5f9] font-sans antialiased">
      {/* ================= SIDEBAR ================= */}
      <aside className="w-68 flex-none bg-[#050f1a]/95 backdrop-blur-md border-r border-teal-500/15 flex flex-col justify-between select-none z-20 shadow-2xl">
        <div className="p-4 flex flex-col min-h-0">
          {/* BRAND HEADER */}
          <div className="flex items-center gap-3 px-2 py-2 mb-4 border-b border-teal-500/15 pb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/20">
              <CloudSun className="w-5 h-5 text-slate-950 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
                WAIMEA <span className="text-teal-400 font-semibold">CLIMATE</span>
              </div>
              <div className="text-[10px] text-teal-300/80 font-mono mt-1 flex items-center gap-1.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Phao viễn thám NOAA 51201
              </div>
            </div>
          </div>

          {/* SATELLITE & SENSOR BADGE */}
          <div className="mx-2 mb-3 px-2.5 py-1.5 rounded-lg bg-teal-950/30 border border-teal-500/20 flex items-center justify-between text-[10px] font-mono text-teal-300">
            <span className="flex items-center gap-1.5">
              <Satellite className="w-3 h-3 text-teal-400" />
              Chế độ Viễn thám
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              24/7 Telemetry
            </span>
          </div>

          {/* NAV LIST */}
          <nav aria-label="Điều hướng hệ thống" className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400/60 px-2.5 py-1 flex items-center justify-between">
                  <span>{sec.title}</span>
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
                          ? 'bg-teal-500/15 text-white font-medium border border-teal-500/35 shadow-sm shadow-teal-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-teal-300' : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-teal-400/20 text-teal-300 font-semibold'
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
        <div className="p-3.5 border-t border-teal-500/15 bg-[#030910] text-[11px] text-slate-400 space-y-1.5 shrink-0">
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <MapPin className="w-3 h-3 text-teal-400" /> Tọa độ trạm
            </span>
            <span className="text-[10px] font-mono text-slate-300">21°40'12" N 158°07'00" W</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <Clock className="w-3 h-3 text-teal-400" /> Múi giờ Đảo
            </span>
            <span className="text-[10px] font-mono text-teal-300">HST (UTC-10)</span>
          </div>
          <div className="pt-2 border-t border-white/[0.05] flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-cyan-400" /> Gió: <strong className="text-slate-300">14 kts ENE</strong>
            </span>
            <span className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-amber-400" /> Biển: <strong className="text-slate-300">25.4°C</strong>
            </span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* TOP ATMOSPHERIC SYSTEM BAR */}
        <header className="h-12 flex-none border-b border-teal-500/15 bg-[#050f1a]/85 backdrop-blur-md px-6 flex items-center justify-between text-xs z-10 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="text-teal-400/90 font-semibold flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-teal-400" />
              Waimea ClimateCast
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-500">{currentSection?.title}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium">{currentItem?.label}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" /> Khí áp: <strong className="text-slate-200">1014.2 hPa</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-teal-400" /> Swell: <strong className="text-slate-200">325° NNW</strong>
              </span>
            </div>
            <div className="h-3 w-px bg-teal-500/20"></div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>NOAA 51201 Telemetry Live</span>
            </div>
          </div>
        </header>

        {/* MAIN VIEWPORT */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">
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
