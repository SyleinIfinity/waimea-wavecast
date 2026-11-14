# TL02 — STATUS REPORT | Frontend Core UI & Data Analytics

## Cập nhật S09 — 2026-11-14

Phần báo cáo bên dưới giữ nguyên hồ sơ snapshot ngày 2026-11-12. Tại mã nguồn
hiện tại, nhận xét “chưa có Data Quality” của snapshot đó đã được thay thế bằng
phần triển khai sau. Chưa thay đổi mức nghiệm thu tổng thể TL02: **PARTIAL**.

| Phạm vi S09 | Code path | Minh chứng / giới hạn |
|---|---|---|
| Data Quality overview, bộ lọc HST/năm, KPI, coverage tháng, biểu đồ ngày, bảng phân trang, QC severity/status, CSV, provenance | `src/features/data-quality/{DataQualityPage.tsx,api.ts,quality.ts,quality.mock.ts}` | Unit/adapter tests **11/11 PASS**; TypeScript và production build PASS |
| Menu S09 và sidebar mobile | `src/App.tsx` | Chrome headless với API fixture localhost: chuyển trang, render, CSV, phân trang, bộ lọc, lỗi 503/retry, empty, drawer 360px, không tràn trang, không có uncaught JS exception: PASS |
| Hợp đồng API | `GET /api/v1/data-quality/overview?start_hst&end_hst` | Đối chiếu code Backend `services/database_api/app/api/public.py`; **chưa gọi/kiểm thử Backend thật** |
| Missing theo field / gap details / source-file revisions | Chưa có trong DTO overview | Hiển thị thông báo chưa được cung cấp, không tạo dữ liệu giả làm dữ liệu thực |

**Lệnh kiểm tra:** `npm.cmd run test:s09`, `npm.cmd run build`,
`npm.cmd run test:s09:browser`. Chi tiết môi trường và DTO:
`src/features/data-quality/README.md`.

**Chưa nghiệm thu:** API thật, end-to-end NOAA → Silver → Frontend và toàn bộ
các màn hình TL02 còn lại. Browser smoke dùng fixture, không phải bằng chứng
kết nối NOAA/Cloud SQL. Production S09 không bật mock.

---

**Người thực hiện:** Thành viên 2 — TL02 (Frontend Core UI & Data Analytics); chưa điền họ tên trong tài liệu nguồn.  
**Nhánh Git:** `feature/tl02-fe-core`  
**Commit / Pull Request:** `65ec147` — commit S01/S02 đã được người thực hiện xác nhận push lên `origin/feature/tl02-fe-core`; commit và trạng thái push S03/S04 **chưa được xác minh** từ ZIP.  
**Ngày cập nhật báo cáo:** 2026-11-12  
**Nguồn đối chiếu:** Mã nguồn trong `waimea-wavecast_TL02(1).zip`, tài liệu `PhanCong/TL02-Frontend-Core.md`, và ảnh chạy giao diện S01–S04 đã cung cấp trong quá trình phát triển.

> **Nguyên tắc đánh giá:** `PARTIAL` = đã có code và/hoặc bằng chứng chạy thủ công nhưng **chưa đủ tiêu chí nghiệm thu**. Không suy diễn ảnh chụp trình duyệt thành `npm run build` / Vitest PASS, không coi mock là API thật. Theo `PhanCong/docs/README_REPORTS.md`, chỉ đánh dấu `DONE` khi có kiểm chứng tương ứng.

## Tiến độ theo nhiệm vụ phân công

| Task ID | Trạng thái | Code path | Test command/result | Ghi chú / blocker |
|---|---|---|---|---|
| TL02-01 — Layout + nền tảng giao diện | **PARTIAL** | `src/App.tsx`; `src/api/client.ts`; `src/components/charts/EChart.tsx` (component dùng chung của TL03) | Ảnh trình duyệt xác nhận sidebar, điều hướng tab và giao diện Dark Ocean hoạt động cùng các trang TL03. **Chưa có log kiểm thử responsive 360px hoặc bộ unit test độc lập.** | App đang dùng `activeTab` trong `App.tsx`, **chưa có router URL** và chưa tách đủ `src/layout/`, `src/lib/`, `src/components/ui/` như yêu cầu; cần rà soát loading/empty/error, UTC↔HST trên toàn ứng dụng. Không nhận công sức tạo EChart của TL03 là của TL02. |
| TL02-02 — Các màn hình S01–S04 + Data Quality | **PARTIAL** | `src/features/dashboard/DashboardPage.tsx`; `src/features/observations/{ObservationsPage.tsx,api.ts}`; `src/features/time-series/{TimeSeriesPage.tsx,data.ts}`; `src/features/trend/{TrendPage.tsx,data.ts}` | Đã có ảnh chụp S01–S04 chạy trên Vite. S02 đã quan sát được bảng/CSV ở giai đoạn đầu; S03 có Daily/Weekly/Monthly, histogram và scatter; S04 có 4 biểu đồ, bố cục Grid/Stacked và bảng 3 trang (1–36). **Không có log tự động PASS cho ZIP này.** | S01 hiện ở `dashboard/`, không phải `overview/` như spec. S02 có dữ liệu mock 55 bản ghi để demo, bộ lọc QC phía client sau phân trang. S03/S04 dùng mock có gắn nhãn. Chưa có `src/features/data-quality/` độc lập; gaps/QC/coverage chưa nghiệm thu; chưa xác minh contract và dữ liệu thực từ Backend. Xuất CSV/PNG bản S04 mới nhất chưa có file kết quả để nghiệm thu. |
| TL02-03 — Test & bàn giao | **PARTIAL** | `PhanCong/docs/contributions/TL02_STATUS.md`; `PhanCong/docs/contributions/TL02_FUNCTIONS.md` | Đã cập nhật hai báo cáo dựa trên source và ảnh. `package.json` có `npm run build` / `typecheck` nhưng **không có script `test` hoặc bộ Vitest/RTL được xác nhận trong ZIP**. | Còn thiếu test loading/empty/stale/error/null/HST, biểu đồ, filter/zoom, kiểm tra mobile 360px, F12 network, build log của snapshot cuối, API contract và quy trình nghiệm thu. |

## Màn hình và thành phần đã có trong mã nguồn

| Màn hình | Code hiện có | Bằng chứng quan sát | Giới hạn cần ghi rõ |
|---|---|---|---|
| **S01 — Overview Dashboard** | KPI WVHT/DPD/MWD/WTMP, trạng thái dữ liệu, Observation Feed, Station Information, `loadLatest()` | Ảnh giao diện S01 hiển thị trong sidebar chung | `loadLatest` hỗ trợ mock; cần kiểm chứng nguồn API và độ mới của dữ liệu trên backend thật |
| **S02 — Observations Explorer** | Bộ lọc ngày/metric/QC, line chart, bảng có STT và cursor pagination, CSV, `getObservations()` | Ảnh giao diện và thao tác xuất CSV giai đoạn đầu | Có 55 bản ghi demo, nguồn `TL02 DEMO DATA`; QC lọc sau phân trang; chưa xác nhận API thật, gaps/QC overview |
| **S03 — Time-Series Analytics** | Daily, Weekly, Monthly; Mean/Median; histogram WVHT; scatter WVHT–DPD; thời gian nhanh và zoom; `loadTimeSeries()` | Ảnh 5 biểu đồ và giao diện cải tiến | Dữ liệu giả lập 240 ngày; `data.ts` dùng endpoint observations làm adapter tạm, chưa xác minh các endpoint metrics/summary thực tế |
| **S04 — Trend & Seasonality** | Observed/Trend/Seasonal/Residual, điều kiện tối thiểu 36 tháng, Grid/Stacked, tooltip liên kết, bảng chi tiết có STT và phân trang, CSV/PNG, `loadTrend()` | Ảnh 4 biểu đồ và bảng các trang 1–3; ảnh chứng minh UI | Dữ liệu 48 tháng mô phỏng; đã từng gặp PNG chỉ có trục, file xuất từ **phiên bản nâng cấp cuối** chưa được kiểm chứng; API `analytics/trend-seasonal` còn chờ Backend xác nhận |

## API / dữ liệu còn thiếu để tích hợp

- `.env` trên máy thành viên đã được khai báo `VITE_API_BASE_URL=https://apiwaimea.liems.io.vn/api/v1` trong trao đổi; **không dùng thông tin đó để khẳng định dịch vụ đang hoạt động**. ZIP không xác nhận biến môi trường đang được bật ở máy chạy.
- TL02 dùng `VITE_USE_MOCK=true` / không có API URL để demo tại các adapter hỗ trợ. Phải gắn nhãn `MOCK DATA · NOT NOAA` và tắt mock khi nghiệm thu API thật.
- Cần kiểm thử thực tế `GET /api/v1/observations`, `GET /api/v1/observations/latest` và endpoint analytics trend/seasonal theo hợp đồng; đối chiếu tham số query, DTO, cờ QC, `next_cursor`, timezone UTC/HST, CORS và lỗi HTTP.
- S03 hiện đọc nhiều trang observations để tự tổng hợp trên frontend, có giới hạn tải; cần thống nhất endpoint tổng hợp phù hợp với TL04/TL05 hoặc thành viên sở hữu API.
- Chưa có bằng chứng endpoint dành cho data-quality/coverage/missing/gaps hoặc khả năng hiển thị chi tiết an toàn khi dữ liệu rỗng.

## Kết luận bàn giao

- **Số task `DONE` được xác nhận:** **0/3** theo tiêu chí nghiệm thu chính thức; **3/3 đang `PARTIAL`** (đã có tiến độ code thực tế, không còn `NOT_STARTED`).
- **UI S01–S04:** Có source và ảnh chạy thủ công; **chưa đồng nghĩa nghiệm thu end-to-end**.
- **Build/test độc lập:** Chưa có log `npm run build` PASS đi kèm snapshot ZIP cuối; Vitest/RTL chưa được xác nhận, cần chạy và lưu chứng cứ.
- **Kiểm tra secrets/mock trong production:** Chưa có biên bản xác minh; cần bảo đảm mock không bị coi là dữ liệu NOAA thật khi phát hành.
- **Việc cần làm trước merge:** `npm run build`; kiểm tra F12 Network; chạy kiểm thử thủ công S01–S04; xác minh CSV/PNG cuối; test màn hình 360px; đối chiếu Backend API; rà soát quyền sở hữu TL02/TL03 và PR. **Không chỉnh sửa source TL03 chỉ để hoàn thành báo cáo.**
