import { useState } from 'react';
import DashboardPage from './features/dashboard/DashboardPage';
import ObservationsPage from './features/observations/ObservationsPage';
import TimeSeriesPage from './features/time-series/TimeSeriesPage';
import TrendPage from './features/trend/TrendPage';
import DataQualityPage from './features/data-quality/DataQualityPage';
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
  ShieldCheck,
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
  Menu,
  X,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('demo');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navSections = [
    {
      title: 'Phân tích và dự báo (TL03)',
      items: [
        { id: 'forecast', label: 'Dự báo và phân loại', icon: TrendingUp, code: 'S07', desc: 'Dự báo độ cao sóng ngày kế tiếp và phân loại cấp sóng' },
        { id: 'correlations', label: 'Ma trận tương quan', icon: Grid, code: 'S05', desc: 'Tương quan Pearson và Spearman giữa các biến quan trắc' },
        { id: 'clustering', label: 'Phân cụm K-means', icon: Layers, code: 'S06', desc: 'Phân nhóm đặc trưng sóng biển và phân tích tâm cụm' },
        { id: 'models', label: 'Đánh giá mô hình', icon: Database, code: 'S08', desc: 'Danh mục mô hình và so sánh kết quả đánh giá' },
      ],
    },
    {
      title: 'Quản trị và diễn tập',
      items: [
        { id: 'demo', label: 'Điều khiển diễn tập', icon: ShieldAlert, code: 'S11', desc: 'Diễn tập xóa và tái tạo kết quả phân tích trong môi trường thử nghiệm' },
        { id: 'pipeline', label: 'Giám sát luồng xử lý', icon: Activity, code: 'S10', desc: 'Theo dõi quá trình thu thập và xử lý dữ liệu quan trắc' },
      ],
    },
    {
      title: 'Dữ liệu quan trắc (TL02)',
      items: [
        { id: 'dashboard', label: 'Tổng quan trạm', icon: Compass, code: 'S01', desc: 'Tổng quan các chỉ số quan trắc tại trạm Waimea' },
        { id: 'observations', label: 'Tra cứu quan trắc', icon: TableProperties, code: 'S02', desc: 'Tra cứu, lọc và xuất dữ liệu quan trắc phao biển' },
        { id: 'time-series', label: 'Phân tích chuỗi thời gian', icon: ChartNoAxesCombined, code: 'S03', desc: 'Phân tích dữ liệu theo ngày, tuần và tháng' },
        { id: 'trend', label: 'Xu hướng và tính mùa vụ', icon: TrendingUpDown, code: 'S04', desc: 'Phân rã chuỗi thời gian thành xu hướng, mùa vụ và phần dư' },
        { id: 'data-quality', label: 'Chất lượng và nguồn gốc dữ liệu', icon: ShieldCheck, code: 'S09', desc: 'Theo dõi độ đầy đủ, chất lượng và nguồn gốc dữ liệu' },
      ],
    },
  ];

  const currentItem = navSections.flatMap((s) => s.items).find((i) => i.id === activeTab);
  const currentSection = navSections.find((s) => s.items.some((i) => i.id === activeTab));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d14] text-slate-200 font-sans antialiased">
      {/* ================= SIDEBAR ================= */}
      {sidebarOpen && <button type="button" aria-label="Đóng menu điều hướng" className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside id="main-navigation" className={`fixed inset-y-0 left-0 w-68 flex-none bg-[#0c111a] border-r border-slate-800 flex-col justify-between select-none z-30 md:static md:flex ${sidebarOpen ? 'flex' : 'hidden'}`}>
        <div className="p-4 flex flex-1 flex-col min-h-0">
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
                Phao NOAA 51201
              </div>
            </div>
            <button type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 hover:text-white md:hidden"><X size={18} /></button>
          </div>

          {/* TELEMETRY STATUS CHIP */}
          <div className="mx-2 mb-3 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Radio className="w-3 h-3 text-sky-400" />
              Quan trắc từ xa
            </span>
            <span className="text-slate-400 font-medium">Trạm 51201</span>
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
                      title={item.desc}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      aria-current={isActive ? 'page' : undefined}
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
                        <span className="min-w-0 whitespace-normal leading-5">{item.label}</span>
                      </div>
                      <span
                        className={`ml-2 shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${
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
              <Clock className="w-3 h-3 text-slate-500" /> Giờ Hawaii
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
        <header className="min-h-12 flex-none border-b border-slate-800 bg-[#0c111a] px-4 md:px-6 flex items-center justify-between gap-3 text-xs z-10">
          <button type="button" aria-label="Mở menu điều hướng" aria-controls="main-navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-300 md:hidden"><Menu size={20} /></button>
          <div className="flex min-w-0 items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="text-slate-200 font-semibold hidden sm:flex shrink-0 items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-sky-400" />
              Trạm quan trắc Waimea
            </span>
            <ChevronRight className="hidden lg:block w-3.5 h-3.5 shrink-0 text-slate-600" />
            <span className="hidden lg:block text-slate-500">{currentSection?.title}</span>
            <ChevronRight className="hidden sm:block w-3.5 h-3.5 shrink-0 text-slate-600" />
            <span className="truncate text-slate-200 font-medium">{currentItem?.label}</span>
          </div>

          <div className="hidden xl:flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-slate-500" /> Khí áp: <strong className="text-slate-200 tabular-nums">1014.2 hPa</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-slate-500" /> Sóng lừng: <strong className="text-slate-200">325° NNW</strong>
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800"></div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Quan trắc phao NOAA 51201</span>
            </div>
          </div>
        </header>

        {/* MAIN VIEWPORT */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
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
            {activeTab === 'data-quality' && <DataQualityPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
