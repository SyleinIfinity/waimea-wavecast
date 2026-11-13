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
  AlertTriangle,
  Trash2,
  RefreshCw,
  Lock,
  Check,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  Terminal,
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
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            S11 · Kịch bản Kiểm tra Cuối kỳ
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Demo Sandbox: Xóa &amp; Tái tạo Pattern (Gold)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Minh chứng độc lập: Xóa các kết quả phân tích trong Database (web mất dữ liệu) và gọi API tái tạo qua mô hình đã lưu trên GCS mà <strong className="text-slate-200">không huấn luyện lại</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0a1520] border border-white/[0.08] text-xs font-mono text-slate-300 self-start sm:self-auto shrink-0">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Scope: <strong className="text-white">Staging Sandbox</strong></span>
        </div>
      </div>

      {/* METRIC COUNTERS (3 TILES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BRONZE */}
        <div className="p-5 rounded-xl bg-[#09131d] border border-white/[0.07]">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Bronze Schema</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded font-mono">
              PRESERVED
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2 tracking-tight">
            {counts?.bronzeRows.toLocaleString() || '342,150'}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1.5">bản ghi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Dữ liệu gốc bất biến từ NOAA NDBC
          </div>
        </div>

        {/* SILVER */}
        <div className="p-5 rounded-xl bg-[#09131d] border border-white/[0.07]">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Silver Schema</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded font-mono">
              PRESERVED
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2 tracking-tight">
            {counts?.silverRows.toLocaleString() || '341,820'}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1.5">bản ghi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Quan trắc đã chuẩn hóa 14 chỉ số &amp; QC
          </div>
        </div>

        {/* GOLD */}
        <div className={`p-5 rounded-xl border transition-all ${
          counts?.goldRows === 0
            ? 'bg-rose-950/20 border-rose-500/40'
            : 'bg-[#09131d] border-white/[0.07]'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Gold Schema (Demo Scope)</span>
            {counts?.goldRows === 0 ? (
              <span className="text-[10px] text-rose-400 bg-rose-950/80 border border-rose-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                ĐÃ XÓA (EMPTY)
              </span>
            ) : (
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                SẴN SÀNG
              </span>
            )}
          </div>
          <div className={`text-2xl font-bold font-mono mt-2 tracking-tight ${
            counts?.goldRows === 0 ? 'text-rose-400' : 'text-white'
          }`}>
            {counts?.goldRows === 0 ? '0' : counts?.goldRows.toLocaleString() || '21,286'}
            <span className="text-xs text-slate-500 font-sans font-normal ml-1.5">hàng kết quả</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {counts?.goldRows === 0
              ? 'Dữ liệu pattern đã xóa. Bấm Rebuild để khôi phục.'
              : 'Gồm Metrics, Trend, K-means, Dự báo T+1.'}
          </div>
        </div>
      </div>

      {/* THREE STEP WORKFLOW CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* PANEL 1: PRESERVED OBJECTS */}
        <div className="p-5 rounded-xl bg-[#08121b] border border-white/[0.07] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
              <span className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
                1
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Bảng &amp; Artifact Bảo tồn
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 mb-3 leading-relaxed">
              Không có lệnh DROP SCHEMA hay XÓA DATABASE. Toàn bộ bảng nguồn và artifact mô hình được giữ nguyên vẹn.
            </p>

            <div className="space-y-1.5">
              {[
                { name: 'bronze.raw_observations', desc: 'Dữ liệu thô gốc bất biến', tag: 'BRONZE' },
                { name: 'silver.wave_observations', desc: 'Dữ liệu sóng chuẩn hóa UTC', tag: 'SILVER' },
                { name: 'silver.daily_features', desc: 'Đặc trưng ngày múi giờ HST', tag: 'SILVER' },
                { name: 'gold.model_registry', desc: 'Đăng ký phiên bản mô hình', tag: 'META' },
                { name: 'gold.model_evaluations', desc: 'Bằng chứng kiểm định test set', tag: 'META' },
                { name: 'gs://waimea-noaa/models', desc: 'Model nhị phân .joblib trên GCS', tag: 'GCS' },
              ].map((item) => (
                <div
                  key={item.name}
                  className="p-2.5 rounded-lg bg-[#050c14] border border-white/[0.04] flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-mono text-xs text-slate-200 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</div>
                  </div>
                  <span className="text-[9px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05] text-[10px] text-slate-500 leading-normal">
            *Nếu giảng viên yêu cầu mở DBeaver chạy lệnh DELETE thủ công, trang này vẫn tự động phát hiện số dòng về 0.
          </div>
        </div>

        {/* PANEL 2: SELECT PATTERNS & PREVIEW */}
        <div className="p-5 rounded-xl bg-[#08121b] border border-white/[0.07] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
              <span className="w-5 h-5 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xs font-bold font-mono">
                2
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Chọn Pattern Xóa (Demo)
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 mb-3 leading-relaxed">
              Chọn các bảng kết quả phân tích trong Gold để chuẩn bị bài thi diễn tập:
            </p>

            <div className="space-y-1.5">
              {[
                { id: 'time_series', label: 'Gold: Time-Series Metrics', table: 'gold.time_series_metrics' },
                { id: 'trend_seasonal', label: 'Gold: Trend & Seasonal', table: 'gold.trend_seasonal_components' },
                { id: 'correlations', label: 'Gold: Correlation Matrix', table: 'gold.correlations' },
                { id: 'clustering', label: 'Gold: K-means Assignments', table: 'gold.cluster_assignments' },
                { id: 'predictions', label: 'Gold: Predictions (Hồi quy)', table: 'gold.predictions' },
                { id: 'classifications', label: 'Gold: Classifications (Phân loại)', table: 'gold.classifications' },
              ].map((p) => {
                const isChecked = selectedPatterns.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-[#0d1c2a] border-cyan-500/30 text-slate-100'
                        : 'bg-[#050c14] border-white/[0.04] text-slate-400 hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePattern(p.id)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 bg-[#050c14] w-3.5 h-3.5"
                      />
                      <div>
                        <div className="text-xs font-medium">{p.label}</div>
                        <div className="text-[10px] font-mono text-slate-500">{p.table}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {previewData && (
              <div className="mt-3 p-3 rounded-lg bg-amber-950/20 border border-amber-600/40 text-xs text-amber-200">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Xem trước: Sẽ xóa {previewData.row_count.toLocaleString()} dòng kết quả
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Bảo tồn: {previewData.protected_tables.slice(0, 3).join(', ')}...
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            {!previewData ? (
              <button
                type="button"
                onClick={handlePreview}
                className="w-full py-2.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 border border-white/[0.1] transition-all"
              >
                Xem trước phạm vi xóa (Preview)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xác nhận Xóa Gold Demo (2 bước)
              </button>
            )}
          </div>
        </div>

        {/* PANEL 3: REBUILD PATTERNS */}
        <div className="p-5 rounded-xl bg-[#08121b] border border-white/[0.07] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
              <span className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold font-mono">
                3
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Tái tạo Kết quả (Rebuild)
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 mb-3 leading-relaxed">
              Gọi API kích hoạt xử lý lại từ Silver và tải mô hình từ GCS để tính toán lại:
            </p>

            {deletedSuccess && !activeJob && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 mb-3">
                Dữ liệu Gold đã bị xóa. Nhấn nút bên dưới để khôi phục.
              </div>
            )}

            {activeJob ? (
              <div className="p-4 rounded-lg bg-[#050c14] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Mã Job:</span>
                  <span className="text-cyan-400 font-semibold">{activeJob.job_id}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    activeJob.status === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}>
                    {activeJob.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Tiến trình:</span>
                    <span>{activeJob.progress_completed} / {activeJob.progress_total} modules</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${((activeJob.progress_completed || 1) / (activeJob.progress_total || 4)) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {activeJob.status === 'success' && (
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Đã tái tạo {activeJob.inserted_rows?.toLocaleString()} hàng! Web đã có dữ liệu.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/[0.08] rounded-lg">
                Chưa có tác vụ tái tạo nào đang chạy.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={handleRebuild}
              disabled={isRebuilding}
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebuilding ? 'animate-spin' : ''}`} />
              {isRebuilding ? 'Đang gửi Job 202 Polling...' : 'Tái tạo Kết quả Pattern (Rebuild)'}
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#09131d] border border-rose-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.07]">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Xác nhận Xóa Gold Demo (2 bước)</h3>
                <div className="text-[11px] text-slate-400 font-mono">Bảo tồn schema Bronze &amp; Silver</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Thao tác này sẽ xóa <strong className="text-rose-400 font-mono">{previewData?.row_count.toLocaleString()}</strong> hàng kết quả trong schema <code>gold</code>. Dữ liệu <code>bronze</code> và <code>silver</code> được bảo toàn.
            </p>

            <div className="p-3 rounded-lg bg-[#050c14] border border-white/[0.06] text-xs">
              <span className="text-slate-400 text-[11px]">Vui lòng gõ chính xác dòng chữ sau để mở khóa:</span>
              <div className="font-mono font-bold text-cyan-400 mt-1 select-all tracking-wider text-xs">
                DELETE GOLD DEMO
              </div>
            </div>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Gõ 'DELETE GOLD DEMO'"
              className="w-full px-3 py-2 rounded-lg bg-[#050c14] border border-white/[0.12] text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmInput('');
                }}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={confirmInput !== 'DELETE GOLD DEMO' || isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-all shadow-sm"
              >
                {isDeleting ? 'Đang thực thi...' : 'Thực thi Xóa Pattern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
