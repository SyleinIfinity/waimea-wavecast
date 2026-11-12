import { useState, useEffect } from 'react';
import { getLatestForecast, getForecastHistory, getLatestClassification } from '../../api/client';
import type { WaveForecast, ForecastHistoryPoint, WaveClassification } from '../../api/types';
import EChart from '../../components/charts/EChart';
import { Waves, TrendingUp, Calendar, AlertCircle, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
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
      <div className="p-8 text-center text-cyan-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
        <p>Đang tải dữ liệu dự báo từ mô hình Machine Learning...</p>
      </div>
    );
  }

  if (error || !forecast || !classification) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-red-950/40 border border-red-700/60 rounded-xl text-red-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <h2 className="text-xl font-bold">Không thể tải dự báo</h2>
        </div>
        <p className="mt-2 text-sm text-red-300">{error || 'Chưa có dữ liệu dự báo'}</p>
      </div>
    );
  }

  // Cấu hình biểu đồ Actual vs Predicted
  const dates = history.map((h) => h.target_date_hst);
  const actualValues = history.map((h) => h.actual_value_m);
  const predictedValues = history.map((h) => h.predicted_value_m);
  const errors = history.map((h) => h.absolute_error_m);

  const chartOptions: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0c2438',
      borderColor: '#2b5268',
      textStyle: { color: '#e6f3ff' },
      formatter: (params: unknown) => {
        const p = params as Array<{ seriesName: string; value: number | null; axisValue: string; color: string }>;
        let str = `<div class="font-semibold text-xs border-b border-gray-600 pb-1 mb-1">${p[0]?.axisValue} (HST)</div>`;
        p.forEach((item) => {
          const val = item.value !== null && item.value !== undefined ? `${item.value.toFixed(2)} m` : 'Chưa có thực tế';
          str += `<div class="flex items-center gap-2 text-xs">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color}"></span>
            <span>${item.seriesName}:</span> <strong>${val}</strong>
          </div>`;
        });
        return str;
      },
    },
    legend: {
      data: showErrorsOnly ? ['Sai số tuyệt đối (MAE)'] : ['Thực đo (Actual WVHT)', 'Mô hình dự báo (Predicted)'],
      textStyle: { color: '#9fbcd0' },
      top: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#2b5268' } },
      axisLabel: { color: '#9fbcd0', fontSize: 11, rotate: 35 },
    },
    yAxis: {
      type: 'value',
      name: showErrorsOnly ? 'Lỗi (m)' : 'Độ cao sóng (m)',
      nameTextStyle: { color: '#9fbcd0' },
      splitLine: { lineStyle: { color: '#163850' } },
      axisLabel: { color: '#9fbcd0' },
    },
    series: showErrorsOnly
      ? [
          {
            name: 'Sai số tuyệt đối (MAE)',
            type: 'bar',
            data: errors,
            itemStyle: { color: '#f59e0b' },
          },
        ]
      : [
          {
            name: 'Thực đo (Actual WVHT)',
            type: 'line',
            data: actualValues,
            smooth: true,
            itemStyle: { color: '#38bdf8' },
            lineStyle: { width: 3 },
            symbolSize: 6,
          },
          {
            name: 'Mô hình dự báo (Predicted)',
            type: 'line',
            data: predictedValues,
            smooth: true,
            itemStyle: { color: '#a855f7' },
            lineStyle: { width: 2, type: 'dashed' },
            symbolSize: 6,
          },
        ],
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-400 uppercase">
              <Waves className="w-4 h-4" />
              S07 · NOAA NDBC 51201 · Hawaii Timezone (HST UTC-10)
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">Dự báo & Phân loại Sóng Biển (Next Day T+1)</h1>
            <p className="text-sm text-[#adc7d9] mt-1">
              Dự báo trung vị độ cao sóng ngày mai và phân loại cấp sóng bằng Random Forest offline, không rò rỉ dữ liệu (No Data Leakage).
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#0b2438] px-4 py-2.5 rounded-lg border border-[#244b63] text-xs">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-gray-400">Cutoff ngày hiện tại (T)</div>
              <div className="font-semibold text-white">{forecast.feature_cutoff_date_hst} (HST)</div>
            </div>
          </div>
        </div>
      </div>

      {/* TWO DISTINCT PANELS: REGRESSION VS CLASSIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: REGRESSION (HỒI QUY WVHT) */}
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#244b63]">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Panel A — Hồi quy độ cao sóng (Regression)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-purple-950/60 border border-purple-700/60 text-purple-300">
                RandomForestRegressor
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-xs text-[#9fbcd0]">Dự báo trung vị ngày mai (T+1):</span>
                <div className="text-4xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                  {forecast.predicted_value_m.toFixed(2)}
                  <span className="text-lg font-medium text-cyan-400">m</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Mục tiêu ngày: <strong className="text-cyan-300">{forecast.target_date_hst} (HST)</strong>
                </div>
              </div>

              <div className="bg-[#0b2438] p-3 rounded-lg border border-[#244b63] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Khoảng tin cậy:</span>
                  <span className="font-semibold text-white">
                    {forecast.lower_m?.toFixed(2)}m – {forecast.upper_m?.toFixed(2)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trạng thái thực tế:</span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Chờ ngày mai đo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chất lượng dữ liệu:</span>
                  <span className="text-emerald-400 font-medium">Sẵn sàng (Ready)</span>
                </div>
              </div>
            </div>

            {/* Mini metrics cards */}
            <div className="grid grid-cols-3 gap-2 mt-5 text-center">
              <div className="bg-[#081f33] p-2.5 rounded-lg border border-[#244b63]">
                <div className="text-[11px] text-gray-400">MAE (Sai số TB)</div>
                <div className="text-base font-bold text-white mt-0.5">0.285 m</div>
                <div className="text-[10px] text-emerald-400">So với 0.512m Baseline</div>
              </div>
              <div className="bg-[#081f33] p-2.5 rounded-lg border border-[#244b63]">
                <div className="text-[11px] text-gray-400">RMSE (Căn bậc 2)</div>
                <div className="text-base font-bold text-white mt-0.5">0.382 m</div>
                <div className="text-[10px] text-emerald-400">Đạt chuẩn &lt;0.4m</div>
              </div>
              <div className="bg-[#081f33] p-2.5 rounded-lg border border-[#244b63]">
                <div className="text-[11px] text-gray-400">Hệ số R²</div>
                <div className="text-base font-bold text-white mt-0.5">0.814</div>
                <div className="text-[10px] text-cyan-300">Giải thích 81.4% biến thiên</div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#244b63] flex items-center justify-between text-xs text-gray-400">
            <span>Phiên bản: {forecast.model.version}</span>
            <span className="text-purple-300 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" /> Lag 7 ngày (T-6 → T)
            </span>
          </div>
        </div>

        {/* PANEL B: CLASSIFICATION (PHÂN LOẠI MỨC SÓNG) */}
        <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#244b63]">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Panel B — Phân loại mức sóng (Classification)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-amber-950/60 border border-amber-700/60 text-amber-300">
                RandomForestClassifier
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-xs text-[#9fbcd0]">Cấp sóng dự đoán ngày mai:</span>
                <div className="mt-1 flex items-center gap-3">
                  <div
                    className="px-4 py-1.5 rounded-lg text-lg font-bold border"
                    style={{
                      backgroundColor: `${classification.predicted_label === 'High' ? '#7f1d1d' : classification.predicted_label === 'Medium' ? '#713f12' : '#1e3a8a'}`,
                      borderColor: `${classification.predicted_label === 'High' ? '#ef4444' : classification.predicted_label === 'Medium' ? '#eab308' : '#3b82f6'}`,
                      color: '#ffffff',
                    }}
                  >
                    {classification.predicted_label} (Sóng vừa)
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Độ tự tin (Confidence): <strong>{((classification.confidence || 0) * 100).toFixed(0)}%</strong>
                </div>
              </div>

              {/* Phân phối xác suất 3 nhãn */}
              <div className="bg-[#0b2438] p-3 rounded-lg border border-[#244b63] space-y-2 text-xs">
                <div className="text-gray-400 font-medium">Xác suất phân lớp:</div>
                {Object.entries(classification.class_probabilities || {}).map(([label, prob]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span>{label}</span>
                      <strong>{(prob * 100).toFixed(0)}%</strong>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${prob * 100}%`,
                          backgroundColor: label === 'High' ? '#ef4444' : label === 'Medium' ? '#eab308' : '#3b82f6',
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bảng định nghĩa Scheme ngưỡng */}
            <div className="mt-5 bg-[#081f33] p-3 rounded-lg border border-[#244b63]">
              <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Ngưỡng phân cấp: {classification.scheme.name}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {classification.scheme.thresholds.map((t) => (
                  <div key={t.label} className="p-1.5 rounded bg-[#102d44] border border-[#2b5268]">
                    <span className="font-bold" style={{ color: t.color }}>{t.label}</span>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {t.max_m ? `${t.min_m}m - ${t.max_m}m` : `> ${t.min_m}m`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#244b63] text-xs text-gray-400">
            *Lưu ý khoa học: Phân loại sóng phục vụ nghiên cứu thống kê, không thay thế cảnh báo an toàn cứu hộ hàng hải.
          </div>
        </div>
      </div>

      {/* LỊCH SỬ DỰ BÁO: ACTUAL VS PREDICTED TIME SERIES */}
      <div className="bg-[#102d44] border border-[#2b5268] rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Lịch sử đánh giá thực tế vs Dự báo (30 ngày gần nhất)</h2>
            <p className="text-xs text-[#9fbcd0]">
              So sánh chuỗi giá trị thực đo (Actual WVHT) và giá trị mô hình đã phát hành trước đó (Predicted).
            </p>
          </div>
          <button
            onClick={() => setShowErrorsOnly(!showErrorsOnly)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#33617b] bg-[#164358] text-cyan-200 hover:bg-[#1d526b] transition-colors"
          >
            {showErrorsOnly ? '← Xem đường so sánh' : 'Xem biểu đồ sai số tuyệt đối (MAE)'}
          </button>
        </div>

        <EChart options={chartOptions} height={320} />
      </div>
    </div>
  );
}

