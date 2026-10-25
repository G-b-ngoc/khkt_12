# Changelog

## [Unreleased]

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
