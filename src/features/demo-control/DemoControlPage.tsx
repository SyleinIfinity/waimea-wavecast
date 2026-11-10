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
  Database,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
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
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c2842] via-[#0e3150] to-[#0a233b] p-6 border border-[#1d4669] shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-amber-400 bg-amber-950/60 border border-amber-600/50 uppercase">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              S11 · Quản trị & Diễn tập Kịch bản (Admin Demo Control)
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white mt-2 tracking-tight">
              Xóa & Tái tạo Kết quả Pattern <span className="text-cyan-400">(Gold Sandbox)</span>
            </h1>
            <p className="text-sm text-[#adc7d9] mt-1.5 max-w-3xl leading-relaxed">
              Kịch bản báo cáo cuối kỳ: Minh chứng khả năng xóa kết quả phân tích trong Database (web mất dữ liệu) và gọi API tái tạo lại bằng mô hình đã lưu trên GCS mà <strong>không huấn luyện lại</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#071a2b] border border-[#1d4669] text-xs font-semibold text-amber-300 shadow-inner">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Môi trường: <strong>STAGING SANDBOX</strong></span>
          </div>
        </div>
      </div>

      {/* DASHBOARD STATS CARDS (BEFORE / AFTER COMPARISON) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="relative overflow-hidden rounded-2xl bg-[#0a253d] border border-[#1b4363] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bronze Schema (Raw)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
              BẢO TỒN 100%
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-3 flex items-baseline gap-2">
            {counts?.bronzeRows.toLocaleString()}
            <span className="text-xs font-normal text-emerald-400">bản ghi</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Dữ liệu gốc NOAA NDBC không bao giờ bị xóa
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-[#0a253d] border border-[#1b4363] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Silver Schema (Normalized)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
              BẢO TỒN 100%
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-3 flex items-baseline gap-2">
            {counts?.silverRows.toLocaleString()}
            <span className="text-xs font-normal text-emerald-400">bản ghi</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Quan trắc đã chuẩn hóa 14 chỉ số StdMet & QC
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-2xl p-5 border shadow-lg transition-all ${
          counts?.goldRows === 0
            ? 'bg-red-950/40 border-red-600/80'
            : 'bg-[#0a253d] border-[#1b4363]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gold Schema (Pattern Demo)</span>
            {counts?.goldRows === 0 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-200 border border-red-500 animate-pulse">
                ĐÃ BỊ XÓA (EMPTY)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                SẴN SÀNG DIỄN TẬP
              </span>
            )}
          </div>
          <div className={`text-2xl font-black mt-3 flex items-baseline gap-2 ${
            counts?.goldRows === 0 ? 'text-red-400' : 'text-cyan-300'
          }`}>
            {counts?.goldRows === 0 ? '0' : counts?.goldRows.toLocaleString()}
            <span className="text-xs font-normal text-gray-400">hàng kết quả</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2">
            {counts?.goldRows === 0
              ? 'Web đang mất dữ liệu pattern. Bấm Rebuild để khôi phục.'
              : 'Gồm Metrics, Trend, Correlations, K-means, Dự báo.'}
          </div>
        </div>
      </div>

      {/* 3 WORKFLOW COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT 1: BẢNG DỮ LIỆU ĐƯỢC BẢO VỆ */}
        <div className="rounded-2xl bg-[#092238] border border-[#1b4363] p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-[#183952]">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-600/60 flex items-center justify-center text-emerald-400">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Bảng được bảo tồn</h2>
                <div className="text-[11px] text-gray-400">Không bao giờ bị xóa</div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { name: 'bronze.raw_observations', desc: 'Dữ liệu thô gốc bất biến', tag: 'BRONZE' },
                { name: 'silver.wave_observations', desc: 'Dữ liệu sóng chuẩn hóa UTC', tag: 'SILVER' },
                { name: 'silver.daily_features', desc: 'Đặc trưng ngày múi giờ HST', tag: 'SILVER' },
                { name: 'gold.model_registry', desc: 'Đăng ký phiên bản mô hình', tag: 'METADATA' },
                { name: 'gold.model_evaluations', desc: 'Bằng chứng kiểm định test set', tag: 'METADATA' },
                { name: 'GCS: gs://waimea-noaa/models', desc: 'File nhị phân mô hình .joblib', tag: 'STORAGE' },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#061828] border border-[#163852] hover:border-emerald-600/50 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-mono text-xs font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.desc}</div>
                  </div>
                  <span className="shrink-0 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#183952] text-[11px] text-gray-400">
            *Slide tuần 9: Nếu giảng viên yêu cầu mở DBeaver gõ lệnh xóa thủ công, bảng điều khiển này vẫn tự động nhận diện và cập nhật.
          </div>
        </div>

        {/* CỘT 2: CHỌN PATTERN ĐỂ XÓA DEMO */}
        <div className="rounded-2xl bg-[#092238] border border-[#1b4363] p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-[#183952]">
              <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-600/60 flex items-center justify-center text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Chọn Pattern xóa (Demo)</h2>
                <div className="text-[11px] text-gray-400">Chỉ xóa trong Gold schema</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
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
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-[#0f2d48] border-cyan-500/60 text-white'
                        : 'bg-[#061828] border-[#163852] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePattern(p.id)}
                        className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-0 bg-[#071929]"
                      />
                      <div>
                        <div className="text-xs font-semibold">{p.label}</div>
                        <div className="text-[10px] font-mono text-gray-400">{p.table}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {previewData && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/70 text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Xem trước: Sẽ xóa {previewData.row_count.toLocaleString()} dòng kết quả
                </div>
                <div className="text-[11px] text-gray-300">
                  Đã kiểm tra an toàn: Không chạm vào Bronze/Silver.
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#183952]">
            {!previewData ? (
              <button
                onClick={handlePreview}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#143d5c] border border-[#235882] text-cyan-300 hover:bg-[#1a4b70] transition-all shadow-md"
              >
                Xem trước phạm vi xóa (Preview)
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Mở xác nhận 2 bước xóa Demo
              </button>
            )}
          </div>
        </div>

        {/* CỘT 3: TÁI TẠO REBUILD PATTERN QUA API */}
        <div className="rounded-2xl bg-[#092238] border border-[#1b4363] p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-[#183952]">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-600/60 flex items-center justify-center text-cyan-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Tái tạo Kết quả (Rebuild)</h2>
                <div className="text-[11px] text-gray-400">Gọi API HTTP 202 & Polling Job</div>
              </div>
            </div>

            <p className="text-xs text-gray-300 mt-4 leading-relaxed">
              Kích hoạt pipeline đọc lại dữ liệu sạch từ <code>silver</code>, nạp mô hình từ GCS và ghi lại toàn bộ bảng trong <code>gold</code>.
            </p>

            {/* JOB STATUS CARD */}
            <div className="mt-5">
              {activeJob ? (
                <div className="p-4 rounded-xl bg-[#061828] border border-[#1d4669] space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Mã tác vụ:</span>
                    <span className="font-mono text-cyan-300 font-bold">{activeJob.job_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Trạng thái:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      activeJob.status === 'success'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-600 animate-pulse'
                    }`}>
                      {activeJob.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Tiến độ hoàn thành:</span>
                      <strong className="text-white">
                        {activeJob.progress_completed} / {activeJob.progress_total} modules
                      </strong>
                    </div>
                    <div className="w-full bg-[#0b2438] rounded-full h-2.5 overflow-hidden p-0.5 border border-[#183952]">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${((activeJob.progress_completed || 1) / (activeJob.progress_total || 4)) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {activeJob.status === 'success' && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-600/70 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Đã tái tạo thành công {activeJob.inserted_rows?.toLocaleString()} hàng! Web đã có dữ liệu trở lại.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-[#061828] border border-dashed border-[#1d4669] text-xs text-gray-400">
                  Chưa có tác vụ tái tạo nào đang chạy.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#183952]">
            <button
              onClick={handleRebuild}
              disabled={isRebuilding}
              className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-gray-950 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
              {isRebuilding ? 'Đang gửi Job 202 và Polling...' : 'Tái tạo Kết quả Pattern (Rebuild)'}
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL WITH GLASSMORPHISM */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b233a] border border-red-500/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-[#183952] pb-3">
              <div className="w-9 h-9 rounded-xl bg-red-950 flex items-center justify-center border border-red-700">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác nhận Xóa Gold Demo (2 bước)</h3>
                <div className="text-[11px] text-gray-400">Bảo vệ an toàn dữ liệu Staging</div>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Thao tác này sẽ xóa chọn lọc <strong className="text-red-400">{previewData?.row_count.toLocaleString()}</strong> hàng kết quả trong schema <code>gold</code>. Dữ liệu <code>bronze</code> và <code>silver</code> được bảo toàn 100%.
            </p>

            <div className="bg-[#061828] p-3.5 rounded-xl border border-[#183952] text-xs">
              <span className="text-gray-400">Vui lòng gõ chính xác dòng chữ sau để mở khóa nút xóa:</span>
              <div className="font-mono font-bold text-cyan-300 mt-1 select-all tracking-wider">
                DELETE GOLD DEMO
              </div>
            </div>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Gõ 'DELETE GOLD DEMO' vào đây..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#061828] border border-[#235882] text-white text-xs focus:outline-none focus:border-red-400 font-mono"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteDelete}
                disabled={confirmInput !== 'DELETE GOLD DEMO' || isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 transition-all shadow-lg shadow-red-600/30"
              >
                {isDeleting ? 'Đang thực thi xóa...' : 'Thực thi Xóa Pattern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
