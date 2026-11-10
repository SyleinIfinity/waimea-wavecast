import { useEffect, useState } from 'react'
import { loadLatest } from '../../api/client'
import type { LatestObservation } from '../../api/types'

const fmt = (n: number | null | undefined, unit: string) =>
  n === null || n === undefined ? '—' : `${n.toLocaleString('vi-VN')} ${unit}`

export default function DashboardPage() {
  const [data, setData] = useState<LatestObservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    loadLatest(controller.signal)
      .then((res) => setData(res.data))
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(String(err)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  return (
    <main className="main">
      <div className="eyebrow">HAWAII · WAIMEA BAY · NOAA 51201</div>
      <h1>Ocean Wave Intelligence</h1>
      <p>Quan trắc sóng biển, khai phá dữ liệu và dự báo trạng thái biển.</p>
      <div className="notice">{loading ? 'Đang tải API…' : error ? `Lỗi API: ${error}` : data ? 'Dữ liệu quan trắc từ Backend' : 'Backend chưa có dữ liệu — cần hoàn thiện Ingestion'}</div>
      <div className="metrics">
        <section><span>Wave height</span><strong>{fmt(data?.wave_height_m,'m')}</strong></section>
        <section><span>Dominant period</span><strong>{fmt(data?.dominant_period_s,'s')}</strong></section>
        <section><span>Wave direction</span><strong>{fmt(data?.wave_direction_deg,'°')}</strong></section>
        <section><span>Sea temperature</span><strong>{fmt(data?.sea_temperature_c,'°C')}</strong></section>
      </div>
      <article><h2>Observation Feed</h2>
        {data ? <p>{data.source} · {data.observed_at} · QC: {data.quality_flag}</p> : <p>Chưa có quan trắc. Không hiển thị dữ liệu giả.</p>}
      </article>
      <article><h2>Upcoming modules</h2>
        <p>Analytics · Trend · Seasonality · Correlation · Clustering · Prediction · Classification</p>
      </article>
    </main>
  )
}
