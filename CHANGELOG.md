# Changelog

## [Unreleased]

### Added
- Khởi tạo dự án Next.js 16 + TypeScript + Tailwind v4 + Prisma 6 (SQLite dev).
- Mô hình phân quyền 3 cấp (MANAGER/TEACHER/ADMIN) với session tự quản lý, có thể thu hồi khi đăng xuất.
- Trang đăng nhập macOS-style, không chọn vai trò ở client — vai trò lấy từ tài khoản đã xác thực ở server.
- Cấp 1 (Quản lý lớp): tra cứu học sinh, cất/trả điện thoại, xem hoạt động hôm nay, tài khoản lớp — bottom nav pill 4 mục.
- Seed script tạo dữ liệu demo giả, bắt buộc mật khẩu admin mạnh qua biến môi trường.
