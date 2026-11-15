# Yêu cầu chỉnh sửa giao diện Waimea WaveCast Frontend

**Mục đích:** tổ chức lại website thành 8 trang dễ hiểu với người xem, đồng thời giữ thông tin kỹ thuật cần thiết cho đồ án trong các tab phù hợp. Đây là tài liệu yêu cầu triển khai, chưa xác nhận rằng mọi API bên dưới đã sẵn sàng.

## 1. Điều hướng mới

Sidebar hiển thị đúng thứ tự sau; **Tổng quan** là trang mở mặc định:

| Thứ tự | Tên hiển thị | Nội dung chuyển từ giao diện hiện tại |
| --- | --- | --- |
| 1 | Tổng quan | S01 Tổng quan trạm |
| 2 | Tra cứu dữ liệu | S02 Tra cứu quan trắc + S03 Phân tích chuỗi thời gian; nội dung S04 xu hướng/mùa vụ nằm trong tab Thời gian nếu còn dùng |
| 3 | Dự đoán và phân loại | S07 |
| 4 | Ma trận tương quan | S05 |
| 5 | K-Means | S06 |
| 6 | Đánh giá mô hình | S08 |
| 7 | Chất lượng và nguồn gốc dữ liệu | S09 |
| 8 | Quyền Admin | S11 Điều khiển diễn tập + trạng thái xử lý từ S10 |

Bỏ mục **Phân tích chuỗi thời gian** riêng khỏi sidebar. Giữ đường dẫn/điểm điều hướng cũ dưới dạng chuyển hướng về tab mới để liên kết đã chia sẻ không bị hỏng. Không hiển thị mã S01/S02/TL03 trong nhãn điều hướng dành cho người dùng; có thể giữ trong tài liệu kỹ thuật.

## 2. Trang Tổng quan

Gồm hai tab:

### Thông tin trạm và API

- Hiển thị tên trạm NOAA 51201, vị trí, múi giờ Hawaii, thời điểm quan trắc gần nhất và các chỉ số hiện có. Mọi giá trị động lấy từ Backend; trường không có dữ liệu hiển thị **Chưa có dữ liệu**.
- Có mục **API website đang sử dụng**: liệt kê URL gốc `https://apiwaimea.liems.io.vn/api/v1`, tên endpoint công khai, chức năng, trạng thái lấy dữ liệu gần nhất và nút xem mẫu phản hồi JSON đã loại thông tin nhạy cảm. Không hiển thị token, mật khẩu, endpoint nội bộ hoặc URI GCS riêng tư.
- Dữ liệu có thể dùng ngay: `GET /api/v1/stations/51201`, `GET /api/v1/observations/latest`, `GET /health/ready`.

### Về Waimea WaveCast

- Nêu mục đích dự án, trạm NOAA đang theo dõi, luồng dữ liệu NOAA → Bronze → Silver → Gold → dự báo/đánh giá, và giới hạn của kết quả dự báo thử nghiệm.
- Nội dung giới thiệu là văn bản biên tập; các số liệu như số bản ghi hay thời điểm cập nhật phải lấy từ API.

## 3. Trang Tra cứu dữ liệu

Gồm ba tab. Bộ lọc ngày ghi rõ múi giờ được sử dụng; giai đoạn đầu dùng **UTC** như API phân tích hiện tại, không đổi nhãn thành HST khi phép gộp vẫn theo UTC.

### Tab Biểu đồ

- Có bộ lọc **Từ ngày**, **Đến ngày**, **Chỉ số**: WVHT (độ cao sóng), DPD (chu kỳ sóng trội), APD (chu kỳ sóng trung bình), MWD (hướng sóng trung bình), WTMP (nhiệt độ mặt nước).
- Bên dưới là một biểu đồ theo thời gian của chỉ số được chọn; hiển thị đơn vị, số mẫu, khoảng thời gian, trạng thái QC và khoảng trống dữ liệu thật. Không nối đường qua khoảng không có quan trắc như thể có dữ liệu.
- Dải ngắn có thể dùng `GET /api/v1/observations`; dải dài dùng API tổng hợp `GET /api/v1/analytics/time-series/overview` để không bị giới hạn 10 trang quan trắc.

### Tab Thời gian

- Chuyển toàn bộ nội dung S03 vào đây: biểu đồ ngày/tuần/tháng, Mean/Median, lọc QC, histogram WVHT và scatter WVHT–DPD. Giữ khả năng chọn **Toàn bộ lịch sử**.
- Hiển thị rõ histogram tính trên toàn khoảng đã chọn; scatter là mẫu tối đa 1.500 điểm và phải ghi tổng số cặp gốc. Với MWD, không diễn giải trung bình tuyến tính là hướng sóng chính xác.
- Nếu còn giữ nội dung S04 về xu hướng và mùa vụ, đặt trong một khu vực/tab con của Thời gian; không làm mất chức năng chỉ vì bỏ mục sidebar.

### Tab Dữ liệu lấy được

- Bảng có dropdown **Bronze / Silver / Gold**, lọc ngày, phân trang, tổng số dòng và trạng thái tải/lỗi/không có dữ liệu. Không tải toàn bộ lịch sử trong một request.
- **Bronze:** thời điểm, dòng NOAA gốc (`raw_line`), giá trị tách từ dòng gốc, trạng thái phân tích, nguồn file. Cho mở chi tiết dòng; giữ nguyên giá trị thiếu như nguồn, không tự điền. Các payload Bronze cũ đã lưu trữ cần được đọc lại từ GCS bằng API Backend có kiểm tra generation/checksum.
- **Silver:** thời điểm, WVHT, DPD, APD, MWD, WTMP, trạng thái QC, nguồn và dấu vết bản ghi. Giá trị null hiển thị **Không có trong nguồn**.
- **Gold:** kỳ tính toán, độ phân giải, chỉ số, giá trị tổng hợp, số mẫu, độ phủ/trạng thái sẵn sàng và thời điểm tính. Phân biệt rõ dữ liệu tổng hợp với quan trắc gốc.
- Không gọi API `/internal/v1/*` từ trình duyệt và không đưa `INTERNAL_API_TOKEN` hoặc `ADMIN_API_TOKEN` vào bundle frontend. **Backend cần bổ sung API công khai chỉ đọc, có phân trang cho Bronze và bảng Gold**; Silver đã có `GET /api/v1/observations`.

## 4. Trang Dự đoán và phân loại

### Tab Dự đoán

- Chỉ dùng **Calisthenics 1.5** làm nguồn dự báo hiển thị chính. Gắn nhãn **Thử nghiệm / đang theo dõi** khi model còn DRAFT; không gọi là dự báo chính thức. Thông tin so sánh model khác chuyển sang trang Đánh giá mô hình.
- Đầu trang hiển thị **thời gian hiện tại theo giờ Việt Nam (UTC+7)** và thời điểm cập nhật dữ liệu. Các tên chỉ số/thuật ngữ kỹ thuật được viết bằng tiếng Việt dễ hiểu; có chú giải ngắn cho WVHT và kỳ hạn.
- Bốn card: **ngắn hạn (mốc 30 phút)**, **1 ngày**, **ngày thứ 7**, **trung bình 30 ngày**. Không gọi mốc 7 ngày là chuỗi dự báo từng ngày; 30 ngày là trung bình của cả giai đoạn.
- Mỗi card gồm: thời gian tạo dự báo theo giờ Việt Nam; ngày/giờ hoặc giai đoạn được dự báo theo **giờ Việt Nam và giờ Hawaii**; giá trị dự báo và đơn vị; trạng thái **Đang chờ dữ liệu thật / Đã có kết quả**. Với 1/7 ngày, hiển thị **ngày mục tiêu** thay vì biến `target_at` (cuối ngày) thành giờ quan trắc tức thời. Với 30 ngày, hiển thị đầu–cuối giai đoạn.
- Trường **Thời gian dự kiến nhận kết quả thật** chỉ hiển thị giờ cụ thể nếu Backend cung cấp dự kiến có căn cứ. `target_at` là mốc cần dự báo hoặc kết thúc kỳ, **không phải bảo đảm giờ NOAA công bố dữ liệu**. Nếu chưa có dự kiến, ghi “Sau khi NOAA công bố và dữ liệu qua QC”.
- Nếu API không có dự báo cho một kỳ hạn, card ghi **Chưa có dự báo**; không thay bằng số giả hay kết quả model khác.

**Bảng lịch sử dự báo** có các cột: Nguồn (tên model), Kỳ hạn, Thời gian tạo dự báo, Thời gian/ngày được dự báo, Giá trị dự báo, Thời gian ghi nhận kết quả, Giá trị thực tế, Sai số. Có bộ lọc theo **30 phút / 1 ngày / 7 ngày / 30 ngày** và sắp xếp mới nhất/cũ nhất. “Thời gian ghi nhận kết quả” dùng `evaluated_at` hoặc trường tương đương do Backend trả; khi chưa đối chiếu để trống có giải thích. Phân trang dữ liệu lịch sử, không chỉ hiển thị số dòng của lần tải đầu.

API đang có: `GET /api/v1/forecasts/shadow/latest?horizon=...`. **Backend cần bổ sung phân trang lịch sử và, nếu muốn hiển thị, thời điểm dự kiến có quan trắc thật**. Không suy ra giờ nhận dữ liệu từ kỳ hạn 30 phút/1 ngày/7 ngày/30 ngày.

### Tab Phân loại

Chỉ hiển thị phân loại khi API trả kết quả hợp lệ cho model và thời điểm tương ứng. Nếu chưa có, ghi **Chưa có kết quả phân loại được kiểm chứng**; không suy ra mức an toàn khi bơi/lướt sóng chỉ từ WVHT.

## 5. Trang Ma trận tương quan

Giữ chức năng S05. Dùng tên chỉ số và chú giải dễ hiểu, cho biết khoảng dữ liệu, số cặp hợp lệ và lý do ô trống (thiếu cặp hoặc biến không đổi). Không tự gán hệ số cho trường NOAA không cung cấp.

## 6. Trang K-Means

Giữ S06 và thuật toán K-Means, nhưng đổi nhãn trình bày: **Nhóm điều kiện sóng**, **Số nhóm**, **Đặc trưng của nhóm**, **Số ngày thuộc nhóm**. Giải thích ngắn rằng đây là phân nhóm dữ liệu có tính khám phá, không phải phân loại mức an toàn. Thuật ngữ như centroid, silhouette, Davies–Bouldin chỉ đặt trong phần **Chi tiết kỹ thuật**.

## 7. Trang Đánh giá mô hình

Giữ S08 để xem model registry, trạng thái DRAFT/READY, bộ dữ liệu và khoảng huấn luyện, đánh giá test/backtest/live, so sánh dự báo với quan trắc, MAE/RMSE và baseline giữ nguyên giá trị gần nhất. Không mô tả DRAFT là “chưa huấn luyện”. Hiển thị rõ số mẫu và khoảng đánh giá của từng chỉ số. Nếu Backend chưa trả tên/phiên bản bộ dữ liệu hoặc khoảng huấn luyện, ghi **Chưa được API cung cấp**, không ghi “Chưa có dữ liệu huấn luyện”.

## 8. Trang Chất lượng và nguồn gốc dữ liệu

Giữ S09: độ phủ, QC, dữ liệu thiếu, độ trễ nguồn NOAA, nguồn gốc Bronze → Silver → Gold và lý do từ chối. Khi thiếu dữ liệu hoặc API lỗi phải nêu rõ, không dùng số giả. Có liên kết sang bản ghi liên quan trong trang Tra cứu dữ liệu.

## 9. Trang Quyền Admin

Chỉ người có quyền quản trị mới thấy và gọi được chức năng. Giao diện gồm **ba nút** và **bảng trạng thái**:

1. **Kiểm tra trước khi xóa:** đếm chính xác số dòng/bảng sẽ bị ảnh hưởng, kiểm tra bản sao lưu và tạo bản xem trước có thời hạn.
2. **Xóa dữ liệu trong DB diễn tập:** thao tác xóa theo phạm vi đã xem trước; yêu cầu xác nhận lại và ghi audit. Yêu cầu “xóa hết trong DB” chỉ áp dụng cho **DB diễn tập riêng của Waimea**. Không dùng nút trình duyệt để xóa Cloud SQL production hoặc dữ liệu của dịch vụ khác.
3. **Chạy lại và lấy dữ liệu tới realtime:** tạo job có tiến độ; ưu tiên dùng object GCS đã xác minh bằng hash/generation, chỉ gọi NOAA khi dữ liệu thiếu hoặc thay đổi; chạy lại Bronze → Silver → Gold → các kết quả phụ thuộc. Job phải có checkpoint, idempotency, retry và báo lỗi từng bước.

Bảng trạng thái ghi số dòng của từng bảng/lớp, mốc thời gian mới nhất, GCS đã đối chiếu/chưa đối chiếu, trạng thái job, tiến độ và lỗi. Nút không được báo hoàn tất chỉ vì đã nhận HTTP 202; phải chờ job kết thúc và xác minh số liệu.

**Giới hạn API hiện tại:** `/api/v1/admin/demo/*` chỉ cho xóa **một số bảng Gold theo phạm vi tối đa 30 ngày trong staging**, sau khi xem trước; production từ chối thao tác xóa. Chưa có API “xóa hết DB”, job tái dựng toàn bộ tới realtime, hoặc bảng đếm mọi bảng để nối trực tiếp. Backend phải thiết kế và kiểm thử riêng các chức năng này trước khi bật nút. Không đưa token admin vào frontend; xác thực quản trị cần qua cơ chế máy chủ phù hợp.

## 10. Quy tắc chung và nghiệm thu

- Giữ phong cách hiện tại nhưng ưu tiên nội dung người dùng cần đọc; chi tiết kỹ thuật đặt trong khu vực mở rộng hoặc trang Đánh giá mô hình.
- Mỗi tab có trạng thái **đang tải / không có dữ liệu / lỗi API / có dữ liệu**; không dùng mock data hoặc âm thầm chuyển sang dữ liệu cũ.
- Tất cả thời điểm lưu và trao đổi qua API là UTC có múi giờ; giao diện dự báo hiển thị Việt Nam và Hawaii đúng như nhãn. Không cộng/trừ giờ bằng chuỗi thủ công.
- Bảng có phân trang; biểu đồ lịch sử dùng dữ liệu tổng hợp từ Backend và chỉ nói “toàn bộ lịch sử” khi thực sự bao phủ toàn khoảng chọn. Giá trị thiếu không được nội suy nếu không có quy tắc được công bố.
- Trên desktop và mobile, sidebar có đúng 8 trang theo thứ tự trên, Tổng quan mở trước. S03 không còn là mục riêng và vẫn truy cập được trong Tra cứu dữ liệu.
- Kiểm thử với API thật cho cả trường hợp có dữ liệu, rỗng, lỗi và thiếu quyền; kiểm tra riêng card dự báo 30 phút/1 ngày/7 ngày/30 ngày, bảng ba lớp, chức năng Admin trong staging. Không coi build thành công là nghiệm thu dữ liệu.
- Không thay đổi schema, xóa dữ liệu production, công khai bucket GCS, hoặc đưa credentials vào mã frontend để thực hiện yêu cầu giao diện này.

