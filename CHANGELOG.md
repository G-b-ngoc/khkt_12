# Changelog

## [Unreleased]

### Added
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
