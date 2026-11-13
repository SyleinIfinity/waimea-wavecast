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
  Clock,
  MapPin,
  ChevronRight,
  Wind,
  Thermometer,
  Gauge,
  Radio,
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d14] text-slate-200 font-sans antialiased">
      {/* ================= SIDEBAR ================= */}
      <aside className="w-68 flex-none bg-[#0c111a] border-r border-slate-800 flex flex-col justify-between select-none z-20">
        <div className="p-4 flex flex-col min-h-0">
          {/* BRAND HEADER */}
          <div className="flex items-center gap-3 px-2 py-2 mb-3 border-b border-slate-800 pb-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Waves className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wider text-slate-100 uppercase">
                WAIMEA <span className="text-sky-400 font-bold">WAVECAST</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                NOAA Buoy 51201
              </div>
            </div>
          </div>

          {/* TELEMETRY STATUS CHIP */}
          <div className="mx-2 mb-3 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Radio className="w-3 h-3 text-sky-400" />
              Chế độ Viễn thám
            </span>
            <span className="text-emerald-400 font-medium">24/7 Active</span>
          </div>

          {/* NAV LIST */}
          <nav aria-label="Điều hướng hệ thống" className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1">
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
                      className={`w-full group text-left px-2.5 py-2 rounded text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-sky-500/10 text-white font-medium border border-sky-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-sky-500/20 text-sky-300 font-medium'
                            : 'text-slate-500 group-hover:text-slate-400'
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
        <div className="p-3.5 border-t border-slate-800 bg-[#090d14] text-[11px] text-slate-400 space-y-1.5 shrink-0">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3 h-3 text-slate-500" /> Tọa độ trạm
            </span>
            <span className="font-mono text-slate-300 tabular-nums">21°40'12" N 158°07'00" W</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" /> Múi giờ Đảo
            </span>
            <span className="font-mono text-slate-300">HST (UTC-10)</span>
          </div>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-slate-500" /> Gió: <strong className="text-slate-300">14 kts ENE</strong>
            </span>
            <span className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-slate-500" /> Biển: <strong className="text-slate-300">25.4°C</strong>
            </span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* TOP SYSTEM BAR */}
        <header className="h-12 flex-none border-b border-slate-800 bg-[#0c111a] px-6 flex items-center justify-between text-xs z-10">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-sky-400" />
              Waimea Observatory
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-500">{currentSection?.title}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium">{currentItem?.label}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-slate-500" /> Khí áp: <strong className="text-slate-200 tabular-nums">1014.2 hPa</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-slate-500" /> Swell: <strong className="text-slate-200">325° NNW</strong>
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800"></div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
