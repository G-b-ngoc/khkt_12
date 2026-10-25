# PROJECT_STATUS — THB Phone Manager

Cập nhật: 2026-10-25 (Phase 0–8: đủ 3 cấp phân quyền + báo cáo cuối tuần + test tự động + nhập danh sách từ file + Theo dõi toàn trường/điều chỉnh trạng thái)

## Đã hoàn thành (có backend thật, đã kiểm thử thật — không phải UI minh họa)

### Phase 0–1 — Hạ tầng & xác thực
- Next.js 16 (App Router) + TypeScript + Tailwind v4, Prisma 6 + SQLite (dev), git repo riêng tại `DU_AN_KHKT`.
- Session tự quản lý (không dùng NextAuth vì Credentials provider của NextAuth bắt buộc chiến lược JWT, không hỗ trợ revoke qua DB session đúng yêu cầu). Token 256-bit, chỉ lưu SHA-256 hash, cookie httpOnly.
- Mật khẩu bcrypt (12 rounds). Seed script bắt buộc `SEED_ADMIN_PASSWORD` mạnh, từ chối chạy nếu yếu/mặc định.
- `middleware.ts` chặn thô (chưa đăng nhập); kiểm tra quyền THẬT (role + phạm vi lớp theo dữ liệu, hết hạn, khóa) nằm ở `src/lib/auth/guard.ts`, gọi lại trên **mọi** Server Component layout và **mọi** API route.

### Phase 2 — Cấp 1 (Quản lý lớp)
Tra cứu học sinh theo mã (scoped đúng lớp), cất/trả điện thoại (validate trạng thái trước khi ghi), xem hoạt động hôm nay, tài khoản lớp. Bottom nav pill 4 mục.

### Phase 3 — Cấp 2 (Giáo viên chủ nhiệm)
Dashboard lớp (sidebar macOS desktop / bottom nav mobile), danh sách + tìm kiếm học sinh, trang chi tiết học sinh (lịch sử giao dịch view-only + nhận xét dạng slide-over), trang nhận xét toàn lớp, xem báo cáo cuối tuần đã gửi cho lớp mình (không xem được bản nháp/toàn trường). Nav 4 mục.

### Phase 7 — Gộp "Cất điện thoại" + "Trả điện thoại" thành "Theo dõi" (2026-10-25)
Hai mục menu view-only cũ (lịch sử cất riêng / trả riêng, lọc theo ngày) được gộp thành một mục **"Theo dõi"** duy nhất, tái sử dụng lại trang dashboard `/teacher` có sẵn (không tạo route mới):
- API mới `/api/teacher/overview?date=YYYY-MM-DD` (TEACHER-only, lọc theo đúng `classId` được phân công qua `getAssignedClassIds` — không nhận classId từ client) trả về, cho **đúng 1 ngày**, mỗi học sinh của lớp kèm: `checkInStatus` ("Đã cất"/"Chưa ghi nhận cất"), `checkInAt`, `checkOutStatus` ("Đã trả"/"Cần xác minh"/"Chưa áp dụng"), `checkOutAt`, `note`.
- Trạng thái suy ra **chỉ từ `PhoneTransaction` thật trong ngày** (hàm `computeDayPhoneState` ở `src/lib/phone.ts`, cùng logic đã dùng khi phát hiện giao dịch dang dở cho báo cáo cuối tuần ở `src/lib/reports.ts`) — "Cần xác minh" chỉ dùng cho đúng 1 trường hợp có dữ liệu xác nhận (đã cất nhưng chưa thấy lượt trả trong ngày); **không** tự suy diễn "vắng mặt"/"vi phạm"/"được miễn" vì hệ thống chưa lưu các trạng thái này.
- Trang `/teacher`: bảng kiểu Excel (STT, mã HS, họ tên, trạng thái + giờ cất, trạng thái + giờ trả, ghi chú), có cuộn dọc khi lớp đông học sinh; thanh tìm kiếm theo tên/mã chạy hoàn toàn phía client (không gọi lại API khi gõ), không phân biệt hoa/thường và không dấu (`src/lib/search.ts`); bộ lọc theo trạng thái cất/trả; nút làm mới; 5 ô thống kê tính theo đúng tập đã lọc.
- Đã xóa `src/app/teacher/checkin/`, `src/app/teacher/checkout/`, component `TransactionLog` (không còn nơi dùng); **giữ nguyên** bảng `PhoneTransaction`, endpoint `/api/teacher/transactions` (vẫn còn, không bị dùng bởi UI hiện tại nhưng không xóa vì không được yêu cầu xóa API), toàn bộ chức năng Cấp 1/Cấp 3 và quyền ghi chú của Cấp 2.
- Kiểm tra lại: `npx tsc --noEmit` sạch, `npm run lint` sạch, `npm test` 26/26 PASS (yêu cầu nạp `.env` vào shell chạy test, xem lưu ý ở mục kiểm thử dưới). Smoke test thủ công bằng curl: `/teacher/checkin` và `/teacher/checkout` trả 404 (đã gỡ), `/teacher` + 3 trang Cấp 2 còn lại trả 200, `/api/teacher/overview` trả 401 khi chưa đăng nhập, 403 khi gọi bằng tài khoản MANAGER hoặc ADMIN, và chỉ trả về đúng lớp được phân công khi gọi bằng 2 tài khoản TEACHER khác lớp. Toàn bộ route Cấp 1 (`/manager/*`) và Cấp 3 (`/admin/*`) đã test lại, vẫn 200/307 như cũ, không bị ảnh hưởng.
- **Chưa kiểm thử**: chưa viết thêm test Vitest tự động riêng cho `/api/teacher/overview` (mới chỉ xác minh thủ công bằng curl ở trên) — nên coi là việc còn lại nếu muốn test này nằm trong `npm test`. Cũng chưa chụp màn hình thật ở độ rộng điện thoại cho giao diện bảng mới (môi trường hiện tại không có trình duyệt/screenshot, cùng hạn chế đã ghi nhận từ Phase 6).

### Phase 4 — Cấp 3 (Quản trị viên)
Dashboard toàn trường, quản lý lớp (CRUD), quản lý học sinh (thêm/sửa, **archive thay hard-delete khi đã có giao dịch** — có kiểm tra ràng buộc dữ liệu thật), quản lý tài khoản (tạo/khóa/mở khóa/đặt lại mật khẩu/gán lại lớp — khóa và đổi mật khẩu đều **thu hồi session đang mở ngay**), trang nhật ký kiểm toán. Sidebar mở rộng + "Hòm thư" nổi bật.

### Phase 5 — Luồng báo cáo cuối tuần
Tạo bản dự thảo theo lớp + toàn trường (phát hiện học sinh không hoạt động, giao dịch chưa hoàn tất cuối tuần), preview cho Cấp 3, chỉnh nội dung tổng hợp (version tăng mỗi lần sửa), Phê duyệt & Gửi / Hoãn / Hủy, mail adapter (console-preview mặc định — **không bao giờ tuyên bố đã gửi thật khi chưa cấu hình SMTP**, có `isPreviewOnly` rõ ràng trong response), `ReportSendLog`, **chống gửi trùng ở mức DB** (update có điều kiện status != SENT).

### Phase 6 — Test tự động + phát hiện và sửa 1 lỗi nghiêm trọng
- **Lỗi nghiêm trọng tìm thấy khi smoke-test render trang (không phải chỉ test API)**: layout.tsx (Server Component) truyền icon dưới dạng function xuống PillBottomNav/Sidebar (Client Component) — React Server Components không cho serialize function qua ranh giới Server→Client, khiến **toàn bộ 16 trang có nav bị lỗi 500**. `npm run build` KHÔNG phát hiện ra vì build không render các route dynamic. Đã sửa: đổi `NavItem.icon` thành string key, resolve qua registry `ICONS` trong Client Component. Đã re-test lại toàn bộ 18 trang, tất cả trả 200.
- Viết bộ test Vitest (`tests/`): `guard.unit.test.ts` (logic RBAC thuần, không cần DB), `rbac.integration.test.ts` (test tích hợp qua HTTP thật trên dev server), `password.db.test.ts` (xác nhận passwordHash không phải văn bản thuần, đúng định dạng bcrypt).

### Phase 8 — Nhập danh sách học sinh từ file + Theo dõi toàn trường/điều chỉnh trạng thái (2026-10-25)

**A. Nhập danh sách học sinh từ file** (`/admin/classes/import`, ADMIN-only):
- Thêm dependency `xlsx` (SheetJS) — cài từ CDN chính chủ SheetJS (`https://cdn.sheetjs.com/xlsx-0.20.3/...`) thay vì npm registry, vì bản npm mới nhất (`0.18.5`) còn 2 lỗi an ninh (prototype pollution, ReDoS) **chưa có bản vá trên npm** — `npm audit` xác nhận 0 lỗi liên quan tới `xlsx` sau khi đổi nguồn cài.
- Schema mới: `ImportBatch` (trạng thái PENDING → PROCESSING → COMMITTED/FAILED, lưu các dòng đã chuẩn hoá + số liệu) — dùng làm cả "vé xem trước" giữa 2 bước preview/commit lẫn nhật ký nhập.
- Quy trình: chọn/tạo lớp → tải file mẫu/tải file lên (`.xlsx`/`.xls`/`.csv`) → dò cột theo TÊN (không theo vị trí, chấp nhận nhiều cách viết) → xem trước (phân loại MỚI/CẬP NHẬT/THUỘC LỚP KHÁC/TRÙNG MÃ TRONG FILE/THIẾU DỮ LIỆU) → xác nhận → ghi trong 1 `$transaction`.
- Chống xác nhận trùng: chuyển `PENDING → PROCESSING` bằng `updateMany` có điều kiện (giống cơ chế chống gửi báo cáo trùng ở Phase 5) — bấm "Xác nhận" nhiều lần hoặc gửi trùng request chỉ xử lý đúng 1 lần.
- Phân loại lại theo dữ liệu DB **hiện tại** ở cả bước xem trước và bước xác nhận (không tin kết quả xem trước đã cũ) — tránh race condition nếu có nhập khác xảy ra giữa 2 bước.
- Nhật ký: `GET /api/admin/classes/import?classId=` (đọc từ `ImportBatch`) + 1 dòng `AuditLog` (`STUDENT_IMPORT_COMMIT`) mỗi lần xác nhận.

**B. Theo dõi cất/trả toàn trường + điều chỉnh trạng thái** (`/admin/overview`, ADMIN-only):
- Schema mới: `DayStatusAdjustment` (append-only — mỗi lần điều chỉnh là 1 bản ghi MỚI, không update/xoá bản cũ) + enum `DayStatusCode` (6 trạng thái: NOT_RECORDED/CHECKED_IN/CHECKED_OUT/ABSENT/EXEMPTED/NEEDS_VERIFICATION).
- Lib dùng chung `src/lib/overview.ts` (server, có truy vấn DB) + `src/lib/overviewStatus.ts` (type/nhãn/màu, dùng được ở cả client) — API `/api/teacher/overview` (Phase 7) được refactor để gọi lại cùng hàm `getClassesDayOverview`, giảm trùng lặp logic.
- `src/lib/timezone.ts`: mọi mốc ngày/giờ của 2 trang Theo dõi (Cấp 2 + Cấp 3) tính theo **Asia/Ho_Chi_Minh cố định (UTC+7, không DST)** bằng `Intl.DateTimeFormat`, không dùng giờ UTC/giờ máy chủ nữa. Qua đó sửa luôn 1 lỗi đã phát hiện ở Phase 7: ngày mặc định của trang Theo dõi Cấp 2 bị lệch 1 ngày vào khoảng 00:00–06:59 giờ Việt Nam (do trước đó dùng `toISOString().slice(0,10)` — ngày UTC, không phải ngày Việt Nam).
- Điều chỉnh trạng thái: `POST /api/admin/overview/adjust` bắt buộc lý do, lưu `previousStatus`/`newStatus`/lý do/người thực hiện/thời điểm; **không bao giờ sửa `PhoneTransaction` gốc** — đây là lựa chọn thiết kế có chủ đích để giữ nguyên tính bất biến của sổ giao dịch (đã có từ Phase 2, được test ở Phase 6), thay vì thêm khả năng sửa trực tiếp giao dịch gốc.
- Trạng thái hiệu lực hiển thị = bản điều chỉnh **mới nhất** (nếu có) chồng lên trạng thái suy từ giao dịch thật; Cấp 2 xem được kết quả này (read-only, có hiện lý do + người điều chỉnh) để 2 màn hình Theo dõi không lệch nhau.
- Lịch sử điều chỉnh: `GET /api/admin/overview/adjustments` — không có API sửa/xoá (bảo vệ nhật ký).
- Xuất dữ liệu: `GET /api/admin/overview/export` (CSV/`.xlsx`, đúng lớp/ngày/bộ lọc đang xem, chống Excel formula injection bằng tiền tố `'`, giữ mã HS dạng chuỗi, có BOM cho CSV tiếng Việt, ghi `AuditLog` mỗi lần xuất).
- Đã xác nhận bằng test: điều chỉnh trạng thái **không** chạm vào bảng `WeeklyReport` — báo cáo đã tạo/đã gửi giữ nguyên `contentJson`/`contentVersion`/`status` sau khi có điều chỉnh liên quan tới cùng tuần.

## Kết quả kiểm thử thực tế

**`npm test` (Vitest): 44/44 PASS** (4 file test, gồm 1 file mới `tests/import-and-overview.integration.test.ts` — 18 test cho Phase 8). Yêu cầu `npm run dev` đang chạy VÀ biến môi trường trong `.env` (đặc biệt `SEED_ADMIN_PASSWORD`) đã nạp vào shell chạy `npm test` (ví dụ `set -a && source .env && set +a && npm test` trên bash) — nếu thiếu, 2 test liên quan tới đăng nhập admin sẽ fail do gọi API bằng mật khẩu rỗng, không phải lỗi tính năng.

**`npm run build`: PASS** (Turbopack, TypeScript lẫn generate static page đều qua), **`npm run lint`: PASS** không lỗi/cảnh báo.

**Smoke test thủ công bằng curl — toàn bộ route trang (cũ + 2 route mới `/admin/classes/import`, `/admin/overview`) đều trả 200 cho đúng vai trò và 307 (redirect về trang chủ đúng role) cho vai trò khác**: `/login`, 4 trang `/manager/*`, 6 trang `/teacher/*` (gồm `/teacher/students/[id]`), 8 trang `/admin/*` (gồm `/admin/reports/[id]`, `/admin/classes/import`, `/admin/overview`).

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

**Ma trận Phase 8 — đã kiểm thử thật (tự động hóa trong `tests/import-and-overview.integration.test.ts`)**:

| Kịch bản | Kết quả |
|---|---|
| Cấp 1 và Cấp 2 không gọi được API import (preview/commit/template) | ✅ 403 |
| Nhập file `.xlsx` hợp lệ tạo đúng số học sinh mới | ✅ |
| Nhập CSV UTF-8 tiếng Việt, tên cột khác nhau + thứ tự cột đảo ngược vẫn dò đúng | ✅ |
| Thiếu cột bắt buộc → lỗi rõ ràng, không tạo được batch | ✅ 400 |
| Mã HS trùng trong file → chỉ dòng đầu hợp lệ, không tạo trùng | ✅ |
| Mã HS thuộc lớp khác → cảnh báo, KHÔNG tự chuyển lớp (xác nhận lại hồ sơ gốc không đổi) | ✅ |
| Cập nhật học sinh đã có trong CÙNG lớp → giữ nguyên `id` (không mất lịch sử/nhận xét) | ✅ |
| Xác nhận nhập 2 lần cùng batchId → lần 2 bị chặn, không tạo trùng | ✅ 409 |
| Cấp 1/Cấp 2 không gọi được `/api/admin/overview` (xem) và `/adjust` (sửa) | ✅ 403 |
| Cấp 3 chọn lớp + ngày hiển thị đúng danh sách lớp đó | ✅ |
| Dữ liệu nhiều ngày không bị trộn (cất hôm nay không xuất hiện ở hôm qua) | ✅ |
| Thiếu lý do điều chỉnh → không xác nhận được | ✅ 400 |
| Cấp 3 điều chỉnh hợp lệ → Cấp 2 thấy ngay (read-only), lịch sử gốc (điều chỉnh trước) vẫn còn | ✅ |
| Gửi nhiều yêu cầu điều chỉnh đồng thời cho cùng 1 học sinh/ngày → không mất ghi, không hỏng dữ liệu | ✅ |
| Báo cáo cuối tuần đã tạo không bị thay đổi ngầm sau khi có điều chỉnh liên quan | ✅ |
| Xuất CSV đúng lớp/ngày, không lộ dữ liệu lớp khác | ✅ |
| MANAGER/TEACHER không gọi được API xuất dữ liệu | ✅ 403 |

**Chưa chuyển thành test tự động** (đã kiểm tra bằng cách khác, không tự khẳng định đã test tự động):
- "Lỗi giữa lúc lưu không để lại dữ liệu dở dang": không mô phỏng được một lỗi giữa transaction bằng test HTTP đen (cần sửa code để chủ động gây lỗi) — xác nhận bằng đọc code: bước ghi (`createMany`/`update` học sinh) nằm trong `prisma.$transaction`, lỗi bất kỳ sẽ rollback toàn bộ, batch chuyển sang `FAILED` chứ không có gì được ghi nửa vời.
- Giao diện bảng Theo dõi/nhập file trên màn hình điện thoại thật: môi trường hiện tại không có trình duyệt/công cụ screenshot (hạn chế đã ghi nhận từ Phase 6/7) — mới viết CSS responsive (cuộn ngang có kiểm soát, lưới thống kê tự xuống dòng ở màn hình nhỏ) theo đúng thiết kế, chưa xác nhận bằng mắt.
- Bộ lọc/tìm kiếm/sắp xếp phía client của trang `/admin/overview` (JS chạy trong trình duyệt): chỉ xác nhận gián tiếp qua API `export` (có áp dụng cùng tham số `q`/`status`) và qua đọc code — không có test tự động chạy trình duyệt thật (không có Playwright/Cypress trong dự án).

## Chưa hoàn thiện / giới hạn đã biết

- **Lịch gửi tự động (cron) + danh sách người nhận mặc định theo chính sách**: schema `ReportScheduleConfig` đã có nhưng **chưa có API/UI quản lý** — hiện tại admin phải bấm "Tạo bản dự thảo" thủ công và nhập người nhận thủ công mỗi lần gửi, chưa có lịch tự động chạy theo tuần.
- **Kiểm tra giao diện responsive bằng mắt**: mới kiểm tra bằng HTTP status + viết CSS responsive (Tailwind breakpoints, bottom nav mobile / sidebar desktop) theo đúng thiết kế, **chưa chụp màn hình thật ở độ rộng điện thoại** để xác nhận bố cục — môi trường hiện tại không có công cụ trình duyệt/screenshot.
- **So sánh "chỉ người viết mới sửa được nhận xét" giữa 2 giáo viên CÙNG lớp**: logic đã viết đúng trong code (`comment.authorId !== user.id`) nhưng dữ liệu demo chỉ có 1 giáo viên/lớp nên chưa test được ca này trực tiếp bằng 2 tài khoản khác tác giả cùng lớp.
- **CSRF**: dựa vào cookie `SameSite=Lax` + cùng-origin, chưa có CSRF token riêng — chấp nhận được cho công cụ nội bộ một trường, nên lưu ý nếu mở rộng ra nhiều domain.
- **Tìm kiếm học sinh không phân biệt hoa/thường có dấu**: SQLite's `contains` filter là so khớp nhị phân, không hỗ trợ `mode: "insensitive"` như Postgres — tìm kiếm tiếng Việt có thể cần gõ đúng hoa/thường một phần.
- Repo git cũ ở `C:\Users\NGOC BAO` (home dir) vẫn còn tồn tại — **chưa xử lý, đang chờ quyết định của bạn**.
- **Nhập danh sách**: chưa có "chế độ đồng bộ" (đánh dấu ngừng hoạt động học sinh không còn trong file mới) — theo đúng yêu cầu gốc, import hiện tại chỉ tạo mới/cập nhật, không bao giờ tự xoá/archive ai. Nếu cần chế độ đồng bộ có cảnh báo, đây là việc làm thêm, chưa xây.
- **Điều chỉnh trạng thái "sửa giao dịch sai"**: đã cài đặt dưới dạng một bản ghi điều chỉnh (`DayStatusAdjustment`) đè lên trạng thái hiển thị, **không** thêm API sửa trực tiếp vào `PhoneTransaction` — quyết định có chủ đích để giữ sổ giao dịch bất biến (invariant cốt lõi của hệ thống, đã có từ đầu và được test). Nếu về sau thật sự cần sửa giờ/loại của 1 giao dịch cụ thể (không chỉ đổi trạng thái hiển thị theo ngày), cần thiết kế riêng một luồng "giao dịch điều chỉnh" ghi thêm cặp bù trừ — chưa làm trong lần này.
- Batch nhập dữ liệu bị lỗi đúng lúc xác nhận (ví dụ tắt máy chủ giữa lúc ghi) có thể bị kẹt ở trạng thái `PROCESSING` thay vì `FAILED` — không chặn gì (admin chỉ cần tải lại file và tạo batch mới), nhưng chưa có cơ chế tự dọn batch kẹt.
- Lọc theo **khoảng ngày** (yêu cầu gốc Phần B có đề cập) chưa làm — chủ động chỉ làm chọn 1 ngày cụ thể, vì mô hình "1 dòng/học sinh/1 ngày" của bảng Theo dõi xung đột với việc gộp nhiều ngày vào 1 trạng thái (yêu cầu gốc cũng cảnh báo không được trộn dữ liệu nhiều ngày).
- Bảng Theo dõi toàn trường chưa phân trang — tải toàn bộ danh sách lớp trong 1 lần gọi API rồi lọc/sắp xếp phía client; phù hợp với quy mô lớp hiện tại (khoảng 40–50 học sinh/lớp) nhưng sẽ cần phân trang nếu có lớp rất đông.

## Rủi ro

- **Bài học quan trọng đã rút ra**: `npm run build` không đủ để xác nhận trang hoạt động — phải render thật (hoặc ít nhất smoke-test HTTP) mọi route trước khi báo hoàn thành. Đã áp dụng lại cho toàn bộ dự án ở Phase 6.
- SQLite dùng cho dev/demo — triển khai thật nhiều người dùng đồng thời nên chuyển sang PostgreSQL (đổi `provider` trong `schema.prisma`, logic không đổi).
- Prisma 8 (RC) đã bị gỡ xuống Prisma 6 (ổn định) — tránh `npm update` tự động nâng lại Prisma 8 cho tới khi bản ổn định chính thức ra mắt.
- `prisma/dev.db` là CSDL dev dùng chung qua nhiều phiên làm việc/test thủ công — trong lúc kiểm thử Phase 8 phát hiện học sinh demo `HS1203` (lớp 12A1) không còn tồn tại trong DB (không phải do code Phase 8 xoá — đã xác nhận bằng cách đọc trực tiếp DB trước khi chạy test liên quan), nhiều khả năng còn sót lại từ một lần test tay/API ở phiên trước. Không ảnh hưởng tới tính đúng của tính năng (test đã đổi sang dùng `HS1205`), nhưng nếu muốn dữ liệu demo sạch như seed ban đầu, chạy lại `npx prisma migrate reset` + `npm run seed`.
- `xlsx` (SheetJS) đã cài từ CDN chính chủ thay vì npm registry để tránh 2 lỗi an ninh chưa có bản vá trên npm — khi `npm install` lại từ đầu, nếu môi trường chặn tải từ `cdn.sheetjs.com` thì bước cài sẽ lỗi; cần cho phép domain này hoặc đổi sang nguồn khác.

## Việc cần bạn quyết định

1. Repo git cũ ở `C:\Users\NGOC BAO` (home dir, chỉ 1 file README 28 bytes không liên quan) — xóa `.git` đó hay để nguyên?
2. Khi triển khai thật: cấu hình SMTP thật (host/port/user/password) hay dùng chế độ xem trước là đủ cho bản nộp KHKT?
3. Có cần xây lịch gửi báo cáo tự động (cron hàng tuần) hay admin bấm tạo dự thảo thủ công mỗi tuần là đủ cho phạm vi đề tài?

## 3 việc tiếp theo

1. Tự kiểm tra responsive bằng mắt ở độ rộng ~400px cho toàn bộ giao diện, đặc biệt 2 trang mới `/admin/classes/import` và `/admin/overview` (cần công cụ trình duyệt/screenshot).
2. (Nếu cần) Xây API/UI cấu hình `ReportScheduleConfig` (lịch cron + người nhận mặc định) để không phải nhập tay mỗi lần — vẫn chưa làm, không nằm trong phạm vi Phase 8.
3. Viết thêm test mô phỏng lỗi giữa transaction nhập file (ví dụ throw lỗi có kiểm soát trong 1 bản build test riêng) nếu muốn có bằng chứng tự động cho "không để lại dữ liệu dở dang", thay vì chỉ xác nhận bằng đọc code như hiện tại.
