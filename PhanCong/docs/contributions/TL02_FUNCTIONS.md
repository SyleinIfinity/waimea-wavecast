# TL02 — COMPLETED FUNCTIONS | Frontend Core UI & Data Analytics

> **Quy tắc nghiệm thu gốc:** Chỉ đưa vào danh mục **đã nghiệm thu** những function/component có code path và bằng chứng test PASS. Các thành phần đã viết nhưng chỉ quan sát qua ảnh/UI được liệt kê **riêng** ở mục *Đã triển khai — chờ nghiệm thu*, không được tính là DONE.

**Ngày đối chiếu:** 2026-11-12  
**Nhánh TL02:** `feature/tl02-fe-core`  
**Nguồn:** `waimea-wavecast_TL02(1).zip` và ảnh kiểm tra giao diện S01–S04 do thành viên cung cấp.  
**Commit xác nhận:** `65ec147` cho S01/S02 (đã push); trạng thái commit S03/S04 chưa được xác minh.

## 1. Danh mục function/component đã nghiệm thu bằng test PASS

| ID | Function / Endpoint / Component | File path | Input → Output / Tác dụng | Test/Bằng chứng PASS | Tình trạng |
|---|---|---|---|---|---|

**Chưa có mục đủ bằng chứng test PASS để đưa vào danh mục nghiệm thu chính thức.** Đây là trạng thái của hồ sơ test, **không phải kết luận chưa có code**. Khi có build/test log hoặc biên bản manual test, bổ sung từng mục ở đây.

## 2. Đã triển khai — chờ nghiệm thu đầy đủ

| ID | Component / function TL02 | File path | Input → Output / Tác dụng | Bằng chứng hiện có | Tình trạng |
|---|---|---|---|---|---|
| TL02-F01 | `App` — đăng ký và chuyển tab S01–S04 | `src/App.tsx` | `activeTab` → hiển thị Dashboard/Observations/TimeSeries/Trend; duy trì menu TL03 | Ảnh sidebar và từng trang S01–S04 chạy | `PARTIAL` — chưa test routing URL, mobile, regression TL03 |
| TL02-F02 | `DashboardPage` | `src/features/dashboard/DashboardPage.tsx` | Latest observation → 4 KPI, trạng thái nguồn, Observation Feed, Station Information | Ảnh trang S01 | `PARTIAL` — chưa nghiệm thu API/empty/error/freshness |
| TL02-F03 | `getObservations` + kiểu `ObservationPage` | `src/features/observations/api.ts` | Khoảng UTC, cursor, limit → records + `nextCursor` + `isMock`; có dữ liệu demo 55 bản ghi hoặc fetch API | Source có hàm và ảnh S02 | `PARTIAL` — mock pagination kiểm thử giao diện, chưa có contract/Backend PASS |
| TL02-F04 | `ObservationsPage` | `src/features/observations/ObservationsPage.tsx` | Ngày, metric, QC, cursor → line chart, bảng STT, Prev/Next, CSV trang | Ảnh S02, xuất CSV ban đầu | `PARTIAL` — QC client-side sau phân trang, cần test CSV sau chỉnh sửa |
| TL02-F05 | `loadTimeSeries` | `src/features/time-series/data.ts` | Khoảng ngày UTC → dữ liệu time series (`items`, `isMock`, `truncated`); mock hoặc adapter fetch | Source và ảnh biểu đồ S03 | `PARTIAL` — adapter Backend tạm, chưa có test pagination/load cap |
| TL02-F06 | `TimeSeriesPage` | `src/features/time-series/TimeSeriesPage.tsx` | Metric, Mean/Median, filter range/QC → Daily/Weekly/Monthly, histogram WVHT, scatter WVHT–DPD | Ảnh 5 biểu đồ S03 và filter nhanh | `PARTIAL` — chưa có bộ test số học, ngày/đơn vị, zoom tự động |
| TL02-F07 | `loadTrend` và phân rã demo | `src/features/trend/data.ts` | Metric, khoảng tháng → observed/trend/seasonal/residual; báo lỗi nếu thiếu tối thiểu 36 tháng liên tục; gọi endpoint dự kiến ở Backend Mode | Source và ảnh S04 có khoảng thiếu ở biên | `PARTIAL` — chưa nghiệm thu phương pháp với dữ liệu chuẩn hoặc API thực |
| TL02-F08 | `TrendPage` + bảng Decomposition Details | `src/features/trend/TrendPage.tsx` | Metric/tháng/zoom/layout → 4 biểu đồ, tooltip liên kết, Grid/Stacked, bảng STT, phân trang, CSV/PNG | Ảnh S04 bốn biểu đồ + bảng trang 1–3 | `PARTIAL` — cần test CSV/PNG cuối và các thao tác lọc/zoom |

**Phân định sở hữu:** `src/components/charts/EChart.tsx` và các trang Forecast, Correlation, Clustering, Models, Pipeline, Admin có nguồn gốc TL03; TL02 **tái sử dụng**, không liệt kê là chức năng do TL02 tự xây dựng. `src/api/client.ts` là file dùng chung được TL02 điều chỉnh cách chuẩn hóa URL; không nhận toàn bộ nội dung TL03 là đóng góp TL02.

## 3. Bằng chứng và lệnh kiểm thử cần bổ sung

| Phạm vi | Lệnh / thao tác | Trạng thái bằng chứng |
|---|---|---|
| Build toàn bộ frontend | `npm run build` (TypeScript + Vite) | Chưa có log PASS gắn với ZIP mới nhất; cần chạy lại và lưu kết quả |
| TypeScript | `npm run typecheck` | Chưa có log từ ZIP hiện tại |
| Unit/component tests | Vitest + React Testing Library | `package.json` hiện không khai báo script `test`; chưa thể ghi PASS |
| UI S01–S04 | Chạy `npm run dev`, chụp ảnh tương ứng | **Đã có bằng chứng render thủ công**; không tương đương kiểm thử mọi nút |
| S02 | Lọc ngày/metric/QC, qua trang, CSV với mock; khi có BE test cursor thật | Đã thấy giao diện, cần biên bản thao tác/đối chiếu dữ liệu sau phiên bản mới |
| S03 | Mean/Median, Daily/Weekly/Monthly, histogram/scatter, zoom, khoảng ngày | Đã có ảnh biểu đồ; cần test giá trị và các thao tác tương tác |
| S04 | Grid/Stacked, tooltip sync, trang bảng, CSV, PNG có đầy đủ đường biểu đồ, insufficient-data | Đã có ảnh Grid/Stacked và bảng; CSV/PNG phiên bản cuối chưa có chứng cứ nghiệm thu |
| API thật & responsive | F12 Network, CORS/HTTP, 360px/mobile smoke | Chưa có biên bản kiểm thử |

## Ghi chú tương thích contract

- Contract version tham chiếu: `PhanCong/00_HOP_DONG_CHUNG.md` v1.
- Có `VITE_API_BASE_URL` và cờ `VITE_USE_MOCK` ở frontend; dữ liệu mẫu **không phải** nguồn NOAA/Backend.
- Endpoint và DTO S02/S03/S04 cần được các thành viên Backend xác nhận trước khi đánh dấu `DONE` cho tích hợp.
- Thay đổi cần reviewer phê duyệt: chuẩn hóa contract API, routing/architecture so với spec, tổ chức trang Data Quality và kiểm thử trước merge.
