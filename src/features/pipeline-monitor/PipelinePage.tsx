import { useState, useEffect } from 'react';
import { getPipelineStatus } from '../../api/client';
import type { PipelineServiceStatus, ProcessingJob } from '../../api/types';
import { RefreshCw, CheckCircle2, Database, Satellite } from 'lucide-react';

export default function PipelinePage() {
  const [services, setServices] = useState<PipelineServiceStatus[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = () => {
    setRefreshing(true);
    getPipelineStatus()
      .then((data) => {
        setServices(data.services);
        setJobs(data.jobs);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-400 border-t-transparent mb-3"></div>
        <div className="text-xs font-mono">Đang kiểm tra tín hiệu trạm khí tượng viễn thám...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 font-medium mb-1">
            <span>S10</span>
            <span className="text-slate-600">/</span>
            <span>Pipeline Monitor</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Pipeline &amp; Processing Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Theo dõi luồng xử lý tự động từ phao viễn thám NOAA, nạp raw vào Bronze, chuẩn hóa Silver và phân tích dự báo khí hậu Gold.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Làm mới trạng thái (GET)
        </button>
      </div>

      {/* PIPELINE DAG FLOW TILES */}
      <div className="p-5 rounded-lg bg-[#0f1520] border border-slate-800">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Satellite className="w-3.5 h-3.5 text-slate-400" />
          Sơ đồ luồng thu thập &amp; xử lý khí hậu (Pipeline DAG)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {services.map((s, idx) => (
            <div key={s.service_id} className="p-4 rounded bg-[#090d14] border border-slate-800/80">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-xs font-mono font-medium text-slate-200">
                  {idx + 1}. {s.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  <CheckCircle2 className="w-3 h-3" />
                  {s.status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs font-mono text-slate-400">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Lần chạy gần nhất:</span>
                  <span className="text-slate-200">{s.last_run_at.slice(11, 19)} UTC</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Thời gian thực thi:</span>
                  <span className="text-slate-300 tabular-nums">{s.duration_s}s</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Bản ghi xử lý:</span>
                  <strong className="text-slate-100 tabular-nums">+{s.affected_rows} rows</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT JOBS TABLE */}
      <div className="p-5 rounded-lg bg-[#0f1520] border border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            Lịch sử tác vụ thu thập &amp; tính toán (Jobs Log)
          </h2>
          <span className="text-[11px] font-mono text-slate-500">gold.processing_runs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-[#090d14] text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-medium">Mã Job</th>
                <th className="py-2.5 px-4 font-medium">Loại tác vụ</th>
                <th className="py-2.5 px-4 font-medium">Trạng thái</th>
                <th className="py-2.5 px-4 font-medium">Bắt đầu (UTC)</th>
                <th className="py-2.5 px-4 font-medium">Hoàn thành (UTC)</th>
                <th className="py-2.5 px-4 font-medium">Pattern cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {jobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 font-medium text-slate-200">{job.job_id}</td>
                  <td className="py-3 px-4 uppercase text-slate-300 font-medium">{job.job_type}</td>
                  <td className="py-3 px-4">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{job.started_at?.replace('T', ' ').slice(0, 19)}</td>
                  <td className="py-3 px-4 text-slate-400">{job.finished_at?.replace('T', ' ').slice(0, 19) || '—'}</td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {job.affected_patterns?.join(', ') || 'all'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
