import { useEffect, useState } from 'react';
import { getLatestWaveClassification, type WaveClassification } from '../../api/client';

const labels: Record<string, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };

export default function WaveClassificationPanel({ refreshKey }: { refreshKey: number }) {
  const [result, setResult] = useState<WaveClassification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getLatestWaveClassification(controller.signal).then(row => {
      if (!controller.signal.aborted) setResult(row);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [refreshKey]);

  if (error) return <p role="alert" className="rounded-xl border border-rose-800/50 bg-rose-950/20 p-4 text-sm text-rose-200">Không tải được kết quả phân loại. {error}</p>;
  if (loading) return <p role="status" className="text-sm text-slate-400">Đang tải kết quả phân loại…</p>;
  if (!result) return <p role="status" className="rounded-xl border border-slate-800 bg-[#0c121e] p-4 text-sm text-slate-300">Chưa có kết quả phân loại cấp sóng.</p>;

  const issuedHST = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Pacific/Honolulu',
  }).format(new Date(result.issued_at));
  const target = result.target_date_hst.split('-').reverse().join('/');
  return (
    <section className="max-w-2xl space-y-4 rounded-xl border border-slate-800 bg-[#0c121e] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">Phân loại cấp sóng</h2>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
          {result.model_status === 'draft' ? 'DRAFT · Thử nghiệm' : 'READY'}
        </span>
      </div>
      <p className="text-2xl font-semibold text-sky-300">{labels[result.predicted_label] ?? result.predicted_label}</p>
      <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <div><dt className="text-xs text-slate-400">Ngày mục tiêu (Hawaii)</dt><dd>{target}</dd></div>
        <div><dt className="text-xs text-slate-400">Thời điểm chạy (Hawaii)</dt><dd>{issuedHST}</dd></div>
        <div><dt className="text-xs text-slate-400">Mô hình</dt><dd>{result.algorithm} · #{result.model_id}</dd></div>
        <div><dt className="text-xs text-slate-400">Phiên bản</dt><dd>{result.model_version}</dd></div>
      </dl>
      {result.evidence_mode === 'retrospective' && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Kết quả chạy hồi cứu trên dữ liệu quan trắc thật. Chưa có kết quả dự báo cho ngày mai.</p>
      )}
    </section>
  );
}
