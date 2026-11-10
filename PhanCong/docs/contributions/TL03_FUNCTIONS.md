# TL03 — COMPLETED FUNCTIONS | Frontend ML / Admin

> **Chỉ liệt kê function/endpoint/component đã viết và có test PASS.**

| ID | Function / Endpoint / Component | File path | Input → Output / Tác dụng | Test/Bằng chứng | Tình trạng |
|---|---|---|---|---|---|
| F01 | `ForecastPage` (S07) | `src/features/forecast/ForecastPage.tsx` | Nhận `WaveForecast`, `ForecastHistoryPoint[]`, `WaveClassification` → Hiển thị 2 panel: Hồi quy WVHT ngày mai T+1 (mét) & Phân loại cấp sóng, Line chart Actual vs Predicted | `npm run build` PASS | DONE |
| F02 | `CorrelationPage` (S05) | `src/features/analysis/CorrelationPage.tsx` | Nhận `CorrelationMatrix` (Pearson/Spearman) → Heatmap tương quan đối xứng -1..1, click ô mở Scatter Plot kèm trendline | `npm run build` PASS | DONE |
| F03 | `ClusteringPage` (S06) | `src/features/clustering/ClusteringPage.tsx` | Nhận `ClusteringSummary` → Radar chart Centroid Profile (Z-score), Timeline/Calendar phân cụm ngày HST theo màu | `npm run build` PASS | DONE |
| F04 | `ModelsPage` (S08) | `src/features/models/ModelsPage.tsx` | Nhận `ModelRegistryItem[]`, `ConfusionMatrixData` → Bảng Model Registry, So sánh với Baseline (Persistence), Confusion Matrix 3 cấp sóng | `npm run build` PASS | DONE |
| F05 | `PipelinePage` (S10) | `src/features/pipeline-monitor/PipelinePage.tsx` | Nhận `PipelineServiceStatus[]`, `ProcessingJob[]` → Sơ đồ DAG tiles luồng xử lý NOAA-GCS-DB-ML, Bảng lịch sử job | `npm run build` PASS | DONE |
| F06 | `DemoControlPage` (S11) | `src/features/demo-control/DemoControlPage.tsx` | Preflight, Chọn phạm vi Gold xóa demo, Modal xác nhận gõ chữ "DELETE GOLD DEMO", Rebuild qua HTTP 202 Polling | `npm run build` PASS | DONE |
| F07 | `EChart` | `src/components/charts/EChart.tsx` | React 19 Ref hook bọc Apache ECharts, tự động resize, render SVG/Canvas không rò rỉ bộ nhớ | `npm run build` PASS | DONE |
| F08 | `ApiClient & MockLayer` | `src/api/{client,mockData,types}.ts` | Mock layer & API Client chuẩn hóa theo 00_HOP_DONG_CHUNG.md, tự động fallback khi chưa có Backend | `npm run build` PASS | DONE |

## Ghi chú tương thích contract

- Contract version: `00_HOP_DONG_CHUNG.md` v1.
- Không sửa App Shell của TL02: Toàn bộ 6 màn hình đều được đóng gói và export độc lập tại `src/features/**/index.ts`.
- Bảo vệ dữ liệu an toàn tuyệt đối: Không cung cấp nút xóa Database, bảo tồn toàn bộ schema Bronze, Silver và Model Registry.
