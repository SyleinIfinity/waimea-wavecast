import { useState, useEffect } from 'react';
import DashboardPage from './features/dashboard/DashboardPage';
import DataExplorerPage from './features/data-explorer/DataExplorerPage';
import ForecastPage from './features/forecast/ForecastPage';
import CorrelationPage from './features/analysis/CorrelationPage';
import ClusteringPage from './features/clustering/ClusteringPage';
import ModelsPage from './features/models/ModelsPage';
import DataQualityPage from './features/data-quality/DataQualityPage';
import DemoControlPage from './features/demo-control/DemoControlPage';

import {
  Waves,
  Grid,
  Layers,
  TrendingUp,
  ShieldCheck,
  Compass,
  TableProperties,
  Clock,
  MapPin,
  ChevronRight,
  Wind,
  Thermometer,
  Gauge,
  Radio,
  Menu,
  X,
  Lock,
  Activity,
} from 'lucide-react';

export type NavTabId =
  | 'overview'
  | 'data-explorer'
  | 'forecast'
  | 'correlations'
  | 'clustering'
  | 'models'
  | 'data-quality'
  | 'admin'
  // Legacy backward-compat IDs
  | 'dashboard'
  | 'observations'
  | 'time-series'
  | 'trend'
  | 'demo'
  | 'pipeline';

interface NavItem {
  id: NavTabId;
  label: string;
  icon: typeof Compass;
  desc: string;
}

function formatLiveClock(date: Date, timeZone: string) {
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  const dateFormatted = new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  return { time, date: dateFormatted };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const vnClock = formatLiveClock(now, 'Asia/Ho_Chi_Minh');
  const hstClock = formatLiveClock(now, 'Pacific/Honolulu');

  // 8 required pages in exact order
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Tổng quan',
      icon: Compass,
      desc: 'Thông tin trạm NOAA 51201, danh mục API và kiến trúc Waimea WaveCast',
    },
    {
      id: 'data-explorer',
      label: 'Tra cứu dữ liệu',
      icon: TableProperties,
      desc: 'Biểu đồ trực quan, phân tích chuỗi thời gian & dữ liệu 3 lớp Bronze, Silver, Gold',
    },
    {
      id: 'forecast',
      label: 'Dự đoán và phân loại',
      icon: TrendingUp,
      desc: 'Dự báo sóng Calisthenics 1.5 cho 4 kỳ hạn (30 phút, 1 ngày, 7 ngày, 30 ngày) và phân loại cấp sóng',
    },
    {
      id: 'correlations',
      label: 'Ma trận tương quan',
      icon: Grid,
      desc: 'Hệ số tương quan Pearson và Spearman giữa các đại lượng khí tượng hải văn',
    },
    {
      id: 'clustering',
      label: 'K-Means',
      icon: Layers,
      desc: 'Phân nhóm điều kiện sóng tự nhiên và hình thái thời tiết biển',
    },
    {
      id: 'models',
      label: 'Đánh giá mô hình',
      icon: ShieldCheck,
      desc: 'Danh mục mô hình, trạng thái thẩm định ngầm (Shadow) và đối sánh Baseline',
    },
    {
      id: 'data-quality',
      label: 'Chất lượng và nguồn gốc dữ liệu',
      icon: Activity,
      desc: 'Độ đầy đủ (Coverage), kiểm tra QC và truy xuất nguồn gốc dữ liệu',
    },
    {
      id: 'admin',
      label: 'Quyền Admin',
      icon: Lock,
      desc: 'Diễn tập xóa và tái tạo kết quả trong DB thử nghiệm & giám sát Pipeline',
    },
  ];

  // Resolve active tab to primary 8 items for UI active state
  const resolvedTabId: NavTabId = (() => {
    if (activeTab === 'dashboard') return 'overview';
    if (activeTab === 'observations' || activeTab === 'time-series' || activeTab === 'trend') return 'data-explorer';
    if (activeTab === 'demo' || activeTab === 'pipeline') return 'admin';
    return activeTab;
  })();

  const currentItem = navItems.find((i) => i.id === resolvedTabId) || navItems[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d14] text-slate-200 font-sans antialiased">
      {/* ================= SIDEBAR ================= */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="main-navigation"
        className={`fixed inset-y-0 left-0 w-72 flex-none bg-[#0c111a] border-r border-slate-800 flex-col justify-between select-none z-30 md:static md:flex ${
          sidebarOpen ? 'flex' : 'hidden'
        }`}
      >
        <div className="p-4 flex flex-1 flex-col min-h-0">
          {/* BRAND HEADER */}
          <div className="flex items-center gap-3 px-2 py-2 mb-3 border-b border-slate-800 pb-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Waves className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-wider text-slate-100 uppercase">
                WAIMEA <span className="text-sky-400">WAVECAST</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Phao NOAA 51201
              </div>
            </div>
            <button
              type="button"
              aria-label="Đóng menu"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* TELEMETRY STATUS CHIP */}
          <div className="mx-2 mb-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              Quan trắc từ xa
            </span>
            <span className="text-emerald-400 font-medium">Trực tuyến</span>
          </div>

          {/* EXACT 8 NAVIGATION ITEMS */}
          <nav aria-label="Điều hướng chính" className="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = resolvedTabId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.desc}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full group text-left px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 text-white font-semibold border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 w-3 shrink-0">
                      {index + 1}
                    </span>
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR FOOTER STATION INFO */}
        <div className="p-3.5 border-t border-slate-800 bg-[#090d14] text-[11px] text-slate-400 space-y-1.5 shrink-0">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3 h-3 text-slate-400" /> Tọa độ trạm
            </span>
            <span className="font-mono text-slate-300 tabular-nums">21°40'12" N 158°07'00" W</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3 h-3 text-slate-400" /> Giờ Hawaii
            </span>
            <span className="font-mono text-slate-300">HST (UTC-10)</span>
          </div>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-slate-400" /> Vịnh Waimea
            </span>
            <span className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-slate-400" /> Oahu, Hawaii
            </span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* TOP SYSTEM BAR */}
        <header className="min-h-12 flex-none border-b border-slate-800 bg-[#0c111a] px-4 md:px-6 flex items-center justify-between gap-3 text-xs z-10">
          <button
            type="button"
            aria-label="Mở menu điều hướng"
            aria-controls="main-navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-300 md:hidden rounded-lg hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>

          <div className="flex min-w-0 items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="text-slate-200 font-semibold hidden sm:flex shrink-0 items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-sky-400" />
              Waimea WaveCast
            </span>
            <ChevronRight className="hidden sm:block w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate text-slate-100 font-medium">{currentItem.label}</span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs font-mono ml-auto">
            {/* ĐỒNG HỒ THỜI GIAN THỰC: VIỆT NAM & HAWAII */}
            <div className="flex items-center gap-2">
              {/* Giờ Việt Nam (UTC+7) */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090d14] border border-cyan-800/50 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-cyan-300 font-semibold text-[10px]">VN (UTC+7):</span>
                  <span className="text-white font-bold tabular-nums">{vnClock.time}</span>
                  <span className="text-slate-400 text-[10px] hidden sm:inline">{vnClock.date}</span>
                </div>
              </div>

              {/* Giờ Hawaii (HST · UTC-10) */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090d14] border border-amber-800/50 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-amber-300 font-semibold text-[10px]">Hawaii (HST):</span>
                  <span className="text-white font-bold tabular-nums">{hstClock.time}</span>
                  <span className="text-slate-400 text-[10px] hidden sm:inline">{hstClock.date}</span>
                </div>
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-2 text-slate-400 text-[11px]">
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-slate-400" /> Trạm 51201
              </span>
            </div>

            <div className="hidden lg:block h-3.5 w-px bg-slate-800" />
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden xl:inline">Dữ liệu thực tế NOAA</span>
              <span className="xl:hidden">NOAA</span>
            </div>
          </div>
        </header>

        {/* MAIN VIEWPORT */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-16">
            {/* 1. TỔNG QUAN */}
            {(activeTab === 'overview' || activeTab === 'dashboard') && <DashboardPage />}

            {/* 2. TRA CỨU DỮ LIỆU */}
            {activeTab === 'data-explorer' && <DataExplorerPage initialTab="chart" />}
            {activeTab === 'observations' && <DataExplorerPage initialTab="layers" initialLayer="silver" />}
            {activeTab === 'time-series' && <DataExplorerPage initialTab="time" initialTimeSubTab="aggregated" />}
            {activeTab === 'trend' && <DataExplorerPage initialTab="time" initialTimeSubTab="trend" />}

            {/* 3. DỰ ĐOÁN VÀ PHÂN LOẠI */}
            {activeTab === 'forecast' && <ForecastPage />}

            {/* 4. MA TRẬN TƯƠNG QUAN */}
            {activeTab === 'correlations' && <CorrelationPage />}

            {/* 5. K-MEANS */}
            {activeTab === 'clustering' && <ClusteringPage />}

            {/* 6. ĐÁNH GIÁ MÔ HÌNH */}
            {activeTab === 'models' && <ModelsPage />}

            {/* 7. CHẤT LƯỢNG VÀ NGUỒN GỐC DỮ LIỆU */}
            {activeTab === 'data-quality' && (
              <DataQualityPage onNavigateToExplorer={() => setActiveTab('data-explorer')} />
            )}

            {/* 8. QUYỀN ADMIN */}
            {(activeTab === 'admin' || activeTab === 'demo' || activeTab === 'pipeline') && (
              <DemoControlPage />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
