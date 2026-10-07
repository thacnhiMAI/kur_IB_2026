# Bản vá giao diện và đề xuất — 07/10/2026

## Áp dụng

1. Dừng Next.js, sao lưu các file hiện tại.
2. Chép toàn bộ thư mục `src`, `scripts`, `docs` trong ZIP vào `D:\lab\Kur_IB`, giữ nguyên cấu trúc và ghi đè các file trùng tên.
3. Chạy `npx tsc --noEmit` và ba kiểm tra dưới đây, rồi `npm run dev`.
4. Nếu CSS cũ vẫn xuất hiện: dừng server, xóa thư mục build `.next`, khởi động lại và nhấn Ctrl+F5.

Không cần migrate/seed, không cần thêm biến môi trường, không cài mô hình Python hoặc GPU.
Bản vá được tạo từ mã hiện tại trên Google Drive; giữ bản vá Google login và OCR trước đó.
Nếu laptop có chỉnh sửa riêng, dùng file `.patch` để xem khác biệt trước khi chép đè.

## Sáu thay đổi

- Books/authors/genres/import sử dụng cùng biến màu theme, font tiêu đề, bề mặt, đường viền và ô nhập. Import chỉ tô sáng tab «Импорт».
- Nút обновить có trạng thái chờ, mỗi lần cập nhật ghi snapshot mới và hiển thị giờ cập nhật. Toàn bộ sách phù hợp được giữ; hiển thị thêm từng 25 sách.
- Mèo đọc sách SVG ở khoảng trống phía trên sidebar: bấm để lật trang. Hỗ trợ bàn phím, theme và giảm chuyển động. Sách đóng khi thu gọn, sách mở khi mở rộng.
- Hai khung sách animation của đăng nhập và đăng ký được mở rộng trong phần dưới panel, tránh đè lên đoạn giới thiệu.
- Ô tìm kiếm desktop mở rộng giới hạn từ 530 lên 883px; responsive trên màn hình nhỏ.
- Catalog có tối đa 25 sách/trang, nhãn «25 книги / страница». Giữ filter và cursor khi đổi trang.

## Thuật toán đề xuất đang chạy

Đây là mô hình lai nội dung + MLP cá nhân hóa thực sự được huấn luyện, không gọi số điểm ngẫu nhiên là AI. Không có khẳng định đây là thuật toán tốt nhất cho mọi bộ dữ liệu.

Tín hiệu được lấy riêng theo userId:

| Tín hiệu | Mục tiêu học | Độ tin cậy |
|---|---:|---:|
| VIEWED (mở sách) | 0.62 | 0.6 |
| INTERESTED / FINISHED | 0.80 / 0.88 | 1.5 |
| Đang đọc / hoàn thành từ tiến độ | 0.85 / 0.90 | 2–3 |
| Yêu thích | 0.98 | 4 |
| Review 1–5 sao | (rating − 1) / 4 | 6 |
| Sách chưa tương tác được lấy mẫu | 0.15 | 0.25 |

Lượt mở trang sách được ghi vào database cho người đã đăng nhập, với cửa sổ chống lặp 10 phút; tôn trọng tùy chọn `rememberRecentlyViewed`. Các lượt xem cũ chỉ nằm trong localStorage không được tự ý nhập vào tài khoản hiện tại. Sách vừa bắt đầu ở trang 1 vẫn được tính là đang đọc ngay cả khi phần trăm bị làm tròn về 0.

Review chính thức và review đang chờ duyệt của chính người dùng đều được đọc. Đánh giá tường minh ghi đè tín hiệu yếu hơn. Nhiều lượt mở cùng sách không được nhân lên vô hạn. Rating cao/thấp quyết định dấu của tín hiệu; nội dung review cũng được đưa vào vector văn bản.

1. Mã hóa tên sách, mô tả, tác giả, thể loại và từ trong review thành vector feature hashing 64 chiều, chuẩn hóa L2. Đây là đặc trưng từ vựng, không phải embedding ngữ nghĩa của LLM.
2. Tổng có trọng số của tín hiệu tích cực/tiêu cực tạo vector sở thích.
3. Với ít nhất 3 sách đã tương tác: MLP có 130 đầu vào, 12 neuron tanh, 1 đầu ra sigmoid, học 45 epoch với gradient BCE và L2. Toàn bộ tín hiệu đi vào vector sở thích; tối đa 256 sách tương tác (ưu tiên review/yêu thích) và 128 mẫu chưa tương tác được dùng trong bước huấn luyện để giới hạn chi phí CPU. Hạt giống cố định theo userId để kết quả tái lập.
4. Khi lịch sử ít hơn: dùng nội dung + rating để tránh mô hình thiếu dữ liệu. Chưa có lịch sử: giới thiệu danh sách phổ biến theo rating.
5. Lọc phù hợp bằng giao tác giả/thể loại hoặc cosine nội dung ≥ 0.16; các thể loại/tác giả chỉ xuất hiện trong review thấp được hạn chế. Điểm cá nhân phối hợp nội dung 70% và MLP 30%.
6. Sắp tất cả sách phù hợp theo rating giảm dần; điểm cá nhân và số lượt đánh giá là tiêu chí phụ. Chưa có rating được đặt cuối. Sách yêu thích/đang đọc/đã xong/đã review được dùng làm tín hiệu và không được lặp lại như gợi ý mới.

Điểm «Совпадение … / 100» là chỉ số xếp hạng nội bộ, không phải xác suất được hiệu chuẩn. Rating hiển thị lấy từ `Book.ratingAverage` trong database.

Bấm cập nhật mà không có tương tác hoặc metadata mới có thể giữ nguyên kết quả: engine có tính tái lập, không đảo sách ngẫu nhiên. Nút cập nhật vẫn tính lại dữ liệu và ghi giờ mới. Có thể kiểm tra bằng cách đánh dấu yêu thích ở thể loại khác hoặc thêm review rồi cập nhật.

Provider OpenAI/GigaChat vẫn có thể bổ sung phần tóm tắt, nhưng không được ghi đè danh sách đầy đủ bằng vài gợi ý của LLM. Tác vụ nền được giữ bởi `after()` của Next.js.

## Nghiên cứu và giới hạn

- Neural Collaborative Filtering: https://arxiv.org/abs/1708.05031
- LightGCN: https://arxiv.org/abs/2002.02126

NCF/LightGCN là các hướng collaborative filtering khi có đủ nhiều người dùng và lịch sử tương tác. Bản này chọn MLP nội dung cá nhân vì có thể chạy ngay trên laptop, không cần tập huấn luyện toàn hệ thống hoặc GPU. Đây không phải triển khai LightGCN.

Để chọn thuật toán tốt nhất cho dữ liệu thực cần đánh giá theo thời gian: train trên lịch sử trước mốc, test trên tương tác sau mốc; đo Recall@25, NDCG@25, coverage và chất lượng cold-start, đối chiếu với baseline rating/nội dung. Không dùng review tương lai trong train. Chưa có database thật nên chưa thể báo chất lượng này.

## Kiểm tra

```powershell
node scripts/test-personalized-recommendations.cjs
node scripts/test-catalog-and-signals.cjs
node scripts/test-recommendation-refresh.cjs
npx tsc --noEmit
```

Đã kiểm tra TypeScript trên các module liên quan với Prisma Client sinh từ schema hiện tại; ba bộ hồi quy dùng mocks, không đụng database. Bản xem trước dùng component thật với mock navigation/API: sáng/tối, tương tác mèo, thu gọn/mở rộng, search 883px, không tràn ở 390px.

Chưa chạy toàn bộ Next.js production build hoặc kiểm thử với database và dữ liệu người dùng thực trên laptop. Ảnh preview là môi trường kiểm tra, không phải ảnh chụp website laptop.
