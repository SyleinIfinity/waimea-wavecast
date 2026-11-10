import { useState, useEffect } from 'react';
import {
  getDemoPreflight,
  previewDeletePatterns,
  deleteGoldPatterns,
  rebuildGoldPatterns,
  pollJobStatus,
} from '../../api/client';
import type { DemoPreflight, PreviewDeleteResponse, ProcessingJob } from '../../api/types';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Lock,
  Layers,
  Database,
  Info,
} from 'lucide-react';

export default function DemoControlPage() {
  const [preflight, setPreflight] = useState<DemoPreflight | null>(null);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([
    'time_series',
    'trend_seasonal',
    'correlations',
    'clustering',
    'predictions',
    'classifications',
  ]);
  const [previewData, setPreviewData] = useState<PreviewDeleteResponse | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [activeJob, setActiveJob] = useState<ProcessingJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);
  const [counts, setCounts] = useState<{ goldRows: number; bronzeRows: number; silverRows: number } | null>(null);

  useEffect(() => {
    getDemoPreflight().then((pf) => {
      setPreflight(pf);
      const totalGold =
        pf.counts.gold_metrics_rows +
        pf.counts.gold_trend_seasonal_rows +
        pf.counts.gold_correlations_rows +
        pf.counts.gold_clustering_rows +
        pf.counts.gold_predictions_rows +
        pf.counts.gold_classifications_rows;
      setCounts({
        goldRows: totalGold,
        bronzeRows: pf.counts.bronze_rows,
        silverRows: pf.counts.silver_rows,
      });
    });
  }, []);

  // Polling job tái tạo kết quả
  useEffect(() => {
    if (!activeJob || activeJob.status !== 'running') return;
    const interval = setInterval(async () => {
      const updated = await pollJobStatus(activeJob.job_id);
      setActiveJob(updated);
      if (updated.status === 'success') {
        setIsRebuilding(false);
        setDeletedSuccess(false);
        if (preflight) {
          const totalGold =
            preflight.counts.gold_metrics_rows +
            preflight.counts.gold_trend_seasonal_rows +
            preflight.counts.gold_correlations_rows +
            preflight.counts.gold_clustering_rows +
            preflight.counts.gold_predictions_rows +
            preflight.counts.gold_classifications_rows;
          setCounts((prev) => (prev ? { ...prev, goldRows: totalGold } : null));
        }
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [activeJob, preflight]);

  const togglePattern = (pattern: string) => {
    setSelectedPatterns((prev) =>
      prev.includes(pattern) ? prev.filter((p) => p !== pattern) : [...prev, pattern]
    );
  };

  const handlePreview = async () => {
    const res = await previewDeletePatterns({
      station_id: '51201',
      from_hst: '2026-01-01',
      to_hst: '2026-11-08',
      pattern_types: selectedPatterns as any,
    });
    setPreviewData(res);
  };

  const handleExecuteDelete = async () => {
    if (confirmInput !== 'DELETE GOLD DEMO') return;
    setIsDeleting(true);
    try {
      await deleteGoldPatterns(previewData?.dry_run_id || 'test');
      setShowConfirmModal(false);
      setConfirmInput('');
      setDeletedSuccess(true);
      setPreviewData(null);
      setCounts((prev) => (prev ? { ...prev, goldRows: 0 } : null));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRebuild = async () => {
    setIsRebuilding(true);
    const res = await rebuildGoldPatterns(selectedPatterns);
    setActiveJob({
      job_id: res.job_id,
      job_type: 'analysis',
      status: 'running',
      started_at: new Date().toISOString(),
      finished_at: null,
      progress_completed: 1,
      progress_total: selectedPatterns.length,
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-400 uppercase">
              <ShieldAlert className="w-4 h-4" />
              S11 · Quản trị & Diễn tập Kịch bản (Admin Demo Control)
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">Xóa & Tái tạo Kết quả Pattern (Gold Sandbox)</h1>
            <p className="text-sm text-[#adc7d9] mt-1">
              Phục vụ yêu cầu thi cuối kỳ: Xóa kết quả pattern trong DB và tái tạo lại qua API mà không huấn luyện lại mô hình.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-700/70 text-xs font-bold text-amber-300">
            <Lock className="w-4 h-4" />
            Môi trường: STAGING SANDBOX
          </div>
        </div>
      </div>

      {/* DASHBOARD SỐ LƯỢNG HÀNG TRƯỚC/SAU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-4">
          <span className="text-xs text-gray-400">Bronze Schema (Raw Ingestion)</span>
          <div className="text-xl font-bold text-white mt-1">
            {counts?.bronzeRows.toLocaleString()} <span className="text-xs font-normal text-emerald-400">hàng (Bảo tồn)</span>
          </div>
        </div>
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-4">
          <span className="text-xs text-gray-400">Silver Schema (Chuẩn hóa & QC)</span>
          <div className="text-xl font-bold text-white mt-1">
            {counts?.silverRows.toLocaleString()} <span className="text-xs font-normal text-emerald-400">hàng (Bảo tồn)</span>
          </div>
        </div>
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-4">
          <span className="text-xs text-gray-400">Gold Schema (Kết quả Pattern Demo)</span>
          <div className="text-xl font-bold mt-1 text-cyan-300">
            {counts?.goldRows === 0 ? (
              <span className="text-red-400 font-extrabold">0 hàng (ĐÃ XÓA)</span>
            ) : (
              `${counts?.goldRows.toLocaleString()} hàng`
            )}
          </div>
        </div>
      </div>

      {/* 3 CỘT: BẢO VỆ | CHỌN XÓA | TÁI TẠO REBUILD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT 1: CHECKLIST AN TOÀN */}
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-[#244b63] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              1. Bảng & Dữ liệu được bảo tồn
            </h2>
            <p className="text-xs text-gray-400 mt-2 mb-4">
              Tuyệt đối không có lệnh DROP SCHEMA hay XÓA DATABASE. Chỉ tác động các bảng kết quả pattern cho phép.
            </p>

            <div className="space-y-2 text-xs">
              {[
                { name: 'bronze.raw_observations', desc: 'Dữ liệu thô gốc bất biến', icon: '🔒' },
                { name: 'silver.wave_observations', desc: 'Dữ liệu đã chuẩn hóa 14 chỉ số', icon: '🔒' },
                { name: 'gold.model_registry', desc: 'Đăng ký phiên bản mô hình', icon: '🔒' },
                { name: 'gold.model_evaluations', desc: 'Bằng chứng đánh giá MAE/RMSE', icon: '🔒' },
                { name: 'GCS: noaa/raw & models', desc: 'Tệp gốc & file model .joblib', icon: '🔒' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded bg-[#0b2438] border border-[#244b63]">
                  <div>
                    <strong className="text-white font-mono">{item.name}</strong>
                    <div className="text-[10px] text-gray-400">{item.desc}</div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    PRESERVED
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#244b63] text-[11px] text-gray-400">
            *Dữ liệu staging có thể diễn tập xóa thủ công qua DBeaver bằng lệnh <code>DELETE FROM gold.patterns</code>.
          </div>
        </div>

        {/* CỘT 2: CHỌN PATTERN & XÓA CÓ BẢO VỆ */}
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-[#244b63] flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              2. Chọn Pattern xóa (Demo)
            </h2>
            <p className="text-xs text-gray-400 mt-2 mb-4">
              Chọn các bảng kết quả phân tích trong Gold cần xóa để chứng minh mất dữ liệu:
            </p>

            <div className="space-y-2 text-xs">
              {[
                { id: 'time_series', label: 'Gold: Time-Series Metrics' },
                { id: 'trend_seasonal', label: 'Gold: Trend & Seasonal' },
                { id: 'correlations', label: 'Gold: Correlations Matrix' },
                { id: 'clustering', label: 'Gold: K-means Assignments' },
                { id: 'predictions', label: 'Gold: Predictions (Hồi quy)' },
                { id: 'classifications', label: 'Gold: Classifications (Phân loại)' },
              ].map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 p-2 rounded bg-[#0b2438] border border-[#244b63] cursor-pointer hover:bg-[#153e5e]/40">
                  <input
                    type="checkbox"
                    checked={selectedPatterns.includes(p.id)}
                    onChange={() => togglePattern(p.id)}
                    className="rounded border-gray-600 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-gray-200 font-medium">{p.label}</span>
                </label>
              ))}
            </div>

            {previewData && (
              <div className="mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-xs text-amber-200">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Xem trước: Sẽ xóa {previewData.row_count.toLocaleString()} hàng
                </div>
                <div className="mt-1 text-[11px] text-gray-300">
                  Các bảng: {previewData.affected_tables.join(', ')}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#244b63] space-y-2">
            {!previewData ? (
              <button
                onClick={handlePreview}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-[#164358] border border-[#33617b] text-cyan-200 hover:bg-[#1d526b] transition-all"
              >
                Xem trước phạm vi xóa (Preview)
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-500 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xác nhận Xóa Gold Demo
              </button>
            )}
          </div>
        </div>

        {/* CỘT 3: TÁI TẠO (REBUILD JOBS 202 POLLING) */}
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-[#244b63] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              3. Tái tạo Kết quả (Rebuild)
            </h2>
            <p className="text-xs text-gray-400 mt-2 mb-4">
              Gọi API kích hoạt xử lý lại từ Silver và nạp mô hình từ GCS để suy luận (<strong>Không train lại</strong>).
            </p>

            {deletedSuccess && !activeJob && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-700/60 text-xs text-red-200 mb-4">
                Dữ liệu Gold đã bị xóa. Hãy bấm nút dưới đây để tái tạo lại.
              </div>
            )}

            {activeJob ? (
              <div className="bg-[#0b2438] p-4 rounded-lg border border-[#244b63] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Mã tác vụ:</span>
                  <span className="font-mono text-cyan-300 font-bold">{activeJob.job_id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Trạng thái:</span>
                  <span className="font-bold text-emerald-400 uppercase">{activeJob.status}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Tiến độ:</span>
                    <span>{activeJob.progress_completed} / {activeJob.progress_total} modules</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${((activeJob.progress_completed || 1) / (activeJob.progress_total || 4)) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {activeJob.status === 'success' && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-700 text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Đã tái tạo thành công {activeJob.inserted_rows?.toLocaleString()} hàng!
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-[#244b63] rounded-lg">
                Chưa có tác vụ tái tạo nào đang chạy.
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#244b63]">
            <button
              onClick={handleRebuild}
              disabled={isRebuilding}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-cyan-500 text-gray-950 hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebuilding ? 'animate-spin' : ''}`} />
              {isRebuilding ? 'Đang gửi Job 202 Accepted...' : 'Tái tạo Kết quả Pattern (Rebuild)'}
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL (2-STEP VERIFICATION) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#102d44] border border-red-700/80 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-[#244b63] pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Xác nhận xóa kết quả Gold Demo</h3>
            </div>

            <p className="text-xs text-gray-300">
              Thao tác này sẽ xóa <strong className="text-red-400">{previewData?.row_count.toLocaleString()}</strong> hàng kết quả trong schema <code>gold</code> để chuẩn bị bài thi demo. Dữ liệu <code>bronze</code> và <code>silver</code> sẽ được bảo toàn.
            </p>

            <div className="bg-[#081f33] p-3 rounded-lg border border-[#244b63] text-xs">
              <span className="text-gray-400">Vui lòng gõ chính xác dòng chữ sau để mở khóa:</span>
              <div className="font-mono font-bold text-cyan-300 mt-1 select-all">DELETE GOLD DEMO</div>
            </div>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Gõ 'DELETE GOLD DEMO'"
              className="w-full px-3 py-2 rounded-lg bg-[#081f33] border border-[#33617b] text-white text-xs focus:outline-none focus:border-red-400"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmInput('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteDelete}
                disabled={confirmInput !== 'DELETE GOLD DEMO' || isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 transition-all shadow-md"
              >
                {isDeleting ? 'Đang thực thi...' : 'Tôi hiểu, thực thi Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
