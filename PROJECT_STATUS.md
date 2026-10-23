# PROJECT_STATUS — THB Phone Manager

Cập nhật: 2026-10-23 (Phase 0–6 hoàn thành: đủ 3 cấp phân quyền + báo cáo cuối tuần + test tự động)

## Đã hoàn thành (có backend thật, đã kiểm thử thật — không phải UI minh họa)

### Phase 0–1 — Hạ tầng & xác thực
- Next.js 16 (App Router) + TypeScript + Tailwind v4, Prisma 6 + SQLite (dev), git repo riêng tại `DU_AN_KHKT`.
- Session tự quản lý (không dùng NextAuth vì Credentials provider của NextAuth bắt buộc chiến lược JWT, không hỗ trợ revoke qua DB session đúng yêu cầu). Token 256-bit, chỉ lưu SHA-256 hash, cookie httpOnly.
- Mật khẩu bcrypt (12 rounds). Seed script bắt buộc `SEED_ADMIN_PASSWORD` mạnh, từ chối chạy nếu yếu/mặc định.
- `middleware.ts` chặn thô (chưa đăng nhập); kiểm tra quyền THẬT (role + phạm vi lớp theo dữ liệu, hết hạn, khóa) nằm ở `src/lib/auth/guard.ts`, gọi lại trên **mọi** Server Component layout và **mọi** API route.

### Phase 2 — Cấp 1 (Quản lý lớp)
Tra cứu học sinh theo mã (scoped đúng lớp), cất/trả điện thoại (validate trạng thái trước khi ghi), xem hoạt động hôm nay, tài khoản lớp. Bottom nav pill 4 mục.

### Phase 3 — Cấp 2 (Giáo viên chủ nhiệm)
Dashboard lớp (sidebar macOS desktop / bottom nav mobile), danh sách + tìm kiếm học sinh, trang chi tiết học sinh (lịch sử giao dịch view-only + nhận xét dạng slide-over), trang nhận xét toàn lớp, lịch sử cất/trả view-only có filter ngày (API chặn ghi ở backend, không chỉ ẩn nút), xem báo cáo cuối tuần đã gửi cho lớp mình (không xem được bản nháp/toàn trường). Nav 5 mục.

### Phase 4 — Cấp 3 (Quản trị viên)
Dashboard toàn trường, quản lý lớp (CRUD), quản lý học sinh (thêm/sửa, **archive thay hard-delete khi đã có giao dịch** — có kiểm tra ràng buộc dữ liệu thật), quản lý tài khoản (tạo/khóa/mở khóa/đặt lại mật khẩu/gán lại lớp — khóa và đổi mật khẩu đều **thu hồi session đang mở ngay**), trang nhật ký kiểm toán. Sidebar mở rộng + "Hòm thư" nổi bật.

### Phase 5 — Luồng báo cáo cuối tuần
Tạo bản dự thảo theo lớp + toàn trường (phát hiện học sinh không hoạt động, giao dịch chưa hoàn tất cuối tuần), preview cho Cấp 3, chỉnh nội dung tổng hợp (version tăng mỗi lần sửa), Phê duyệt & Gửi / Hoãn / Hủy, mail adapter (console-preview mặc định — **không bao giờ tuyên bố đã gửi thật khi chưa cấu hình SMTP**, có `isPreviewOnly` rõ ràng trong response), `ReportSendLog`, **chống gửi trùng ở mức DB** (update có điều kiện status != SENT).

### Phase 6 — Test tự động + phát hiện và sửa 1 lỗi nghiêm trọng
- **Lỗi nghiêm trọng tìm thấy khi smoke-test render trang (không phải chỉ test API)**: layout.tsx (Server Component) truyền icon dưới dạng function xuống PillBottomNav/Sidebar (Client Component) — React Server Components không cho serialize function qua ranh giới Server→Client, khiến **toàn bộ 16 trang có nav bị lỗi 500**. `npm run build` KHÔNG phát hiện ra vì build không render các route dynamic. Đã sửa: đổi `NavItem.icon` thành string key, resolve qua registry `ICONS` trong Client Component. Đã re-test lại toàn bộ 18 trang, tất cả trả 200.
- Viết bộ test Vitest (`tests/`): `guard.unit.test.ts` (logic RBAC thuần, không cần DB), `rbac.integration.test.ts` (test tích hợp qua HTTP thật trên dev server), `password.db.test.ts` (xác nhận passwordHash không phải văn bản thuần, đúng định dạng bcrypt).

## Kết quả kiểm thử thực tế

**`npm test` (Vitest): 26/26 PASS** (3 file test). Yêu cầu `npm run dev` đang chạy khi test tích hợp (đã ghi rõ trong code test).

**`npm run build`: PASS**, không lỗi TypeScript.

**Smoke test thủ công bằng curl — toàn bộ 18 route trang đều trả 200** sau khi sửa lỗi RSC nêu trên: `/login`, 4 trang `/manager/*`, 6 trang `/teacher/*` (gồm `/teacher/students/[id]`), 6 trang `/admin/*` (gồm `/admin/reports/[id]`).

**Ma trận phân quyền đã kiểm thử thật (tự động hóa trong `tests/rbac.integration.test.ts`)**:

| Kịch bản (theo mục VI/VII yêu cầu gốc) | Kết quả |
|---|---|
| Chưa đăng nhập không gọi được API nghiệp vụ | ✅ 401 |
| Sai mật khẩu / tài khoản không tồn tại → cùng thông báo chung | ✅ |
| Đăng xuất thu hồi session, cookie cũ không dùng lại được | ✅ |
| Cấp 1 cất/trả hợp lệ, cất 2 lần liên tiếp báo giao dịch không hợp lệ | ✅ |
| Cấp 1 không truy cập được học sinh/lớp khác (404 chung, không lộ thông tin) | ✅ |
| Cấp 1 không gọi được API quản trị / sửa hồ sơ học sinh | ✅ 403 |
| Cấp 2 chỉ xem học sinh lớp mình | ✅ |
| Cấp 2 không thực hiện được cất/trả (API chặn, không chỉ ẩn UI) | ✅ 403 |
| Cấp 2 không sửa được danh sách học sinh / duyệt báo cáo toàn trường | ✅ 403 |
| Cấp 2 không xem được lớp không được phân công (thử bằng ID thật của lớp khác) | ✅ 403 |
| Cấp 3 quản lý lớp theo quyền quản trị | ✅ |
| Chỉ Cấp 3 tạo được bản dự thảo / phát hành báo cáo | ✅ |
| Không có endpoint nào cho phép tự nâng quyền | ✅ 403 |
| Mật khẩu không lưu dạng văn bản thuần (kiểm tra trực tiếp trong DB) | ✅ bcrypt hash |
| Khóa tài khoản thu hồi session đang mở ngay lập tức | ✅ (xác nhận thủ công bằng curl, xem lịch sử dưới) |
| Gửi báo cáo 2 lần → lần 2 bị chặn (chống gửi trùng) | ✅ 409 |
| Giáo viên chỉ thấy báo cáo đã **gửi** (status=SENT) của lớp mình, không thấy bản nháp | ✅ |

Các case khóa tài khoản + đăng nhập lại sau khi khóa đã kiểm thử thủ công bằng curl trong phiên làm việc (xem lịch sử terminal), chưa được chuyển thành test Vitest tự động — ghi nhận là việc còn lại.

## Chưa hoàn thiện / giới hạn đã biết

- **Lịch gửi tự động (cron) + danh sách người nhận mặc định theo chính sách**: schema `ReportScheduleConfig` đã có nhưng **chưa có API/UI quản lý** — hiện tại admin phải bấm "Tạo bản dự thảo" thủ công và nhập người nhận thủ công mỗi lần gửi, chưa có lịch tự động chạy theo tuần.
- **Kiểm tra giao diện responsive bằng mắt**: mới kiểm tra bằng HTTP status + viết CSS responsive (Tailwind breakpoints, bottom nav mobile / sidebar desktop) theo đúng thiết kế, **chưa chụp màn hình thật ở độ rộng điện thoại** để xác nhận bố cục — môi trường hiện tại không có công cụ trình duyệt/screenshot.
- **So sánh "chỉ người viết mới sửa được nhận xét" giữa 2 giáo viên CÙNG lớp**: logic đã viết đúng trong code (`comment.authorId !== user.id`) nhưng dữ liệu demo chỉ có 1 giáo viên/lớp nên chưa test được ca này trực tiếp bằng 2 tài khoản khác tác giả cùng lớp.
- **CSRF**: dựa vào cookie `SameSite=Lax` + cùng-origin, chưa có CSRF token riêng — chấp nhận được cho công cụ nội bộ một trường, nên lưu ý nếu mở rộng ra nhiều domain.
- **Tìm kiếm học sinh không phân biệt hoa/thường có dấu**: SQLite's `contains` filter là so khớp nhị phân, không hỗ trợ `mode: "insensitive"` như Postgres — tìm kiếm tiếng Việt có thể cần gõ đúng hoa/thường một phần.
- Repo git cũ ở `C:\Users\NGOC BAO` (home dir) vẫn còn tồn tại — **chưa xử lý, đang chờ quyết định của bạn**.

## Rủi ro

- **Bài học quan trọng đã rút ra**: `npm run build` không đủ để xác nhận trang hoạt động — phải render thật (hoặc ít nhất smoke-test HTTP) mọi route trước khi báo hoàn thành. Đã áp dụng lại cho toàn bộ dự án ở Phase 6.
- SQLite dùng cho dev/demo — triển khai thật nhiều người dùng đồng thời nên chuyển sang PostgreSQL (đổi `provider` trong `schema.prisma`, logic không đổi).
- Prisma 8 (RC) đã bị gỡ xuống Prisma 6 (ổn định) — tránh `npm update` tự động nâng lại Prisma 8 cho tới khi bản ổn định chính thức ra mắt.

## Việc cần bạn quyết định

1. Repo git cũ ở `C:\Users\NGOC BAO` (home dir, chỉ 1 file README 28 bytes không liên quan) — xóa `.git` đó hay để nguyên?
2. Khi triển khai thật: cấu hình SMTP thật (host/port/user/password) hay dùng chế độ xem trước là đủ cho bản nộp KHKT?
3. Có cần xây lịch gửi báo cáo tự động (cron hàng tuần) hay admin bấm tạo dự thảo thủ công mỗi tuần là đủ cho phạm vi đề tài?

## 3 việc tiếp theo

1. (Nếu cần) Xây API/UI cấu hình `ReportScheduleConfig` (lịch cron + người nhận mặc định) để không phải nhập tay mỗi lần.
2. Tự kiểm tra responsive bằng mắt ở độ rộng ~400px cho cả 3 cấp giao diện (cần công cụ trình duyệt/screenshot).
3. Hoàn thiện README/hướng dẫn demo cho buổi báo cáo KHKT (các bước chạy, tài khoản demo, cách trình bày từng cấp phân quyền).
