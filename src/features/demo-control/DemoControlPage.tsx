import { useState, useEffect } from 'react';
import {
  getDemoPreflight,
  previewDeletePatterns,
  deleteGoldPatterns,
  rebuildGoldPatterns,
  pollJobStatus,
  getPipelineStatus,
  previewObservationReset,
  resetObservations,
} from '../../api/client';
import type { ObservationResetPreview } from '../../api/client';
import type {
  DemoPreflight,
  PreviewDeleteResponse,
  ProcessingJob,
  PipelineServiceStatus,
} from '../../api/types';
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Lock,
  Check,
  ShieldCheck,
  Compass,
  Wind,
  CheckCircle2,
  Database,
  Satellite,
  Info,
  Clock,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function DemoControlPage() {
  const legacyDemoAvailable = import.meta.env.VITE_ENABLE_LEGACY_DEMO_ADMIN === 'true';
  const [preflight, setPreflight] = useState<DemoPreflight | null>(null);
  const [pipelineServices, setPipelineServices] = useState<PipelineServiceStatus[]>([]);
  const [pipelineJobs, setPipelineJobs] = useState<ProcessingJob[]>([]);
  const [error, setError] = useState<string | null>(null);
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
  const [loadingPreflight, setLoadingPreflight] = useState(legacyDemoAvailable);
  const [adminToken, setAdminToken] = useState('');
  const [resetPreview, setResetPreview] = useState<ObservationResetPreview | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetPreview = async () => {
    setError(null);
    setResetMessage(null);
    setResetPreview(null);
    setResetBusy(true);
    try {
      setResetPreview(await previewObservationReset(adminToken));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message.includes('HTTP 401') ? 'Mã quản trị Backend không hợp lệ. Hãy dùng token production mới, rồi bấm xem trước lại.' : message);
    } finally {
      setResetBusy(false);
    }
  };

  const handleObservationReset = async () => {
    if (!resetPreview || resetConfirmation !== (resetPreview.environment === 'production' ? 'RESET PRODUCTION OBSERVATIONS' : 'RESET LOCAL OBSERVATIONS') || (resetPreview.environment === 'production' && !resetPassword)) return;
    setError(null);
    setResetBusy(true);
    try {
      const result = await resetObservations(adminToken, resetPreview.dry_run_id, resetPreview.environment, resetPassword);
      setResetMessage(`Đã xóa ${result.row_count.toLocaleString()} bản ghi trên DB ${resetPreview.environment}.`);
      setResetPreview(null);
      setResetConfirmation('');
      if (legacyDemoAvailable) refreshAllStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setResetPreview(null);
    } finally {
      setResetPassword('');
      setResetBusy(false);
    }
  };

  // Load preflight and pipeline status
  const refreshAllStatus = () => {
    setLoadingPreflight(true);
    setError(null);

    Promise.allSettled([
      getDemoPreflight(),
      getPipelineStatus(),
    ]).then(([pfResult, pipeResult]) => {
      if (pfResult.status === 'fulfilled') {
        const pf = pfResult.value;
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
      } else {
        setError((prev) => prev || (pfResult.reason instanceof Error ? pfResult.reason.message : String(pfResult.reason)));
      }

      if (pipeResult.status === 'fulfilled') {
        setPipelineServices(pipeResult.value.services);
        setPipelineJobs(pipeResult.value.jobs);
      }
      setLoadingPreflight(false);
    });
  };

  useEffect(() => {
    if (legacyDemoAvailable) refreshAllStatus();
  }, []);

  // Polling job tái tạo kết quả
  useEffect(() => {
    if (!activeJob || activeJob.status !== 'running') return;
    const interval = setInterval(async () => {
      const updated = await pollJobStatus(activeJob.job_id).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
        setIsRebuilding(false);
        return null;
      });
      if (!updated) return;
      setActiveJob(updated);
      if (updated.status === 'success') {
        setIsRebuilding(false);
        setDeletedSuccess(false);
        // Refresh counts after completion
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
        }).catch(() => {});
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [activeJob]);

  const togglePattern = (pattern: string) => {
    setSelectedPatterns((prev) =>
      prev.includes(pattern) ? prev.filter((p) => p !== pattern) : [...prev, pattern]
    );
  };

  // NÚT 1: KIỂM TRA TRƯỚC KHI XÓA (DRY RUN / PREFLIGHT)
  const handlePreview = async () => {
    if (!preflight) {
      setError('Chưa có thông tin Preflight từ Backend.');
      return;
    }
    setError(null);
    try {
      const res = await previewDeletePatterns({
        station_id: '51201',
        from_hst: '2026-01-01',
        to_hst: '2026-11-08',
        pattern_types: selectedPatterns as any,
      });
      setPreviewData(res);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  // NÚT 2: XÓA DỮ LIỆU TRONG DB DIỄN TẬP
  const handleExecuteDelete = async () => {
    if (confirmInput !== 'DELETE GOLD DEMO' || !previewData?.dry_run_id || !preflight?.allow_delete) return;
    setIsDeleting(true);
    try {
      await deleteGoldPatterns(previewData.dry_run_id);
      setShowConfirmModal(false);
      setConfirmInput('');
      setDeletedSuccess(true);
      setPreviewData(null);
      setCounts(null);
      // Refresh status
      const pf = await getDemoPreflight();
      setPreflight(pf);
      setCounts({
        goldRows:
          pf.counts.gold_metrics_rows +
          pf.counts.gold_trend_seasonal_rows +
          pf.counts.gold_correlations_rows +
          pf.counts.gold_clustering_rows +
          pf.counts.gold_predictions_rows +
          pf.counts.gold_classifications_rows,
        bronzeRows: pf.counts.bronze_rows,
        silverRows: pf.counts.silver_rows,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setIsDeleting(false);
    }
  };

  // NÚT 3: CHẠY LẠI VÀ LẤY DỮ LIỆU TỚI REALTIME (REBUILD)
  const handleRebuild = async () => {
    setIsRebuilding(true);
    setError(null);
    try {
      const res = await rebuildGoldPatterns(selectedPatterns);
      const initial = await pollJobStatus(res.job_id);
      setActiveJob(initial);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setIsRebuilding(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Khu vực quản trị hệ thống · Quyền Admin</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            {legacyDemoAvailable ? 'Điều khiển diễn tập & Giám sát xử lý Pipeline' : 'Quản lý dữ liệu quan trắc'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {legacyDemoAvailable ? <>Môi trường kiểm định phục vụ nghiệm thu: Thực nghiệm mô phỏng tình huống xóa mất mát kết quả phân tích tầng Gold và kích hoạt pipeline tái tạo từ Bronze/Silver mà <strong className="text-slate-200">không cần huấn luyện lại mô hình</strong>.</> : 'Xem trước và xác nhận thao tác xóa dữ liệu quan trắc bằng quyền quản trị Backend.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs font-mono text-amber-300">
            <Lock className="w-3.5 h-3.5" />
            <span>Môi trường: <strong className="text-white uppercase font-bold">{resetPreview?.environment ?? preflight?.environment ?? 'CHƯA XÁC ĐỊNH'}</strong></span>
          </div>
          {legacyDemoAvailable && <button
            type="button"
            onClick={refreshAllStatus}
            disabled={loadingPreflight}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw size={14} className={loadingPreflight ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>}
        </div>
      </div>

      {/* GUARDRAILS NOTICE BANNER */}
      <div className="rounded-xl border border-sky-500/30 bg-[#092235] p-4 text-xs leading-relaxed text-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white font-semibold">Cơ chế bảo vệ an toàn (Admin Guardrails):</strong>
          <p className="mt-1 text-slate-300">
            Nút xóa quan trắc yêu cầu mã quản trị Backend, xem trước và xác nhận bằng mật khẩu riêng trên production. Model và metadata nguồn được bảo tồn.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-4 text-xs text-rose-200">
          Thông báo lỗi Admin: {error}
        </div>
      )}

      <section className="rounded-xl border border-rose-800/50 bg-[#0f1520] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-rose-300 flex items-center gap-2"><Trash2 size={16} /> Xóa dữ liệu quan trắc</h2>
        <p className="text-xs text-slate-300">Xóa bản ghi Bronze, Silver và Gold phát sinh từ quan trắc trên môi trường được API xác nhận. Model và metadata nguồn được giữ lại. Production chỉ cho phép khi quản trị viên đã bật quyền xóa và xác nhận backup ở Backend.</p>
        <label className="block text-xs text-slate-300" htmlFor="admin-api-token">Mã quản trị Backend</label>
        <input id="admin-api-token" type="password" autoComplete="off" value={adminToken}
          onChange={(event) => { setAdminToken(event.target.value); setResetPreview(null); setResetPassword(''); }}
          placeholder="Nhập mã quản trị để xác thực với Backend"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-[#090d14] px-3 py-2 text-sm text-white" />
        <p className="text-[11px] text-slate-400">Token chỉ nằm trong bộ nhớ trang này; không lưu trong localStorage hoặc bản build frontend.</p>
        <button type="button" onClick={handleResetPreview} disabled={resetBusy || !adminToken.trim()}
          className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Xem trước dữ liệu sẽ xóa</button>
        {resetPreview && <div className="rounded-lg border border-amber-700/50 p-3 space-y-2 text-xs">
          <p className="text-amber-300">Môi trường: <strong>{resetPreview.environment.toUpperCase()}</strong>. Sẽ xóa {resetPreview.row_count.toLocaleString()} bản ghi ở {Object.keys(resetPreview.affected_tables).length} bảng. Xác nhận có hiệu lực {resetPreview.expires_in_seconds} giây.</p>
          <p className="text-slate-300">Nhập <code>{resetPreview.environment === 'production' ? 'RESET PRODUCTION OBSERVATIONS' : 'RESET LOCAL OBSERVATIONS'}</code> để xác nhận:</p>
          <input type="text" value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-700 bg-[#090d14] px-3 py-2 text-white" />
          {resetPreview.environment === 'production' && <>
            <label htmlFor="reset-password" className="block text-slate-300">Mật khẩu xác nhận xóa production</label>
            <input id="reset-password" type="password" autoComplete="off" value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-700 bg-[#090d14] px-3 py-2 text-white" />
          </>}
        </div>}
        <button type="button" onClick={handleObservationReset}
          disabled={resetBusy || !resetPreview || resetConfirmation !== (resetPreview.environment === 'production' ? 'RESET PRODUCTION OBSERVATIONS' : 'RESET LOCAL OBSERVATIONS') || (resetPreview.environment === 'production' && !resetPassword)}
          className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
          Xóa dữ liệu quan trắc{resetPreview ? ` trên ${resetPreview.environment}` : ''}
        </button>
        {!resetPreview && <p className="text-[11px] text-slate-400">Nút xóa được mở sau khi mã quản trị hợp lệ và bước xem trước thành công.</p>}
        {resetMessage && <p role="status" className="text-xs text-emerald-300">{resetMessage}</p>}
      </section>

      {legacyDemoAvailable && <>
      {/* METRIC COUNTERS (BRONZE / SILVER / GOLD) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BRONZE */}
        <div className="p-5 rounded-xl bg-[#0f1520] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Compass className="w-4 h-4 text-cyan-400" />
              Lớp Bronze (Dữ liệu thô NOAA)
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded font-mono font-medium">
              BẢO TỒN (PRESERVED)
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3 tabular-nums">
            {counts?.bronzeRows.toLocaleString() ?? '—'}
            <span className="text-xs text-slate-400 font-normal ml-1.5">bản ghi</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Dữ liệu gốc bất biến lưu trữ cùng file nguồn NOAA
          </div>
        </div>

        {/* SILVER */}
        <div className="p-5 rounded-xl bg-[#0f1520] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Wind className="w-4 h-4 text-cyan-400" />
              Lớp Silver (Chuẩn hóa &amp; QC)
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded font-mono font-medium">
              BẢO TỒN (PRESERVED)
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3 tabular-nums">
            {counts?.silverRows.toLocaleString() ?? '—'}
            <span className="text-xs text-slate-400 font-normal ml-1.5">bản ghi</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Quan trắc chuẩn hóa đơn vị metric và gắn cờ QC
          </div>
        </div>

        {/* GOLD */}
        <div
          className={`p-5 rounded-xl border transition-colors ${
            counts?.goldRows === 0
              ? 'bg-rose-950/20 border-rose-800/60'
              : 'bg-[#0f1520] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-medium">Lớp Gold (Bảng kết quả phân tích)</span>
            {counts?.goldRows === 0 ? (
              <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                ĐÃ XÓA (RỖNG)
              </span>
            ) : (
              <span className="text-[10px] text-sky-400 bg-sky-950/50 border border-sky-800/50 px-2 py-0.5 rounded font-mono font-medium">
                CÓ DỮ LIỆU
              </span>
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono mt-3 tabular-nums ${
              counts?.goldRows === 0 ? 'text-rose-400' : 'text-white'
            }`}
          >
            {counts?.goldRows.toLocaleString() ?? '—'}
            <span className="text-xs text-slate-400 font-normal ml-1.5">hàng kết quả</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {counts?.goldRows === 0
              ? 'Dữ liệu Gold đã bị xóa. Website sẽ không thể hiển thị kết quả phân tích cho đến khi được Tái tạo (Rebuild).'
              : 'Tổng số dòng trong 6 bảng Gold do Backend báo cáo.'}
          </div>
        </div>
      </div>

      {/* THREE STEP ACTION BUTTONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* PANEL 1: CÁC BẢNG ĐƯỢC BẢO VỆ */}
        <div className="p-5 rounded-xl bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300 text-xs font-mono font-bold">
                1
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Bảo vệ Schema &amp; Đối tượng bất biến
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 mb-3 leading-relaxed">
              Các đối tượng sau luôn được bảo vệ an toàn, không có thao tác <code>DROP SCHEMA</code> hay xóa vật lý trên cơ sở dữ liệu:
            </p>

            <div className="space-y-1.5">
              {[
                { name: 'bronze.raw_observations', desc: 'Dữ liệu thô gốc bất biến từ NOAA', tag: 'BRONZE' },
                { name: 'silver.wave_observations', desc: 'Quan trắc sóng chuẩn hóa UTC', tag: 'SILVER' },
                { name: 'silver.daily_features', desc: 'Đặc trưng ngày theo múi giờ HST', tag: 'SILVER' },
                { name: 'gold.model_registry', desc: 'Danh mục phiên bản mô hình', tag: 'METADATA' },
                { name: 'gs://waimea-noaa/models', desc: 'Mô hình nhị phân .joblib trên GCS', tag: 'STORAGE' },
              ].map((item) => (
                <div
                  key={item.name}
                  className="p-2 rounded-lg bg-[#090d14] border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-mono text-xs text-slate-200 truncate font-medium">{item.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</div>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded shrink-0">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-normal">
            Bảo đảm khôi phục 100% dữ liệu phân tích mà không mất thông tin quan trắc lịch sử.
          </div>
        </div>

        {/* PANEL 2: NÚT 1 & NÚT 2 - KIỂM TRA TRƯỚC KHI XÓA & THỰC THI XÓA */}
        <div className="p-5 rounded-xl bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300 text-xs font-mono font-bold">
                2
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Chọn Bảng Pattern &amp; Xóa Diễn tập
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 mb-3 leading-relaxed">
              Chọn các bảng kết quả phân tích trong Gold để diễn tập xóa dữ liệu:
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
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-[#111e2f] border-cyan-800/80 text-white'
                        : 'bg-[#090d14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePattern(p.id)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 bg-[#090d14] w-3.5 h-3.5 cursor-pointer"
                      />
                      <div>
                        <div className="text-xs font-medium">{p.label}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.table}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {previewData && (
              <div className="mt-3 p-3 rounded-lg bg-amber-950/20 border border-amber-800/50 text-xs text-amber-200">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Xem trước: Sẽ xóa {previewData.row_count.toLocaleString()} dòng kết quả
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-mono">
                  Mã ticket xác nhận: <code className="text-cyan-300">{previewData.dry_run_id}</code>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
            {/* NÚT 1: KIỂM TRA TRƯỚC KHI XÓA */}
            <button
              type="button"
              onClick={handlePreview}
              disabled={!preflight || loadingPreflight}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              1. Kiểm tra trước khi xóa (Dry Run / Preflight)
            </button>

            {/* NÚT 2: XÓA DỮ LIỆU */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={!previewData || !preflight?.allow_delete}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              2. Xóa dữ liệu trong DB diễn tập (Staging)
            </button>
          </div>
        </div>

        {/* PANEL 3: NÚT 3 - TÁI TẠO KẾT QUẢ TỚI REALTIME (REBUILD) */}
        <div className="p-5 rounded-xl bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300 text-xs font-mono font-bold">
                3
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Chạy Lại &amp; Tái Tạo Tới Realtime
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 mb-3 leading-relaxed">
              Kích hoạt pipeline nạp lại dữ liệu từ <code>silver</code>, tải mô hình từ GCS và chạy suy luận dự báo:
            </p>

            {deletedSuccess && !activeJob && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200 mb-3">
                Dữ liệu Gold đã bị xóa rỗng. Hãy nhấn nút bên dưới để khôi phục toàn bộ bảng phân tích.
              </div>
            )}

            {activeJob ? (
              <div className="p-3.5 rounded-lg bg-[#090d14] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Mã Job:</span>
                  <span className="text-cyan-300 font-bold">{activeJob.job_id}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Trạng thái:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      activeJob.status === 'success'
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                        : 'bg-sky-950/50 text-sky-300 border border-sky-800/60 animate-pulse'
                    }`}
                  >
                    {activeJob.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Tiến trình xử lý:</span>
                    <span>
                      {activeJob.progress_completed ?? 0} / {activeJob.progress_total ?? 4} modules
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (((activeJob.progress_completed || 1) / (activeJob.progress_total || 4)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {activeJob.status === 'success' && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Đã tái tạo thành công {activeJob.inserted_rows?.toLocaleString()} hàng! Dữ liệu web đã sẵn sàng.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
                Chưa có tác vụ tái tạo nào đang thực thi.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            {/* NÚT 3: CHẠY LẠI VÀ LẤY DỮ LIỆU TỚI REALTIME */}
            <button
              type="button"
              onClick={handleRebuild}
              disabled={isRebuilding || !preflight}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
              {isRebuilding ? 'Đang thực thi Job Rebuild...' : '3. Chạy lại và lấy dữ liệu tới realtime (Rebuild)'}
            </button>
          </div>
        </div>
      </div>

      {/* PIPELINE & SERVICES STATUS MONITOR (S10 INTEGRATION) */}
      <div className="space-y-5 pt-3">
        {/* PIPELINE DAG FLOW TILES */}
        <div className="p-5 rounded-xl bg-[#0f1520] border border-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-cyan-400" />
            Sơ đồ dịch vụ xử lý luồng dữ liệu (Pipeline DAG Services)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pipelineServices.length ? (
              pipelineServices.map((s, idx) => (
                <div key={s.service_id} className="p-4 rounded-lg bg-[#090d14] border border-slate-800/80">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {idx + 1}. {s.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      {s.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs font-mono text-slate-400">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Lần chạy gần nhất:</span>
                      <span className="text-slate-200">{s.last_run_at?.slice(11, 19)} UTC</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Thời gian thực thi:</span>
                      <span className="text-slate-200 tabular-nums">{s.duration_s}s</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Bản ghi xử lý:</span>
                      <strong className="text-white tabular-nums">+{s.affected_rows} rows</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                Đang chờ tải trạng thái các dịch vụ Pipeline từ Backend...
              </div>
            )}
          </div>
        </div>

        {/* RECENT JOBS TABLE */}
        <div className="p-5 rounded-xl bg-[#0f1520] border border-slate-800">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Lịch sử các tác vụ thu thập &amp; tính toán (Processing Jobs Log)
            </h2>
            <span className="text-xs font-mono text-slate-400">Bảng: gold.processing_runs</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-[#090d14] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Mã Job</th>
                  <th className="py-2.5 px-4 font-semibold">Loại tác vụ</th>
                  <th className="py-2.5 px-4 font-semibold">Trạng thái</th>
                  <th className="py-2.5 px-4 font-semibold">Bắt đầu (UTC)</th>
                  <th className="py-2.5 px-4 font-semibold">Hoàn thành (UTC)</th>
                  <th className="py-2.5 px-4 font-semibold">Pattern cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {pipelineJobs.length ? (
                  pipelineJobs.map((job) => (
                    <tr key={job.job_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-white">{job.job_id}</td>
                      <td className="py-3 px-4 uppercase text-slate-300">{job.job_type}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{job.started_at?.replace('T', ' ').slice(0, 19)}</td>
                      <td className="py-3 px-4 text-slate-400">{job.finished_at?.replace('T', ' ').slice(0, 19) || '—'}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {job.affected_patterns?.join(', ') || 'all'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Chưa có nhật ký tác vụ nào được ghi nhận.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CONFIRMATION 2-STEP MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1520] border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Xác nhận Xóa Gold Demo (Xác nhận 2 bước)</h3>
                <div className="text-[11px] text-slate-400 font-mono">Bảo tồn tuyệt đối Bronze &amp; Silver</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Thao tác này sẽ xóa <strong className="text-rose-400 font-mono font-bold">{previewData?.row_count.toLocaleString()}</strong> hàng kết quả trong schema <code>gold</code> của cơ sở dữ liệu diễn tập (Staging). Dữ liệu <code>bronze</code> và <code>silver</code> được giữ nguyên 100%.
            </p>

            <div className="p-3 rounded-lg bg-[#090d14] border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Vui lòng nhập chính xác dòng chữ sau để mở khóa:</span>
              <div className="font-mono font-bold text-cyan-300 mt-1 select-all tracking-wider text-xs">
                DELETE GOLD DEMO
              </div>
            </div>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Nhập 'DELETE GOLD DEMO'"
              className="w-full px-3 py-2.5 rounded-lg bg-[#090d14] border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmInput('');
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={confirmInput !== 'DELETE GOLD DEMO' || isDeleting || !preflight?.allow_delete || !previewData?.dry_run_id}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition cursor-pointer shadow-sm"
              >
                {isDeleting ? 'Đang thực thi xóa...' : 'Thực thi Xóa Dữ liệu Demo'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
