# TL01 — COMPLETED FUNCTIONS | Database / Database API

> **Chỉ liệt kê function/endpoint/component đã viết và có test PASS.** Khởi tạo schema bằng SQL được ghi riêng bên dưới, không tính là function/API.

| ID | Function / Endpoint / Component | File path | Input → Output / Tác dụng | Test/Bằng chứng | Tình trạng |
|---|---|---|---|---|---|

(Chưa có function được nghiệm thu.)

## Ghi nhận khởi tạo database (không phải function)

- **Môi trường:** PostgreSQL 17.11, database `waimea_wavecast`; kết nối và `current_database()` đã được xác nhận.
- **SQL đã chạy:** `DB-review/01_init_full.sql` trên database đích.
- **Kết quả verify:** chạy toàn bộ `DB-review/03_verify.sql`; nhận thông báo `PASS: Waimea v2 required tables, seed metadata and evaluation view exist`.
- **Cấu trúc tạo được:** 3 schema gồm `bronze` (6 bảng), `silver` (5 bảng), `gold` (14 bảng), tổng 25 bảng; 5 views.
- **Metadata kiểm tra được:** trạm NOAA `51201`; 3 source feeds; 14 measurement definitions.
- **Triggers:** `trg_wave_revision_prepare` và `trg_wave_revision_audit` trên `silver.wave_observations`. Truy vấn `information_schema.triggers` trả 4 dòng vì mỗi trigger gắn với hai sự kiện `INSERT` và `UPDATE`; đó là 2 trigger, không phải 4.
- **Giới hạn:** chưa nạp dữ liệu quan trắc NOAA; SQL khởi tạo tạo cấu trúc và metadata, không tải dữ liệu.
- **Lưu ý bàn giao:** SQL hiện được xác minh từ `DB-review/`; chưa ghi nhận việc copy vào `database/migrations/` của backend repo.

## Ghi chú tương thích contract

- Contract version: `00_HOP_DONG_CHUNG.md` v1.
- Thay đổi cần reviewer phê duyệt: (ghi nếu có).
