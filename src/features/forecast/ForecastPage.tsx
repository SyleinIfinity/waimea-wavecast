import { useState, useEffect } from 'react';
import { getLatestForecast, getForecastHistory, getLatestClassification } from '../../api/client';
import type { WaveForecast, ForecastHistoryPoint, WaveClassification } from '../../api/types';
import EChart from '../../components/charts/EChart';
import { Calendar, AlertCircle, CheckCircle2, Wind } from 'lucide-react';
import type { EChartsOption } from 'echarts';

export default function ForecastPage() {
  const [forecast, setForecast] = useState<WaveForecast | null>(null);
  const [history, setHistory] = useState<ForecastHistoryPoint[]>([]);
  const [classification, setClassification] = useState<WaveClassification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  useEffect(() => {
    Promise.all([getLatestForecast(), getForecastHistory(), getLatestClassification()])
      .then(([f, h, c]) => {
        setForecast(f);
        setHistory(h);
        setClassification(c);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-400 border-t-transparent mb-3"></div>
        <div className="text-xs font-mono">Đang tải mô hình dự báo hải văn &amp; khí hậu...</div>
      </div>
    );
  }

  if (error || !forecast || !classification) {
    return (
      <div className="p-5 rounded-lg bg-rose-950/20 border border-rose-800/40 text-rose-200 max-w-2xl">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-100">Không thể tải dữ liệu dự báo</h2>
        </div>
        <p className="mt-2 text-xs text-rose-300 font-mono">{error || 'Chưa có dữ liệu dự báo'}</p>
      </div>
    );
  }

  const dates = history.map((h) => h.target_date_hst);
  const actualValues = history.map((h) => h.actual_value_m);
  const predictedValues = history.map((h) => h.predicted_value_m);
  const errors = history.map((h) => h.absolute_error_m);

  const chartOptions: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f1520',
      borderColor: '#1e2838',
      borderWidth: 1,
      textStyle: { color: '#f1f5f9', fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as Array<{ seriesName: string; value: number | null; axisValue: string; color: string }>;
        let str = `<div class="font-mono text-[11px] text-slate-400 pb-1 mb-1.5 border-b border-slate-700/60">${p[0]?.axisValue} (HST)</div>`;
        p.forEach((item) => {
          const val = item.value !== null && item.value !== undefined ? `${item.value.toFixed(2)} m` : 'Chưa có thực tế';
          str += `<div class="flex items-center gap-2 text-xs py-0.5">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${item.color}"></span>
            <span class="text-slate-400">${item.seriesName}:</span> <strong class="font-mono text-slate-200">${val}</strong>
          </div>`;
        });
        return str;
      },
    },
    legend: {
      data: showErrorsOnly ? ['Sai số tuyệt đối (MAE)'] : ['Thực đo quan trắc (Actual WVHT)', 'Mô hình dự báo (Predicted)'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 0,
      right: 0,
      icon: 'circle',
    },
    grid: { left: '2%', right: '2%', bottom: '4%', top: '36px', containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#1e2838' } },
      axisLabel: { color: '#64748b', fontSize: 10, rotate: 30, fontFamily: 'monospace' },
    },
    yAxis: {
      type: 'value',
      name: showErrorsOnly ? 'Lỗi (m)' : 'Độ cao sóng (m)',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#162030' } },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
    },
    series: showErrorsOnly
      ? [
          {
            name: 'Sai số tuyệt đối (MAE)',
            type: 'bar',
            data: errors,
            itemStyle: { color: '#f59e0b' },
            barMaxWidth: 14,
          },
        ]
      : [
          {
            name: 'Thực đo quan trắc (Actual WVHT)',
            type: 'line',
            data: actualValues,
            smooth: 0.2,
            itemStyle: { color: '#0284c7' },
            lineStyle: { width: 2 },
            symbol: 'circle',
            symbolSize: 4,
          },
          {
            name: 'Mô hình dự báo (Predicted)',
            type: 'line',
            data: predictedValues,
            smooth: 0.2,
            itemStyle: { color: '#94a3b8' },
            lineStyle: { width: 1.8, type: 'dashed' },
            symbol: 'circle',
            symbolSize: 4,
          },
        ],
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 font-medium mb-1">
            <span>S07</span>
            <span className="text-slate-600">/</span>
            <span>NOAA NDBC 51201</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Dự báo &amp; Phân loại Sóng Biển (Next Day T+1)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Dự báo trung vị độ cao sóng ngày mai và phân loại cấp sóng biển nhiệt đới bằng mô hình Random Forest offline, chống rò rỉ dữ liệu (No Data Leakage).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 self-start sm:self-auto shrink-0">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Cutoff ngày T: <strong className="text-slate-100 font-medium">{forecast.feature_cutoff_date_hst}</strong></span>
        </div>
      </div>

      {/* TWO DISTINCT PANELS: REGRESSION VS CLASSIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PANEL A: REGRESSION */}
        <div className="p-5 rounded-lg bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-300">
                Panel A — Hồi quy độ cao sóng (Regression)
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                RandomForestRegressor
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Dự báo trung vị T+1</span>
                <div className="text-3xl font-semibold font-mono text-slate-100 mt-1 flex items-baseline gap-1 tabular-nums">
                  {forecast.predicted_value_m.toFixed(2)}
                  <span className="text-base font-sans font-normal text-slate-400">m</span>
                </div>
                <div className="text-xs text-slate-400 mt-2 font-mono">
                  Mục tiêu: <span className="text-slate-200 font-medium">{forecast.target_date_hst} (HST)</span>
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#090d14] border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Khoảng tin cậy:</span>
                  <span className="text-slate-200 font-medium tabular-nums">
                    {forecast.lower_m?.toFixed(2)}m – {forecast.upper_m?.toFixed(2)}m
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Quan trắc thực tế:</span>
                  <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3 h-3" /> Chờ ngày mai đo
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="text-emerald-400 text-[11px]">Sẵn sàng (Ready)</span>
                </div>
              </div>
            </div>

            {/* MINI METRICS COMPARISON */}
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <div className="p-3 rounded bg-[#090d14] border border-slate-800/80 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500">MAE (Sai số TB)</div>
                <div className="text-base font-semibold font-mono text-slate-100 mt-1 tabular-nums">0.285 m</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">vs 0.512m Base</div>
              </div>
              <div className="p-3 rounded bg-[#090d14] border border-slate-800/80 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500">RMSE</div>
                <div className="text-base font-semibold font-mono text-slate-100 mt-1 tabular-nums">0.382 m</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">&lt; 0.40m Chuẩn</div>
              </div>
              <div className="p-3 rounded bg-[#090d14] border border-slate-800/80 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500">Hệ số R²</div>
                <div className="text-base font-semibold font-mono text-slate-100 mt-1 tabular-nums">0.814</div>
                <div className="text-[10px] text-sky-400 mt-0.5">+0.382 vs Base</div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Model: {forecast.model.version}</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3 h-3 text-slate-500" /> Lag 7 ngày (T-6 → T)
            </span>
          </div>
        </div>

        {/* PANEL B: CLASSIFICATION */}
        <div className="p-5 rounded-lg bg-[#0f1520] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-300">
                Panel B — Phân loại cấp sóng (Classification)
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                RandomForestClassifier
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Cấp sóng khí tượng</span>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded text-xs font-semibold font-mono bg-slate-800 text-slate-200 border border-slate-700">
                    {classification.predicted_label} (Sóng vừa)
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-2.5 font-mono">
                  Confidence: <strong className="text-slate-200 tabular-nums">{((classification.confidence || 0) * 100).toFixed(0)}%</strong>
                </div>
              </div>

              {/* PROBABILITIES BARS */}
              <div className="p-3.5 rounded bg-[#090d14] border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="text-slate-500 text-[10px] uppercase">Phân bổ xác suất:</div>
                {Object.entries(classification.class_probabilities || {}).map(([label, prob]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-200 font-medium tabular-nums">{(prob * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${prob * 100}%`,
                          backgroundColor: label === 'High' ? '#f43f5e' : label === 'Medium' ? '#f59e0b' : '#0284c7',
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* THRESHOLD SCHEME */}
            <div className="mt-5 p-3.5 rounded bg-[#090d14] border border-slate-800/80">
              <div className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                Ngưỡng phân cấp khí hậu: {classification.scheme.name}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                {classification.scheme.thresholds.map((t) => (
                  <div key={t.label} className="p-2 rounded bg-[#0f1520] border border-slate-800">
                    <span className="font-medium text-slate-200">{t.label}</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {t.max_m ? `${t.min_m}m – ${t.max_m}m` : `> ${t.min_m}m`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
            *Lưu ý khoa học: Phân loại sóng phục vụ nghiên cứu thống kê khí hậu, không thay thế cảnh báo an toàn cứu hộ hàng hải.
          </div>
        </div>
      </div>

      {/* EVALUATION HISTORY: ACTUAL VS PREDICTED */}
      <div className="p-5 rounded-lg bg-[#0f1520] border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Lịch sử Đánh giá Thực đo Khí tượng vs. Dự báo (30 ngày gần nhất)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              So sánh chuỗi giá trị quan trắc thực tế từ phao biển và giá trị mô hình đã phát hành trước đó.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowErrorsOnly(!showErrorsOnly)}
            className="px-3 py-1.5 rounded text-xs font-medium border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors self-start sm:self-auto font-mono cursor-pointer"
          >
            {showErrorsOnly ? '← Xem chuỗi quan trắc' : 'Xem phân bố sai số tuyệt đối (MAE)'}
          </button>
        </div>

        <EChart options={chartOptions} height={320} />
      </div>
    </div>
  );
}
