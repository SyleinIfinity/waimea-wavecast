import { useState } from 'react';
import DashboardPage from './features/dashboard/DashboardPage';
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
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('forecast');

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Compass, badge: 'TL02' },
    { id: 'correlations', label: 'Correlation Matrix', icon: Grid, badge: 'TL03' },
    { id: 'clustering', label: 'Clustering K-means', icon: Layers, badge: 'TL03' },
    { id: 'forecast', label: 'Forecast & Classify', icon: TrendingUp, badge: 'TL03' },
    { id: 'models', label: 'Model Evaluation', icon: Database, badge: 'TL03' },
    { id: 'pipeline', label: 'Pipeline Monitor', icon: Activity, badge: 'Admin' },
    { id: 'demo', label: 'Demo Control', icon: ShieldAlert, badge: 'Admin' },
  ];

  return (
    <div className="shell flex min-h-screen bg-[#071e32] text-[#e6f3ff]">
      {/* SIDEBAR NAVIGATION */}
      <nav className="w-64 flex-none bg-[#0b2a42] p-6 border-r border-[#28485c] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <b className="text-base tracking-wider text-white block leading-tight">WAIMEA</b>
              <small className="text-[10px] text-cyan-400 tracking-widest font-bold">WAVECAST</small>
            </div>
          </div>

          <div className="mt-8 space-y-1">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider px-3 mb-2">
              Tính năng phân hệ
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-gray-950 font-bold shadow-md'
                      : 'text-gray-300 hover:bg-[#102d44] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? 'bg-gray-950/20 text-gray-950 font-bold'
                        : item.badge === 'Admin'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-[#102d44] text-cyan-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-[#244b63] text-xs text-gray-400">
          <div className="font-semibold text-white">NOAA Buoy 51201</div>
          <div className="text-[11px] text-cyan-400">Waimea Bay, Hawaii</div>
          <div className="text-[10px] text-gray-500 mt-1">Phân công: TL03 (ML & Admin)</div>
        </div>
      </nav>

      {/* MAIN CONTENT OUTLET */}
      <main className="flex-1 p-8 max-w-7xl overflow-y-auto">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'correlations' && <CorrelationPage />}
        {activeTab === 'clustering' && <ClusteringPage />}
        {activeTab === 'forecast' && <ForecastPage />}
        {activeTab === 'models' && <ModelsPage />}
        {activeTab === 'pipeline' && <PipelinePage />}
        {activeTab === 'demo' && <DemoControlPage />}
      </main>
    </div>
  );
}
