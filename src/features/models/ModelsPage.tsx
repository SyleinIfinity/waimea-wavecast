import { useState, useEffect } from 'react';
import { getModelRegistry, getConfusionMatrix } from '../../api/client';
import type { ModelRegistryItem, ConfusionMatrixData } from '../../api/types';
import { Database, CheckCircle, Clock, Archive, Sparkles, Scale, ShieldCheck, ArrowRight } from 'lucide-react';

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
      <div className="p-8 text-center text-cyan-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
        <p>Đang tải danh mục mô hình và kết quả kiểm thử held-out...</p>
      </div>
    );
  }

  const filteredModels = selectedTask === 'all' ? models : models.filter((m) => m.task_type === selectedTask);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-400 uppercase">
              <Database className="w-4 h-4" />
              S08 · Quản trị & Đánh giá Mô hình (Model Lab)
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">Model Registry & Evaluation Benchmarks</h1>
            <p className="text-sm text-[#adc7d9] mt-1">
              Theo dõi vòng đời mô hình, chỉ số kiểm thử trên tập held-out độc lập và so sánh với mô hình cơ sở (Baseline).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#0b2438] p-1.5 rounded-lg border border-[#244b63]">
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeTab === 'registry' ? 'bg-cyan-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Danh mục Model
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeTab === 'comparison' ? 'bg-cyan-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              So sánh Baseline
            </button>
            <button
              onClick={() => setActiveTab('confusion')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeTab === 'confusion' ? 'bg-cyan-500 text-gray-950 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Confusion Matrix
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MODEL REGISTRY LIST */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {(['all', 'regression', 'classification', 'clustering'] as const).map((task) => (
              <button
                key={task}
                onClick={() => setSelectedTask(task)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  selectedTask === task
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-[#102d44] border-[#2b5268] text-gray-400 hover:text-white'
                }`}
              >
                {task === 'all' ? 'Tất cả tác vụ' : task.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredModels.map((m) => (
              <div key={m.model_id} className="bg-[#102d44] border border-[#2b5268] rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#244b63]">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        m.status === 'ready'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : m.status === 'draft'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-gray-900 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {m.status === 'ready' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {m.status}
                    </span>
                    <h3 className="text-base font-bold text-white">{m.model_name}</h3>
                    <span className="text-xs text-gray-400">({m.model_version})</span>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded bg-[#0b2438] text-cyan-400 font-semibold border border-[#244b63]">
                    {m.task_type.toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400">Thuật toán:</span>
                    <div className="font-semibold text-white mt-1">{m.algorithm}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Tập dữ liệu huấn luyện:</span>
                    <div className="font-semibold text-cyan-300 mt-1">{m.dataset_version}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Chỉ số đánh giá chính:</span>
                    <div className="font-semibold text-emerald-400 mt-1">
                      {m.metrics.mae !== undefined && `MAE: ${m.metrics.mae}m | RMSE: ${m.metrics.rmse}m | R²: ${m.metrics.r2}`}
                      {m.metrics.accuracy !== undefined && `Accuracy: ${(m.metrics.accuracy * 100).toFixed(1)}% | Macro-F1: ${m.metrics.macro_f1}`}
                      {m.metrics.silhouette !== undefined && `Silhouette Score: ${m.metrics.silhouette}`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#244b63] flex flex-wrap items-center justify-between text-[11px] text-gray-400">
                  <span>Artifact GCS: <code className="text-gray-300 bg-[#081f33] px-2 py-0.5 rounded">{m.artifact_gcs_uri || 'Internal DB metadata'}</code></span>
                  <span>Đặc trưng sử dụng: {m.features_used.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BASELINE COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">So sánh hiệu năng với Baseline</h2>
          </div>
          <p className="text-xs text-[#adc7d9] mb-5">
            Chứng minh mô hình Random Forest thực sự học được quy luật thời gian thay vì chỉ lặp lại giá trị ngày hôm trước (Persistence).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0b2438] text-gray-300 uppercase font-semibold border-b border-[#244b63]">
                <tr>
                  <th className="py-3 px-4">Tác vụ</th>
                  <th className="py-3 px-4">Mô hình ứng viên</th>
                  <th className="py-3 px-4">Mô hình Baseline</th>
                  <th className="py-3 px-4">MAE (Model vs Base)</th>
                  <th className="py-3 px-4">RMSE (Model vs Base)</th>
                  <th className="py-3 px-4">R² cải thiện</th>
                  <th className="py-3 px-4">Kết luận kiểm thử</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#244b63] text-gray-200">
                <tr className="hover:bg-[#153e5e]/40">
                  <td className="py-3 px-4 font-bold text-cyan-400">Regression (T+1 WVHT)</td>
                  <td className="py-3 px-4 font-semibold text-white">RandomForestRegressor v1</td>
                  <td className="py-3 px-4 text-gray-400">Persistence (T+0 → T+1)</td>
                  <td className="py-3 px-4">
                    <strong className="text-emerald-400">0.285 m</strong> <span className="text-gray-400">vs 0.512 m</span>
                  </td>
                  <td className="py-3 px-4">
                    <strong className="text-emerald-400">0.382 m</strong> <span className="text-gray-400">vs 0.724 m</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-400 font-bold">+0.382</span> (0.814 vs 0.432)
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">Đạt chuẩn nghiệm thu</td>
                </tr>
                <tr className="hover:bg-[#153e5e]/40">
                  <td className="py-3 px-4 font-bold text-purple-400">Classification (Sóng)</td>
                  <td className="py-3 px-4 font-semibold text-white">RandomForestClassifier v1</td>
                  <td className="py-3 px-4 text-gray-400">Majority Class Baseline</td>
                  <td className="py-3 px-4" colSpan={2}>
                    Macro-F1: <strong className="text-emerald-400">0.828</strong> vs 0.330
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-400 font-bold">+150%</span>
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">Đạt chuẩn nghiệm thu</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONFUSION MATRIX */}
      {activeTab === 'confusion' && (
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Ma trận nhầm lẫn (Confusion Matrix) — Phân loại sóng</h2>
          </div>
          <p className="text-xs text-[#adc7d9] mb-5">
            Đánh giá độ chính xác phân loại sóng trên 1.100 mẫu kiểm thử độc lập (Test Set).
          </p>

          <div className="max-w-xl mx-auto bg-[#0b2438] p-6 rounded-xl border border-[#244b63]">
            <div className="text-center font-bold text-xs text-cyan-300 uppercase mb-4 tracking-wider">
              Nhãn dự đoán bởi Model (Predicted) →
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="font-bold text-gray-400 p-2">Thực tế (Actual) ↓</div>
              {matrixData.labels.map((l) => (
                <div key={l} className="font-bold text-white p-2 bg-[#102d44] rounded border border-[#2b5268]">
                  {l}
                </div>
              ))}

              {matrixData.matrix.map((row, i) => (
                <div key={i} className="contents">
                  <div className="font-bold text-white p-2 bg-[#102d44] rounded border border-[#2b5268] flex items-center justify-center">
                    {matrixData.labels[i]}
                  </div>
                  {row.map((val, j) => {
                    const isDiagonal = i === j;
                    return (
                      <div
                        key={j}
                        className={`p-3 rounded font-bold flex flex-col items-center justify-center border ${
                          isDiagonal
                            ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                            : val > 20
                            ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                            : 'bg-[#15344d] border-transparent text-gray-400'
                        }`}
                      >
                        <span className="text-base">{val}</span>
                        <span className="text-[10px] font-normal text-gray-400">
                          {((val / matrixData.total_samples) * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#244b63] flex justify-between text-xs text-gray-400">
              <span>Tổng số mẫu kiểm thử: <strong>{matrixData.total_samples.toLocaleString()}</strong></span>
              <span className="text-emerald-400 font-semibold">Độ chính xác tổng thể: 84.2%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
