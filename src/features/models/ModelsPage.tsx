import { useState, useEffect } from 'react';
import { getModelRegistry, getConfusionMatrix } from '../../api/client';
import type { ModelRegistryItem, ConfusionMatrixData } from '../../api/types';
import { Database, CheckCircle, Clock, Scale, ShieldCheck, Thermometer, Wind } from 'lucide-react';

export default function ModelsPage() {
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [matrixData, setMatrixData] = useState<ConfusionMatrixData | null>(null);
  const [activeTab, setActiveTab] = useState<'registry' | 'comparison' | 'confusion'>('registry');
  const [selectedTask, setSelectedTask] = useState<'all' | 'regression' | 'classification' | 'clustering'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getModelRegistry(), getConfusionMatrix()])
      .then(([m, c]) => {
        setModels(m);
        setMatrixData(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !matrixData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-teal-400 border-t-transparent mb-3"></div>
        <div className="text-xs font-mono">Đang tải danh mục mô hình &amp; benchmark kiểm thử...</div>
      </div>
    );
  }

  const filteredModels = selectedTask === 'all' ? models : models.filter((m) => m.task_type === selectedTask);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-teal-500/15">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-teal-400 font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
            S08 · Phòng Nghiên cứu &amp; Đánh giá Mô hình (Climate Model Lab)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Model Registry &amp; Evaluation Benchmarks
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Theo dõi vòng đời các mô hình dự báo sóng &amp; khí hậu, chỉ số kiểm định trên tập dữ liệu held-out và đối sánh mô hình cơ sở (Baseline).
          </p>
        </div>

        {/* TABS SELECTOR */}
        <div className="inline-flex items-center p-1 rounded-lg bg-[#06121d] border border-teal-500/20 text-xs font-mono self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'registry'
                ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Danh mục Model
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'comparison'
                ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            So sánh Baseline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('confusion')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'confusion'
                ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Confusion Matrix
          </button>
        </div>
      </div>

      {/* TAB 1: REGISTRY */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5">
            {(['all', 'regression', 'classification', 'clustering'] as const).map((task) => (
              <button
                key={task}
                type="button"
                onClick={() => setSelectedTask(task)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  selectedTask === task
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/40 font-semibold'
                    : 'bg-[#06121d] border border-teal-500/15 text-slate-400 hover:text-slate-200'
                }`}
              >
                {task === 'all' ? 'TẤT CẢ' : task.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {filteredModels.map((m) => (
              <div key={m.model_id} className="p-5 rounded-xl bg-[#06121d]/90 border border-teal-500/15 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-teal-500/10">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase flex items-center gap-1 ${
                        m.status === 'ready'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          : m.status === 'draft'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {m.status === 'ready' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {m.status}
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono">{m.model_name}</h3>
                    <span className="text-xs text-slate-500 font-mono">({m.model_version})</span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950/40 text-teal-300 border border-teal-500/25">
                    {m.task_type.toUpperCase()}
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[11px]">Thuật toán:</span>
                    <div className="text-slate-200 mt-1 font-sans text-xs">{m.algorithm}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Chuỗi huấn luyện:</span>
                    <div className="text-teal-200 mt-1">{m.dataset_version}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Chỉ số nghiệm thu:</span>
                    <div className="text-emerald-400 mt-1 font-semibold">
                      {m.metrics.mae !== undefined && `MAE: ${m.metrics.mae}m | RMSE: ${m.metrics.rmse}m | R²: ${m.metrics.r2}`}
                      {m.metrics.accuracy !== undefined && `Acc: ${(m.metrics.accuracy * 100).toFixed(1)}% | F1: ${m.metrics.macro_f1}`}
                      {m.metrics.silhouette !== undefined && `Silhouette: ${m.metrics.silhouette}`}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-teal-500/10 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>GCS Artifact: <code className="text-slate-400">{m.artifact_gcs_uri || 'Internal DB metadata'}</code></span>
                  <span>Đặc trưng sử dụng: {m.features_used.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BASELINE COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="p-6 rounded-xl bg-[#06121d]/90 border border-teal-500/15 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Scale className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              So sánh hiệu năng với Mô hình Cơ sở (Baseline)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Chứng minh mô hình Machine Learning thực sự dự báo được biến động hải văn thay vì chỉ lặp lại số liệu ngày hôm trước (Persistence).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-[#040a12] text-slate-400 uppercase text-[10px] border-b border-teal-500/15">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Tác vụ</th>
                  <th className="py-2.5 px-4 font-medium">Mô hình ứng viên</th>
                  <th className="py-2.5 px-4 font-medium">Mô hình Baseline</th>
                  <th className="py-2.5 px-4 font-medium">MAE (Model vs Base)</th>
                  <th className="py-2.5 px-4 font-medium">RMSE (Model vs Base)</th>
                  <th className="py-2.5 px-4 font-medium">R² cải thiện</th>
                  <th className="py-2.5 px-4 font-medium">Kết luận kiểm thử</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-500/10 text-slate-300">
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-bold text-teal-400">Regression (T+1 WVHT)</td>
                  <td className="py-3 px-4 text-white">RandomForestRegressor v1</td>
                  <td className="py-3 px-4 text-slate-500">Persistence (T+0 → T+1)</td>
                  <td className="py-3 px-4">
                    <strong className="text-emerald-400">0.285 m</strong> <span className="text-slate-500">vs 0.512 m</span>
                  </td>
                  <td className="py-3 px-4">
                    <strong className="text-emerald-400">0.382 m</strong> <span className="text-slate-500">vs 0.724 m</span>
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">
                    +0.382 (0.814 vs 0.432)
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">Đạt chuẩn nghiệm thu</td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-bold text-amber-400">Classification (Sóng)</td>
                  <td className="py-3 px-4 text-white">RandomForestClassifier v1</td>
                  <td className="py-3 px-4 text-slate-500">Majority Class Baseline</td>
                  <td className="py-3 px-4" colSpan={2}>
                    Macro-F1: <strong className="text-emerald-400">0.828</strong> vs 0.330
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">+150%</td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">Đạt chuẩn nghiệm thu</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONFUSION MATRIX */}
      {activeTab === 'confusion' && (
        <div className="p-6 rounded-xl bg-[#06121d]/90 border border-teal-500/15 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Ma trận nhầm lẫn (Confusion Matrix) — Phân loại cấp sóng
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Đánh giá độ chính xác phân loại cấp sóng biển trên 1.100 mẫu kiểm định độc lập (Test Set).
          </p>

          <div className="max-w-lg mx-auto p-5 rounded-xl bg-[#040a12] border border-teal-500/20">
            <div className="text-center font-mono text-[10px] text-teal-400/80 uppercase mb-3 tracking-wider">
              Nhãn dự đoán bởi Model (Predicted) →
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono">
              <div className="text-slate-500 p-2 text-[10px]">Actual ↓</div>
              {matrixData.labels.map((l) => (
                <div key={l} className="font-semibold text-slate-300 p-2 bg-teal-950/30 rounded border border-teal-500/20 text-[11px]">
                  {l}
                </div>
              ))}

              {matrixData.matrix.map((row, i) => (
                <div key={i} className="contents">
                  <div className="font-semibold text-slate-300 p-2 bg-teal-950/30 rounded border border-teal-500/20 flex items-center justify-center text-[11px]">
                    {matrixData.labels[i]}
                  </div>
                  {row.map((val, j) => {
                    const isDiagonal = i === j;
                    return (
                      <div
                        key={j}
                        className={`p-3 rounded flex flex-col items-center justify-center border transition-colors ${
                          isDiagonal
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : val > 20
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-white/[0.02] border-white/[0.03] text-slate-500'
                        }`}
                      >
                        <span className="text-sm font-bold">{val}</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">
                          {((val / matrixData.total_samples) * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3.5 border-t border-teal-500/10 flex justify-between text-[11px] font-mono text-slate-400">
              <span>Tổng số mẫu: <strong className="text-white">{matrixData.total_samples.toLocaleString()}</strong></span>
              <span className="text-emerald-400 font-semibold">Độ chính xác: 84.2%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
