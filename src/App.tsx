import { useState } from 'react';
import DashboardPage from './features/dashboard/DashboardPage';
import ObservationsPage from './features/observations/ObservationsPage';
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
  Radio,
  TableProperties,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('demo');

  const navItems = [
    {
      group: 'FRONTEND CORE & DATA ANALYTICS (TL02)',
      items: [
        {
          id: 'dashboard',
          label: 'Overview Dashboard',
          icon: Compass,
          desc: 'S01 · Tổng quan trạm NOAA',
          highlight: false,
        },
        {
          id: 'observations',
          label: 'Observations Explorer',
          icon: TableProperties,
          desc: 'S02 · Dữ liệu quan trắc sóng',
          highlight: false,
        },
      ],
    },

    {
      group: 'KHAI PHÁ & DỰ BÁO SÓNG (TL03)',
      items: [
        {
          id: 'forecast',
          label: 'Dự báo & Phân loại',
          icon: TrendingUp,
          desc: 'S07 · Hồi quy T+1 (WVHT) & Cấp sóng',
          highlight: false,
        },
        {
          id: 'correlations',
          label: 'Ma trận tương quan',
          icon: Grid,
          desc: 'S05 · Pearson & Spearman Heatmap',
          highlight: false,
        },
        {
          id: 'clustering',
          label: 'Phân cụm K-means',
          icon: Layers,
          desc: 'S06 · Chế độ sóng & Centroid Radar',
          highlight: false,
        },
        {
          id: 'models',
          label: 'Model Evaluation',
          icon: Database,
          desc: 'S08 · Model Lab & Baseline Benchmarks',
          highlight: false,
        },
      ],
    },

    {
      group: 'QUẢN TRỊ & HỆ THỐNG (ADMIN)',
      items: [
        {
          id: 'demo',
          label: 'Admin Demo Control',
          icon: ShieldAlert,
          desc: 'S11 · Xóa & Tái tạo Gold Sandbox',
          highlight: true,
        },
        {
          id: 'pipeline',
          label: 'Pipeline Monitor',
          icon: Activity,
          desc: 'S10 · Giám sát dịch vụ & Luồng DAG',
          highlight: false,
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#071726] text-[#e6f3ff] font-sans antialiased">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-72 flex-none bg-[#092033] border-r border-[#1a3b54] flex flex-col justify-between shadow-2xl z-20">

        <div className="p-5 min-h-0 flex flex-col">

          {/* LOGO & BRAND */}
          <div className="flex items-center gap-3 pb-5 border-b border-[#183952] shrink-0">

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-gray-950 shadow-lg shadow-cyan-500/20">
              <Waves className="w-6 h-6 text-gray-950 stroke-[2.5]" />
            </div>

            <div>
              <div className="text-base font-black tracking-wider text-white leading-none flex items-center gap-1.5">
                WAIMEA
                <span className="text-cyan-400">
                  WAVECAST
                </span>
              </div>

              <div className="text-[10px] text-cyan-300/80 font-mono tracking-widest uppercase mt-1 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                Station 51201 · Hawaii
              </div>
            </div>

          </div>

          {/* NAVIGATION */}
          <nav
            aria-label="Điều hướng chính"
            className="mt-6 space-y-6 min-h-0 flex-1 overflow-y-auto pr-1"
          >

            {navItems.map((grp) => (

              <div key={grp.group} className="space-y-1.5">

                {/* GROUP TITLE */}
                <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400/70 px-3">
                  {grp.group}
                </div>

                {/* MENU ITEMS */}
                {grp.items.map((item) => {

                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full group text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-3 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-gray-950 font-bold shadow-lg shadow-cyan-500/20 scale-[1.02]'
                          : item.highlight
                            ? 'bg-amber-950/40 text-amber-200 border border-amber-700/50 hover:bg-amber-900/40'
                            : 'text-[#adc7d9] hover:bg-[#102d44] hover:text-white'
                      }`}
                    >

                      {/* ICON */}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive
                            ? 'text-gray-950'
                            : item.highlight
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                        }`}
                      />

                      {/* MENU CONTENT */}
                      <div className="flex-1 min-w-0">

                        <div className="truncate font-semibold">
                          {item.label}
                        </div>

                        <div
                          className={`text-[10px] truncate ${
                            isActive
                              ? 'text-gray-900 font-medium'
                              : 'text-gray-400'
                          }`}
                        >
                          {item.desc}
                        </div>

                      </div>

                    </button>
                  );
                })}

              </div>
            ))}

          </nav>

        </div>

        {/* ================= SIDEBAR FOOTER ================= */}
        <div className="p-4 border-t border-[#183952] bg-[#071929] text-[11px] text-gray-400 space-y-1 shrink-0">

          <div className="flex justify-between items-center text-gray-300">
            <span className="font-semibold text-white">
              Vị trí:
            </span>
            <span>
              Vịnh Waimea, Oahu, HI
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>
              Múi giờ phân tích:
            </span>

            <span className="font-mono text-cyan-400">
              HST (UTC-10)
            </span>
          </div>

          <div className="pt-2 text-[10px] text-gray-500 flex justify-between items-center">

            <span>
              Frontend:
              <strong className="text-slate-300"> TL02 + TL03</strong>
            </span>

            <span className="text-emerald-400 font-medium">
              Waimea WaveCast
            </span>

          </div>

        </div>

      </aside>

      {/* ================= MAIN VIEWPORT ================= */}
      <main className="min-w-0 flex-1 overflow-y-auto bg-gradient-to-br from-[#071a2b] via-[#092238] to-[#071624] p-4 sm:p-6 lg:p-8">

        <div className="max-w-7xl mx-auto pb-12">

          {/* TL02: FRONTEND CORE */}
          {activeTab === 'dashboard' && (
            <DashboardPage />
          )}

          {activeTab === 'observations' && (
            <ObservationsPage />
          )}

          {/* TL03: DATA MINING & FORECAST */}
          {activeTab === 'correlations' && (
            <CorrelationPage />
          )}

          {activeTab === 'clustering' && (
            <ClusteringPage />
          )}

          {activeTab === 'forecast' && (
            <ForecastPage />
          )}

          {activeTab === 'models' && (
            <ModelsPage />
          )}

          {/* TL03: ADMIN & SYSTEM */}
          {activeTab === 'pipeline' && (
            <PipelinePage />
          )}

          {activeTab === 'demo' && (
            <DemoControlPage />
          )}

        </div>

      </main>

    </div>
  );
}
