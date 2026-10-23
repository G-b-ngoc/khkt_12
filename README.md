# THB Phone Manager

Hệ thống quản lý cất/trả điện thoại học sinh với mô hình phân quyền 3 cấp:
**Cấp 1 — Quản lý lớp**, **Cấp 2 — Giáo viên chủ nhiệm**, **Cấp 3 — Quản trị viên**.

Trạng thái triển khai chi tiết: xem [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

## Cài đặt & chạy thử

```bash
npm install
cp .env.example .env   # rồi điền SESSION_SECRET và SEED_ADMIN_PASSWORD (mật khẩu mạnh, không dùng mặc định)
npx prisma migrate dev # tạo SQLite dev.db theo schema
npm run seed            # tạo dữ liệu demo (học sinh/lớp/tài khoản GIẢ)
npm run dev              # http://localhost:3000
```

Chạy test tự động (yêu cầu `npm run dev` đang chạy ở terminal khác, vì test tích hợp gọi HTTP thật):

```bash
npm test
```

Tài khoản demo sau khi seed (chỉ dùng cho môi trường phát triển/thử nghiệm — **đổi mật khẩu trước khi dùng dữ liệu thật**):

| Vai trò | Username | Password | Phạm vi |
|---|---|---|---|
| Cấp 1 | `manager_12a1` | `Demo@123` | Lớp 12A1 |
| Cấp 1 | `manager_12a2` | `Demo@123` | Lớp 12A2 |
| Cấp 2 | `teacher_12a1` | `Demo@123` | Lớp 12A1 |
| Cấp 2 | `teacher_12a2` | `Demo@123` | Lớp 12A2 |
| Cấp 3 | `admin` | giá trị `SEED_ADMIN_PASSWORD` trong `.env` | Toàn trường |

## Tạo tài khoản quản trị an toàn khi triển khai thật

Không bao giờ dùng mật khẩu admin mặc định/dễ đoán ở môi trường thật:

1. Đặt `SEED_ADMIN_PASSWORD` trong `.env` thành một mật khẩu ngẫu nhiên, mạnh (ví dụ sinh bằng `openssl rand -base64 18`), **không commit file `.env`**.
2. Chạy `npm run seed` một lần trên môi trường đó (seed sẽ từ chối chạy nếu mật khẩu yếu/mặc định).
3. Đăng nhập bằng tài khoản `admin`, vào trang Tài khoản → đổi mật khẩu ngay.
4. Từ đó, mọi tài khoản cấp 1/cấp 2 khác đều do admin tạo thủ công trong trang quản trị — hệ thống không có chức năng tự đăng ký.

## Ba cấp phân quyền

- **Cấp 1 — Quản lý lớp**: trạm cất/trả điện thoại tối giản, chỉ thao tác trên lớp được phân công. Giao diện bottom nav pill 4 mục.
- **Cấp 2 — Giáo viên chủ nhiệm**: theo dõi lớp, xem lịch sử cất/trả (chỉ xem), viết/cập nhật nhận xét, xem báo cáo cuối tuần đã gửi cho lớp mình. Sidebar (desktop) / bottom nav (mobile), 5 mục.
- **Cấp 3 — Quản trị viên**: dashboard toàn trường, quản lý lớp/học sinh/tài khoản, nhật ký kiểm toán, và khu vực "Hòm thư" để tạo, duyệt, gửi/hoãn/hủy báo cáo cuối tuần — chỉ Cấp 3 mới phát hành được báo cáo tổng hợp.

Chi tiết tiến độ, kết quả test, và các việc còn thiếu: xem [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

## Kiến trúc tóm tắt

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**, UI theo phong cách macOS (title bar 3 nút màu, card bo góc, pill nav nổi).
- **Prisma + SQLite** cho dev/demo — đổi `provider` trong `prisma/schema.prisma` sang `postgresql` khi triển khai thật, không cần đổi logic ứng dụng.
- **Xác thực tự quản lý** (không dùng NextAuth, xem lý do trong `PROJECT_STATUS.md`): session token ngẫu nhiên, chỉ lưu hash trong DB, có thể thu hồi ngay khi đăng xuất hoặc khi admin khóa tài khoản.
- **Mọi kiểm tra quyền chạy ở backend** (`src/lib/auth/guard.ts`), theo đúng đối tượng dữ liệu (classId thực tế), không chỉ theo tên vai trò hay ẩn/hiện ở UI.

## Database production

Đổi sang PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
rồi `DATABASE_URL="postgresql://..."` trong `.env` và chạy lại `npx prisma migrate dev`.
