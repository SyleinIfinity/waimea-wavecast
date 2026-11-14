# S09 — Data Quality & Provenance (TL02)

Mở menu **Chuỗi dữ liệu Quan trắc (TL02) → Data Quality & Provenance · S09**.
Trang dùng React, TypeScript, Tailwind CSS, ECharts và Lucide đang có trong dự án;
không thêm dependency. Sidebar chuyển thành menu thu gọn ở viewport dưới 768px.

## API và phạm vi

Adapter gọi duy nhất:

```text
GET /api/v1/data-quality/overview?start_hst=YYYY-MM-DD&end_hst=YYYY-MM-DD
```

DTO đối chiếu từ `waimea-wavecast-api/services/database_api/app/api/public.py`:

```json
{
  "status": "ok",
  "data": {
    "daily": [
      { "date_hst": "2026-01-01", "sample_count": 40, "valid_wave_count": 38, "coverage_ratio": null }
    ],
    "issues": [{ "status": "open", "severity": "warning", "count": 2 }]
  }
}
```

Ví dụ trên chỉ minh họa cấu trúc. API chưa được nghiệm thu với dữ liệu thật trong
lần triển khai này. Hỗ trợ `status: empty` với hai danh sách rỗng; numeric strings
từ PostgreSQL được kiểm tra và chuyển thành số. Phản hồi sai cấu trúc, HTTP lỗi
và request hủy không được thay bằng mock.

- `VITE_API_BASE_URL` nhận origin hoặc URL kết thúc bằng `/api/v1`.
- Khi chạy Vite dev, thiếu URL hoặc `VITE_USE_MOCK=true` bật fixture có nhãn
  **MOCK DATA · NOT NOAA**. Ví dụ chọn năm 2005 để kiểm tra trạng thái rỗng của
  fixture; điều này không xác nhận nguồn NOAA thực tế có/không có dữ liệu.
- Production luôn gọi API; fixture S09 chỉ được import trong nhánh dev và bị
  loại khỏi build production. Không đổi cơ chế mock của các trang khác.
- Bộ lọc dùng ngày `Pacific/Honolulu`; không cho chọn tương lai hoặc khoảng
  chênh lệch lớn hơn 366 ngày, phù hợp giới hạn mặc định Backend.

## Nội dung và ý nghĩa số liệu

- 4 KPI: tổng mẫu, tỷ lệ WVHT hợp lệ theo tổng số mẫu, coverage trung bình các
  ngày có giá trị, tổng issue đang mở.
- Coverage theo tháng chỉ dựa trên những ngày nằm trong khoảng đã tải, bỏ qua
  coverage null; không thay null bằng 0 và không gọi đây là coverage toàn kỳ.
- Chọn tháng lọc biểu đồ và bảng ngày. Biểu đồ biểu diễn mẫu WVHT và coverage
  trên hai trục riêng; ngày thiếu bản ghi được để trống.
- Bảng ngày có tìm kiếm, bộ lọc trạng thái, phân trang; CSV xuất toàn bộ ngày
  phù hợp bộ lọc, kèm ngày HST, cờ có bản ghi và nguồn mock/backend.
- Tổng hợp issue có lọc severity/status và CSV riêng, luôn tính trên toàn
  khoảng ngày truy vấn; không bị lọc theo tháng của biểu đồ.
- WVHT chưa hợp lệ không đồng nghĩa missing. Ngày chưa có daily feature không
  đồng nghĩa gap quan trắc. Không tự giả định 48 mẫu/ngày trên dữ liệu thật.
- API overview chưa có missing theo field, gap details hoặc source-file/parser
  revisions, nên chỉ hiển thị thông báo chưa được cung cấp. Luồng provenance
  mô tả kiến trúc, không phải trạng thái kết nối đã được kiểm chứng.
- Thời điểm tải giao diện không được dùng làm thời điểm fetch NOAA. S09 không
  tự tuyên bố dữ liệu nguồn đang live/fresh khi không có metadata tương ứng.

## Kiểm tra

Chạy tại root frontend, với Node hỗ trợ TypeScript type stripping (đã chạy trên
Node 25.9.0, TypeScript dùng đúng dependency hiện có):

```powershell
npm.cmd run test:s09
npm.cmd run build
npm.cmd run test:s09:browser
```

Unit/adapter tests: HST qua nửa đêm/năm mới, ngày nhuận, giới hạn query, null/0,
DTO sai, tỷ lệ có trọng số, coverage null, mock deterministic, CSV escaping,
base URL, production mock guard, HTTP 404/422/503 và abort.

Browser smoke dùng Chrome headless qua CDP và API fixture trên localhost, không
gọi Backend/NOAA thật. Mặc định tìm Chrome trong `C:/Program Files/Google/Chrome/`;
có thể cấu hình biến `S09_BROWSER_PATH` tới browser Chromium tương ứng. Kiểm tra
menu S09, render API, CSV, phân trang, bộ lọc, lỗi 503/retry, empty, drawer 360px,
overflow và lỗi JavaScript. Ảnh desktop/charts/mobile và CSV được ghi vào thư mục
temp được in khi chạy xong. Browser smoke cần bản `dist` vừa build không đặt
`VITE_API_BASE_URL`, để API đi qua fixture cùng origin.

Build PASS không đồng nghĩa tích hợp Backend thật đã PASS. Các báo cáo TL02
tổng thể vẫn PARTIAL cho đến khi các yêu cầu còn lại được nghiệm thu riêng.
