# Changelog

## [Unreleased]

### Added — Nhập danh sách học sinh từ file (Cấp 3)
- Mục mới **Quản lý lớp → Nhập danh sách từ file** (`/admin/classes/import`, ADMIN-only): chọn lớp có sẵn hoặc tạo lớp mới (tái dùng API `POST /api/admin/classes` có sẵn), tải file mẫu `.xlsx`, tải lên `.xlsx`/`.xls`/`.csv` (UTF-8), xem trước kết quả phân loại từng dòng (mới / cập nhật / thuộc lớp khác / trùng mã trong file / thiếu dữ liệu) rồi mới xác nhận ghi vào DB.
- Dò cột theo TÊN cột (không theo vị trí) — `src/lib/importStudents.ts::detectColumns` nhận nhiều cách viết khác nhau của "Mã HS"/"Họ và tên" (kể cả tiếng Anh), không phân biệt hoa/thường/dấu.
- API mới: `GET/POST /api/admin/classes/import/preview` (xem trước + tạo `ImportBatch`), `POST /api/admin/classes/import/commit` (ghi thật, transaction, chống xác nhận trùng bằng update có điều kiện `PENDING → PROCESSING`), `GET /api/admin/classes/import/template` (file mẫu), `GET /api/admin/classes/import` (nhật ký các lần nhập theo lớp).
- Quy tắc dữ liệu: mã HS là định danh duy nhất; trùng mã trong CÙNG lớp → cập nhật họ tên (giữ nguyên `id`, không mất lịch sử/nhận xét cũ); trùng mã ở lớp KHÁC → cảnh báo, không tự chuyển lớp; trùng mã trong file → chỉ dòng đầu hợp lệ; không bao giờ tự xóa học sinh không có trong file. Phân loại lại theo dữ liệu DB hiện tại ở cả 2 bước (xem trước lẫn xác nhận) để không dùng dữ liệu đã cũ.
- Nhật ký import: bảng `ImportBatch` (trạng thái, số dòng, số tạo/cập nhật/bỏ qua, người thực hiện, thời gian) + 1 dòng `AuditLog` (`STUDENT_IMPORT_COMMIT`) mỗi lần xác nhận — không ghi mật khẩu/token.

### Added — Theo dõi cất/trả toàn trường + điều chỉnh trạng thái (Cấp 3)
- Mục mới **Theo dõi** trong sidebar/bottom-nav Cấp 3 (`/admin/overview`): chọn lớp bất kỳ + 1 ngày cụ thể, bảng kiểu Excel (STT, mã HS, họ tên, trạng thái/giờ cất, trạng thái/giờ trả, ghi chú), tìm kiếm không dấu, lọc theo 6 trạng thái hiệu lực, sắp xếp theo tên/mã/trạng thái/giờ, 7 ô thống kê theo đúng bộ lọc đang áp dụng, nút làm mới, xuất CSV/Excel.
- 6 trạng thái hiệu lực: Chưa ghi nhận cất, Đã cất, Đã trả, Vắng mặt, Được miễn/có lý do hợp lệ, Cần xác minh — chỉ gán "Vắng mặt"/"Được miễn" khi Cấp 3 **chủ động xác nhận** qua hộp thoại điều chỉnh, không bao giờ tự suy diễn từ việc thiếu giao dịch.
- Điều chỉnh trạng thái: `POST /api/admin/overview/adjust` (ADMIN-only, bắt buộc lý do) tạo bản ghi **MỚI** trong bảng `DayStatusAdjustment` (append-only) — không sửa/xóa `PhoneTransaction` gốc hay bản điều chỉnh trước đó. Trạng thái hiệu lực hiển thị = bản điều chỉnh mới nhất (nếu có), ngược lại suy từ giao dịch thật trong ngày.
- Lịch sử điều chỉnh xem tại `GET /api/admin/overview/adjustments` (lọc theo lớp/học sinh/ngày) — không có API sửa/xóa, bảo vệ tính toàn vẹn nhật ký.
- Xuất dữ liệu: `GET /api/admin/overview/export` (CSV hoặc `.xlsx`, đúng lớp/ngày/bộ lọc đang xem, chống Excel formula injection, giữ mã HS dạng chuỗi, ghi `AuditLog` mỗi lần xuất).
- Cấp 2 (`/api/teacher/overview`, trang `/teacher`) nay cũng hiển thị (chỉ xem) kết quả điều chỉnh của Cấp 3 nếu có, để không lệch thông tin giữa 2 màn hình Theo dõi.
- Giờ/ngày hiển thị thống nhất theo **Asia/Ho_Chi_Minh** (`src/lib/timezone.ts`) thay vì giờ UTC/giờ máy chủ — sửa luôn một lỗi lệch ngày đã phát hiện ở trang Theo dõi Cấp 2 (ngày mặc định có thể sai lệch 1 ngày vào đầu giờ sáng).
- Báo cáo cuối tuần **đã gửi không bị ảnh hưởng**: điều chỉnh trạng thái chỉ ghi vào `DayStatusAdjustment`, không chạm tới `WeeklyReport` — tính bất biến của báo cáo đã có từ trước (API chỉnh sửa báo cáo đã chặn khi `status === SENT`) tiếp tục được giữ, có test xác nhận.

### Changed
- Cấp 2 (Giáo viên chủ nhiệm): gộp 2 mục menu "Cất điện thoại" / "Trả điện thoại" (chỉ xem) thành một mục duy nhất **"Theo dõi"**, tái sử dụng trang dashboard `/teacher` có sẵn thay vì tạo trang mới. Trang này nay hiển thị bảng tổng hợp cất/trả theo lớp được phân công, theo đúng 1 ngày được chọn (không trộn giao dịch nhiều ngày): mã học sinh, họ tên, trạng thái + giờ cất, trạng thái + giờ trả, ghi chú/cần xác minh — cùng thanh tìm kiếm theo tên/mã (không dấu, không phân biệt hoa/thường, lọc ngay khi gõ, không gọi lại API), lọc theo trạng thái cất/trả, nút làm mới và 5 ô thống kê nhanh tính theo đúng bộ lọc đang áp dụng.
- Xóa 2 trang `/teacher/checkin`, `/teacher/checkout` và component `TransactionLog` không còn dùng tới sau khi gộp (không xóa API/dữ liệu giao dịch — `PhoneTransaction` và endpoint `/api/teacher/transactions` vẫn giữ nguyên).

### Added
- API mới `/api/teacher/overview` (TEACHER-only, lọc theo đúng `classId` được phân công — kiểm tra ở backend, không tin tham số từ client): trả về trạng thái cất/trả suy ra từ dữ liệu giao dịch thật trong ngày cho từng học sinh của lớp.
- Hàm `computeDayPhoneState` (`src/lib/phone.ts`) suy luận trạng thái "Đã cất/Chưa ghi nhận cất" và "Đã trả/Cần xác minh/Chưa áp dụng" chỉ từ giao dịch thật đã ghi nhận trong ngày — không suy diễn vắng mặt/vi phạm/miễn khi chưa có dữ liệu xác nhận.
- Helper tìm kiếm không dấu `src/lib/search.ts` dùng chung cho tìm kiếm phía client.
- Khởi tạo dự án Next.js 16 + TypeScript + Tailwind v4 + Prisma 6 (SQLite dev).
- Mô hình phân quyền 3 cấp (MANAGER/TEACHER/ADMIN) với session tự quản lý, có thể thu hồi khi đăng xuất hoặc khi admin khóa/đổi mật khẩu tài khoản.
- Trang đăng nhập macOS-style, không chọn vai trò ở client — vai trò lấy từ tài khoản đã xác thực ở server.
- Cấp 1 (Quản lý lớp): tra cứu học sinh, cất/trả điện thoại, xem hoạt động hôm nay, tài khoản lớp — bottom nav pill 4 mục.
- Cấp 2 (Giáo viên chủ nhiệm): dashboard lớp, danh sách/tìm kiếm học sinh, chi tiết học sinh với lịch sử giao dịch view-only, nhận xét (viết/cập nhật, slide-over), lịch sử cất/trả view-only có filter ngày, xem báo cáo cuối tuần đã gửi cho lớp mình. Sidebar desktop + bottom nav mobile, 5 mục.
- Cấp 3 (Quản trị viên): dashboard toàn trường, quản lý lớp/học sinh (archive thay hard-delete khi đã có giao dịch)/tài khoản (tạo, khóa, đặt lại mật khẩu, gán lại lớp), nhật ký kiểm toán, "Hòm thư" báo cáo cuối tuần (tạo dự thảo, preview, chỉnh nội dung tổng hợp, phê duyệt & gửi/hoãn/hủy, chống gửi trùng, mail adapter preview/SMTP).
- Seed script tạo dữ liệu demo giả, bắt buộc mật khẩu admin mạnh qua biến môi trường.
- Bộ test Vitest (`npm test`): unit test RBAC thuần + test tích hợp qua HTTP thật + test xác nhận mật khẩu không lưu dạng thuần.

### Fixed
- Lỗi nghiêm trọng: layout truyền icon dạng function từ Server Component sang Client Component (PillBottomNav/Sidebar) khiến toàn bộ 16 trang có nav lỗi 500 — không bị `npm run build` phát hiện vì build không render route dynamic. Sửa bằng cách truyền tên icon (string) và resolve qua registry ở Client Component. Phát hiện qua smoke-test render thật, không chỉ test API.
