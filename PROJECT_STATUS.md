# PROJECT_STATUS — THB Phone Manager

Cập nhật: 2026-10-23 (Phase 0–2 hoàn thành)

## Đã hoàn thành (có backend thật, đã kiểm thử — không chỉ UI minh họa)

- **Phase 0 — Bootstrap**: Next.js 16 (App Router) + TypeScript + Tailwind v4, Prisma 6 + SQLite (dev), git repo mới tại `DU_AN_KHKT` (tách khỏi repo nhầm chỗ ở thư mục home). Node.js LTS 24 cài qua winget.
- **Phase 1 — Auth & RBAC core**:
  - Schema đầy đủ cho toàn bộ mô hình 3 cấp (`prisma/schema.prisma`): User/Role, ClassAssignment, Student, PhoneTransaction (bất biến), TeacherComment, WeeklyReport, ReportSendLog, ReportScheduleConfig, AuditLog, Session.
  - Đăng nhập bằng session tự quản lý (không dùng NextAuth — lý do: NextAuth bắt buộc Credentials provider phải dùng chiến lược JWT, không hỗ trợ session DB có thể thu hồi theo đúng yêu cầu "thu hồi phiên khi đăng xuất"). Token ngẫu nhiên 256-bit, chỉ lưu SHA-256 hash trong DB, cookie httpOnly/sameSite=lax.
  - Mật khẩu hash bằng bcrypt (12 rounds).
  - `middleware.ts`: chặn thô khi chưa có cookie session. **Kiểm tra quyền thật** (role, phạm vi lớp, hết hạn, khóa tài khoản) nằm ở `src/lib/auth/guard.ts`, chạy lại trên mọi Server Component layout và mọi API route — không tin bất kỳ dữ liệu role/classId nào từ client.
  - Seed script (`npm run seed`) tạo dữ liệu **giả** (2 lớp, 10 học sinh, 4 tài khoản cấp 1/2, 1 admin). Mật khẩu admin bắt buộc lấy từ `SEED_ADMIN_PASSWORD` trong `.env`, có validate chống mật khẩu yếu/mặc định — seed sẽ báo lỗi và dừng nếu mật khẩu yếu.
  - Trang đăng nhập macOS-style, không có ô chọn vai trò.
- **Phase 2 — Cấp 1 (Quản lý lớp)**: đầy đủ UI + API thật — tra cứu học sinh theo mã (scoped đúng lớp được phân công), cất/trả điện thoại (kiểm tra trạng thái hợp lệ trước khi ghi), trang "Báo cáo" xem hoạt động hôm nay (view-only, đúng lớp), trang "Tài khoản lớp" + đăng xuất. Bottom nav pill 4 mục đúng yêu cầu.

## Các tệp chính đã tạo

`prisma/schema.prisma`, `prisma/seed.ts`, `middleware.ts`, `src/lib/auth/{constants,session,guard,password}.ts`, `src/lib/{prisma,phone,audit}.ts`, `src/app/login/page.tsx`, `src/app/api/auth/{login,logout}/route.ts`, `src/app/manager/**`, `src/app/api/manager/**`, `src/components/ui/**`, `src/components/nav/**`, `src/components/manager/PhoneStation.tsx`.

## Kết quả kiểm thử thực tế (chạy bằng curl trên dev server, không suy diễn)

| # | Kịch bản | Kết quả |
|---|---|---|
| 1 | Chưa đăng nhập gọi API nghiệp vụ | 401 ✅ |
| 2 | Đăng nhập sai mật khẩu | 401, thông báo chung ✅ |
| 3 | Đăng nhập đúng (manager_12a1) | 200, trả role ✅ |
| 4 | Tra cứu học sinh đúng lớp được phân công | 200, đúng dữ liệu ✅ |
| 5 | Tra cứu học sinh lớp KHÁC | 404 chung (không lộ thông tin) ✅ |
| 6 | Cất điện thoại hợp lệ | 200, trạng thái cập nhật đúng ✅ |
| 7 | Cất lại lần 2 khi đã cất | 409 "giao dịch không hợp lệ" ✅ |
| 8 | Sửa `studentCode` trong body để tác động lớp khác | 404 chung, không ghi được ✅ |
| 9 | Trả điện thoại hợp lệ | 200 ✅ |
| 10 | Teacher gọi API cất điện thoại (API Cấp 1) | 403 ✅ |
| 11 | Đăng xuất | 200, session được revoke trong DB (`revokedAt`) ✅ |
| 12 | Gọi lại API bằng cookie đã đăng xuất | 401 — xác nhận session KHÔNG dùng lại được ✅ |
| 13 | Đăng nhập admin bằng mật khẩu từ `.env` | 200 ✅ |
| 14 | Admin gọi API transaction (API chỉ dành MANAGER) | 403 — đúng thiết kế, Cấp 3 không trực tiếp cất/trả ✅ |

`npm run build` pass, `npm run dev` chạy ổn định. Chưa chạy bộ test tự động (Vitest) có hệ thống — các test trên là kiểm thử thủ công qua curl, sẽ được chuyển thành test case tự động ở Phase 6.

## Chưa hoàn thiện

- **Cấp 2 (Giáo viên)**: chưa có UI/API (dashboard lớp, danh sách học sinh, nhận xét, xem báo cáo).
- **Cấp 3 (Quản trị)**: chưa có UI/API (dashboard toàn trường, quản lý lớp/học sinh/tài khoản, nhật ký, duyệt báo cáo).
- **Luồng báo cáo cuối tuần**: schema đã có, chưa có logic tạo dự thảo/duyệt/gửi.
- **Test suite tự động (Vitest)**: chưa viết — mục VI/VII của yêu cầu sẽ được chuyển thành test case chạy bằng `npm test`.
- **README.md / CHANGELOG.md**: chưa cập nhật (sẽ làm cùng lúc với Phase 7).
- Repo git cũ ở `C:\Users\NGOC BAO` (home dir) vẫn còn tồn tại — chưa xử lý, đang chờ quyết định của bạn.

## Rủi ro

- `cookies()`/session dùng Node.js runtime — middleware chỉ kiểm tra thô (có cookie hay không) vì Edge runtime không chạy được Prisma/SQLite; kiểm tra quyền thật nằm ở layer sau. Đây là thiết kế có chủ đích, không phải lỗ hổng, nhưng cần nhớ khi thêm route mới: **mọi route/layout mới đều phải tự gọi `requireUser`/`requireRole`/`requireClassAccess`**, không được dựa vào middleware.
- SQLite dùng cho dev/demo — khi triển khai thật với nhiều người dùng đồng thời nên chuyển sang PostgreSQL (chỉ cần đổi `provider` trong `schema.prisma`, logic không đổi).
- Prisma 8 (RC) bị gỡ xuống Prisma 6 (ổn định) do CLI 8 thay đổi hoàn toàn quy trình migrate và không khớp với `@prisma/client` 7 đã cài — cần tránh `npm update` tự động nâng Prisma lên 8 cho đến khi bản ổn định chính thức ra mắt và được kiểm tra lại.

## Việc cần bạn quyết định

1. Repo git cũ ở `C:\Users\NGOC BAO` (home dir, chỉ có 1 file README 28 bytes không liên quan) — có muốn tôi xóa `.git` đó không, hay để nguyên?
2. Khi triển khai thật, báo cáo cuối tuần sẽ gửi qua kênh nào (email SMTP thật, hay chỉ cần chế độ xem trước là đủ cho bản nộp KHKT)?

## 3 việc tiếp theo

1. Xây Cấp 2 (Giáo viên): dashboard lớp, danh sách/lọc học sinh, nhận xét, xem báo cáo cuối tuần của lớp mình.
2. Xây Cấp 3 (Quản trị): dashboard toàn trường, quản lý lớp/học sinh/tài khoản, nhật ký kiểm toán.
3. Luồng báo cáo cuối tuần (tạo dự thảo → preview → duyệt/hoãn/hủy → ghi log gửi) + bộ test Vitest cho toàn bộ ma trận phân quyền.
