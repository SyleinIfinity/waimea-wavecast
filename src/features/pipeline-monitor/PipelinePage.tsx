import { useState, useEffect } from 'react';
import { getPipelineStatus } from '../../api/client';
import type { PipelineServiceStatus, ProcessingJob } from '../../api/types';
import { Activity, Server, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Play, Database } from 'lucide-react';

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
      <div className="p-8 text-center text-cyan-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
        <p>Đang kiểm tra nhịp tim (heartbeat) của các dịch vụ trong hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-400 uppercase">
              <Activity className="w-4 h-4" />
              S10 · Giám sát Kiến trúc Hạ tầng (System Monitor)
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">Pipeline & Processing Monitor</h1>
            <p className="text-sm text-[#adc7d9] mt-1">
              Theo dõi luồng xử lý tự động từ thu thập trạm NOAA, lưu trữ Bronze/Silver/Gold đến suy luận Machine Learning.
            </p>
          </div>

          <button
            onClick={fetchStatus}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-gray-950 hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới trạng thái (GET)
          </button>
        </div>
      </div>

      {/* PIPELINE DAG FLOW TILES */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Sơ đồ luồng dịch vụ xử lý (Pipeline DAG)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, idx) => (
            <div key={s.service_id} className="bg-[#0b2438] border border-[#244b63] rounded-lg p-4 relative">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c3f56]">
                <span className="text-xs font-bold text-gray-300">
                  {idx + 1}. {s.name}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  {s.status}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">Lần chạy gần nhất:</span>
                  <span className="font-mono text-cyan-300">{s.last_run_at.slice(11, 19)} UTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Thời gian thực thi:</span>
                  <span>{s.duration_s} giây</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bản ghi xử lý:</span>
                  <strong className="text-white">+{s.affected_rows} rows</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT JOBS TABLE */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Lịch sử tác vụ (Processing Jobs Log)
          </h2>
          <span className="text-xs text-gray-400">Lưu vết trong gold.processing_runs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0b2438] text-gray-300 uppercase font-semibold border-b border-[#244b63]">
              <tr>
                <th className="py-3 px-4">Mã Job</th>
                <th className="py-3 px-4">Loại tác vụ</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Bắt đầu (UTC)</th>
                <th className="py-3 px-4">Hoàn thành (UTC)</th>
                <th className="py-3 px-4">Pattern cập nhật</th>
                <th className="py-3 px-4">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#244b63] text-gray-200">
              {jobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-[#153e5e]/40">
                  <td className="py-3 px-4 font-mono text-cyan-300 font-bold">{job.job_id}</td>
                  <td className="py-3 px-4 uppercase font-semibold text-white">{job.job_type}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-400">{job.started_at?.replace('T', ' ').slice(0, 19)}</td>
                  <td className="py-3 px-4 font-mono text-gray-400">{job.finished_at?.replace('T', ' ').slice(0, 19) || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] text-gray-300">
                      {job.affected_patterns?.join(', ') || 'all'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => alert(`Job ${job.job_id} đang ở trạng thái ${job.status}`)}
                      className="text-cyan-400 hover:text-cyan-200 font-medium"
                    >
                      Chi tiết
                    </button>
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
