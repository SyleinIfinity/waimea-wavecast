import { useState, useEffect } from 'react';
import { getModelRegistry, getConfusionMatrix } from '../../api/client';
import type { ModelRegistryItem, ConfusionMatrixData } from '../../api/types';
import { CheckCircle, Clock, ShieldCheck } from 'lucide-react';

export default function ModelsPage() {
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [matrixData, setMatrixData] = useState<ConfusionMatrixData | null>(null);
  const [activeTab, setActiveTab] = useState<'registry' | 'comparison' | 'confusion'>('registry');
  const [selectedTask, setSelectedTask] = useState<'all' | 'regression' | 'classification' | 'clustering'>('all');
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  useEffect(() => {
    getModelRegistry()
      .then(setModels)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'confusion') return;
    getConfusionMatrix()
      .then(setMatrixData)
      .catch((reason: unknown) => setMatrixError(reason instanceof Error ? reason.message : String(reason)));
  }, [activeTab]);

  if (loading) return <div className="py-20 text-center text-slate-400">Đang tải danh mục mô hình...</div>;
  if (error) return <div role="alert" className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-5 text-rose-200">Không thể tải danh mục mô hình: {error}</div>;

  const filteredModels = selectedTask === 'all' ? models : models.filter((m) => m.task_type === selectedTask);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 font-medium mb-1">
            <span>S08</span>
            <span className="text-slate-600">/</span>
            <span>Model Lab</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Model Registry &amp; Evaluation Benchmarks
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Theo dõi vòng đời các mô hình dự báo sóng &amp; khí hậu, chỉ số kiểm định trên tập dữ liệu held-out và đối sánh mô hình cơ sở (Baseline).
          </p>
        </div>

        {/* TABS SELECTOR */}
        <div className="inline-flex items-center p-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Danh mục Model
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            So sánh Baseline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('confusion')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'confusion'
                ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700'
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
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedTask === task
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 font-medium'
                    : 'bg-[#0f1520] border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {task === 'all' ? 'TẤT CẢ' : task.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {filteredModels.map((m) => (
              <div key={m.model_id} className="p-5 rounded-lg bg-[#0f1520] border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase flex items-center gap-1 ${
                        m.status === 'ready'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                          : m.status === 'draft'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-800/60'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {m.status === 'ready' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {m.status}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-100 font-mono">{m.model_name}</h3>
                    <span className="text-xs text-slate-500 font-mono">({m.model_version})</span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
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
                    <div className="text-slate-200 mt-1">{m.dataset_version}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Chỉ số nghiệm thu:</span>
                    <div className="text-slate-100 mt-1 font-medium tabular-nums">
                      {m.metrics.mae !== undefined && `MAE: ${m.metrics.mae}m | RMSE: ${m.metrics.rmse}m | R²: ${m.metrics.r2}`}
                      {m.metrics.accuracy !== undefined && `Acc: ${(m.metrics.accuracy * 100).toFixed(1)}% | F1: ${m.metrics.macro_f1}`}
                      {m.metrics.silhouette !== undefined && `Silhouette: ${m.metrics.silhouette}`}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>GCS Artifact: <code className="text-slate-400">{m.artifact_gcs_uri || 'Internal DB metadata'}</code></span>
                  <span>Đặc trưng sử dụng: {m.features_used.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div role="alert" className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-5 text-amber-200">
          Backend chưa cung cấp bảng so sánh baseline đầy đủ cho giao diện này.
        </div>
      )}

      {/* TAB 3: CONFUSION MATRIX */}
      {activeTab === 'confusion' && matrixError && <div role="alert" className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-5 text-rose-200">Không thể tải confusion matrix: {matrixError}</div>}
      {activeTab === 'confusion' && matrixData && (
        <div className="p-5 rounded-lg bg-[#0f1520] border border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Ma trận nhầm lẫn (Confusion Matrix) — Phân loại cấp sóng
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Ma trận nhầm lẫn do Backend cung cấp.
          </p>

          <div className="max-w-lg mx-auto p-5 rounded-lg bg-[#090d14] border border-slate-800">
            <div className="text-center font-mono text-[10px] text-slate-500 uppercase mb-3 tracking-wider">
              Nhãn dự đoán bởi Model (Predicted) →
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono">
              <div className="text-slate-500 p-2 text-[10px]">Actual ↓</div>
              {matrixData.labels.map((l) => (
                <div key={l} className="font-medium text-slate-300 p-2 bg-slate-800/80 rounded border border-slate-700 text-[11px]">
                  {l}
                </div>
              ))}

              {matrixData.matrix.map((row, i) => (
                <div key={i} className="contents">
                  <div className="font-medium text-slate-300 p-2 bg-slate-800/80 rounded border border-slate-700 flex items-center justify-center text-[11px]">
                    {matrixData.labels[i]}
                  </div>
                  {row.map((val, j) => {
                    const isDiagonal = i === j;
                    return (
                      <div
                        key={j}
                        className={`p-3 rounded flex flex-col items-center justify-center border transition-colors ${
                          isDiagonal
                            ? 'bg-sky-950/40 border-sky-800/60 text-sky-200'
                            : val > 20
                            ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                            : 'bg-[#0f1520] border-slate-800/80 text-slate-500'
                        }`}
                      >
                        <span className="text-sm font-semibold tabular-nums">{val}</span>
                        <span className="text-[9px] text-slate-500 mt-0.5 tabular-nums">
                          {((val / matrixData.total_samples) * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-800 flex justify-between text-[11px] font-mono text-slate-400">
              <span>Tổng số mẫu: <strong className="text-slate-200 tabular-nums">{matrixData.total_samples.toLocaleString()}</strong></span>
              <span className="text-slate-200 font-medium">Độ chính xác: 84.2%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
