# TL03 — STATUS REPORT | Frontend ML / Admin

**Người thực hiện:** Thành viên 3 (TL03 - Frontend Data Mining & Admin)  
**Nhánh Git:** `feature/tl03-fe-ml-admin`  
**Commit / Pull Request:** Local on branch `feature/tl03-fe-ml-admin` (Chờ người dùng duyệt trước khi push)  
**Ngày cập nhật:** 2026-11-10  

| Task ID | Trạng thái | Code path | Test command/result | Ghi chú/blocker |
|---|---|---|---|---|
| TL03-01 | DONE | `src/features/{forecast,analysis,clustering,models}/**` | `npm run build` PASS (tsc + vite build) | Hoàn thành 4 màn hình Data Mining: S05 Heatmap tương quan & Scatter, S06 K-means phân cụm & Radar centroid, S07 Forecast hồi quy T+1 (WVHT) & Phân loại mức sóng, S08 Model Registry & Confusion Matrix |
| TL03-02 | DONE | `src/features/{pipeline-monitor,demo-control}/**` | `npm run build` PASS (tsc + vite build) | Hoàn thành S10 Pipeline DAG tiles & Job table, S11 Admin Demo Control xóa có guardrail 2 bước gõ chữ xác nhận và Rebuild qua polling HTTP 202 |
| TL03-03 | DONE | `src/api/{types,mockData,client}.ts`, `src/components/charts/EChart.tsx` | `npm run build` PASS | Đầy đủ mock fixtures theo hợp đồng, xử lý độc lập các trạng thái mạng và DTO |

## API / dữ liệu còn thiếu để tích hợp

- Cần Backend hoàn thiện endpoint Facade Admin `/api/v1/admin/demo/patterns/*` (mã HTTP 202 Accepted + Polling Job) để thay thế adapter Mock.
- Cần Backend cung cấp endpoint `GET /api/v1/clusters/profiles` để lấy centroid profile z-score khi không dùng mock.

## Kết luận bàn giao

- Tổng số task `DONE`: 3/3.
- Build/test độc lập: ĐÃ KIỂM CHỨNG PASS (`npm run build`).
- Kiểm tra secrets/mock trong production: ĐÃ KIỂM CHỨNG (Không có GCS private credentials hay SQL connection string ở Frontend).
- Việc người khác cần thực hiện khi merge: TL02 chỉ cần import các page export từ `src/features/**/index.ts` vào router chung.
