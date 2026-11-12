# PROJECT_STATUS — EduPhone Manager

Cập nhật: 2026-11-12 (Phase 0–11: đủ 3 cấp phân quyền + báo cáo cuối tuần + test tự động + nhập danh sách từ file + Theo dõi toàn trường/điều chỉnh trạng thái (Cấp 3) + xuất báo cáo Cấp 2 + nâng cấp giao diện toàn hệ thống + điều chỉnh trạng thái cho Cấp 2 + mỗi ngày là một phiên cất/trả độc lập)

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

### Phase 9 — Xuất báo cáo Theo dõi (Cấp 2) + nâng cấp giao diện toàn hệ thống (2026-11-06)

**A. Tải xuống báo cáo Theo dõi (Cấp 2)**: nút mới trên `/teacher` xuất Excel/CSV đúng ngày đang xem, chọn được "toàn bộ danh sách lớp" hoặc "chỉ kết quả đang tìm/lọc". API mới `GET /api/teacher/overview/export` lấy classId từ `getAssignedClassIds(user, "TEACHER")` (phiên đăng nhập) — **không có tham số classId trên URL**, nên không có cách nào xuất lớp khác dù sửa query string thủ công; đã xác minh bằng curl thật: MANAGER gọi → 403, chưa đăng nhập → 401, 2 tài khoản TEACHER khác lớp (`teacher_12a1`/`teacher_12a2`) mỗi người chỉ nhận file đúng lớp mình (`Bao_cao_THB_Lop_12A1_...` / `..._12A2_...`). Tái sử dụng `getClassesDayOverview`, `toCsv`/`toXlsxBuffer` có sẵn — không thêm logic tính trạng thái mới. `toXlsxBuffer` được nâng cấp thêm tính độ rộng cột tự động (dùng chung cho cả export Cấp 2 và Cấp 3).

**B. Nâng cấp giao diện (logo, theme đỏ, bỏ 3 chấm macOS, hover, sidebar)**:
- Logo "TP" trong vòng tròn viền gradient đỏ (`src/components/ui/Logo.tsx`) dùng đồng nhất ở trang đăng nhập, title bar (mọi trang) và đầu sidebar (Cấp 2/3) — không còn nơi nào tự vẽ icon thương hiệu riêng.
- Xóa hoàn toàn 3 chấm tròn xanh/vàng/đỏ (vị trí render duy nhất là `MacTitleBar.tsx`), căn lại tiêu đề theo chiều trái, bỏ padding bù dùng để căn giữa trước đó.
- Đổi màu nhận diện chủ đạo từ xanh dương sang đỏ (`src/app/globals.css`, biến `--accent`/`--accent-hover`), tách riêng sắc đỏ cảnh báo lỗi (`--danger`) để không lẫn với màu thương hiệu; toàn bộ UI lấy màu qua token CSS (đã rà soát, không có màu hard-code ở component/page nào khác) nên đổi 1 nơi là áp dụng toàn hệ thống.
- Hiệu ứng hover 150–200ms cho nút, thẻ thống kê, hàng bảng, thẻ danh sách, logo — tôn trọng `prefers-reduced-motion` qua rule CSS toàn cục.
- Sidebar (Cấp 2/3) thêm logo + tên thương hiệu ở đầu, vạch nhấn đỏ bên trái mục đang chọn, khu vực hiển thị tên + cấp quyền người dùng phía trên nút đăng xuất (nhãn vai trò dùng chung `ROLE_LABEL` mới ở `src/lib/auth/guard.ts`).
- Gộp 2 bản sao `StatCard` trùng lặp thành 1 component chung trong `src/components/ui/Card.tsx`.

**Đã kiểm tra bằng smoke-test HTTP thật (không chỉ `npm run build`, theo đúng bài học Phase 6)**: `npx tsc --noEmit` sạch, `npm run lint` sạch, `npm run build` PASS. Chạy `npm run dev` thật và curl với cookie đăng nhập: toàn bộ trang Cấp 1 (`/manager/checkin`, `/manager/checkout`, `/manager/report`, `/manager/account`) và Cấp 2 (`/teacher`, `/teacher/report`, `/teacher/comments`, `/teacher/account`) trả 200, HTML không còn chuỗi `traffic-red`/`traffic-yellow`/`traffic-green`, trang `/teacher` có chứa nút "Tải xuống báo cáo" mới. API export mới trả đúng `Content-Disposition` theo mẫu `Bao_cao_THB_Lop_[MãLớp]_[Ngày].xlsx`, file `.xlsx`/`.csv` tải về mở được, cột không bị mất số 0 đầu của mã HS.

**Chưa kiểm tra được bằng HTTP thật trong lần này**: các trang `/admin/*` — mật khẩu admin trong `.env` không khớp với DB Postgres (Neon) đang kết nối ở máy này nên chưa đăng nhập được bằng tài khoản admin thật để curl trực tiếp (chủ động không tạo session/đổi mật khẩu admin để bypass vì đó là thao tác nhạy cảm trên dữ liệu thật). Mức độ tin cậy vẫn cao vì: (1) `Sidebar`/`MacTitleBar` dùng ở `/admin/*` là **cùng component, cùng dạng prop** (`user: {name, roleLabel}`, `items` dạng tên icon chuỗi) đã xác nhận render đúng qua Cấp 2 ở trên — không có nhánh logic riêng cho ADMIN có thể gãy khác; (2) `npx tsc --noEmit` xác nhận đúng kiểu cho toàn bộ trang `/admin/*`. Vẫn nên tự xác nhận bằng mắt trước khi coi là xong, xem mục "Việc cần bạn quyết định".
- Kiểm tra giao diện responsive bằng mắt ở độ rộng điện thoại thật: môi trường hiện tại không có công cụ trình duyệt/screenshot, giống hạn chế đã ghi nhận từ Phase 6/7/8 — các class Tailwind responsive (`flex-wrap`, `md:flex`, `sm:grid-cols-*`) được giữ/áp dụng nhất quán với pattern cũ nhưng chưa xác nhận bằng ảnh chụp thật.

### Phase 10 — Điều chỉnh trạng thái cất/trả cho Cấp 2 (2026-11-09)

Mở rộng tính năng "điều chỉnh trạng thái" (trước đó chỉ Cấp 3 có, ở Phase 8) cho Cấp 2 — **không tạo bảng/mô hình dữ liệu mới, không có migration**: dùng lại đúng bảng `DayStatusAdjustment` (append-only) + enum `DayStatusCode` đã có sẵn.

- `POST /api/teacher/overview/adjust` (TEACHER-only, `src/app/api/teacher/overview/adjust/route.ts`): giáo viên đặt 1 trong 4 trạng thái **Đã cất/Đã trả/Vắng mặt/Được miễn** cho học sinh lớp mình, bắt buộc lý do. Kiểm tra quyền sở hữu lớp trên MỖI yêu cầu bằng cách suy `classId` từ hồ sơ học sinh thật (không nhận/tin `classId` từ client) rồi so với `getAssignedClassIds(user, "TEACHER")` — chặn giả mạo `studentId` thuộc lớp khác (403 `AuthzError`, không phải lỗi 404 chung như Cấp 1 tra cứu học sinh — ở đây trả 403 vì học sinh có tồn tại thật, chỉ là giáo viên không có quyền). "Đã trả" chỉ được chấp nhận nếu đã có `PhoneTransaction` loại `CHECK_IN` thật trong đúng ngày đó — nếu chưa, trả 400 kèm thông báo rõ, giữ đúng quy tắc "không tự suy diễn giao dịch giả"; Cấp 3 không bị áp quy tắc này (giữ hành vi cũ, có quy trình xử lý riêng cho trường hợp đặc biệt).
- `GET /api/teacher/overview/adjustments` (TEACHER-only, `src/app/api/teacher/overview/adjustments/route.ts`): lịch sử điều chỉnh, luôn lọc theo lớp được phân công của phiên đăng nhập (không nhận `classId` từ client) — không có API sửa/xoá.
- Trang `/teacher`: thêm modal điều chỉnh (component mới `src/components/ui/Modal.tsx` — modal căn giữa, khác `SlideOver` trượt cạnh đang dùng ở Cấp 3) mở bằng nút "Điều chỉnh" cuối hàng hoặc bấm trực tiếp vào badge trạng thái; có 2 bước (chọn trạng thái/lý do/ghi chú → xem lại tóm tắt thay đổi → xác nhận); cảnh báo khi trạng thái mới khác trạng thái hiện tại; tuỳ chọn "Đã trả" bị disable kèm giải thích nếu học sinh chưa có giao dịch cất thật trong ngày (chặn trước ở UI, backend vẫn là nơi kiểm tra có hiệu lực). Có nút "Xem lịch sử điều chỉnh" riêng cho Cấp 2.
- Bộ lọc trạng thái trên `/teacher` đổi từ 2 dropdown cơ học (trạng thái cất/trạng thái trả) sang 1 dropdown theo đúng 6 trạng thái hiệu lực (giống Cấp 3) — 7 ô thống kê (thêm Vắng mặt/Được miễn), tính lại theo đúng bộ lọc đang áp dụng + sau khi điều chỉnh (dùng `effectiveStatus`, không dùng lại trạng thái cơ học cũ).
- `GET /api/teacher/overview/export` nhận thêm tham số `status` (effectiveStatus) để xuất đúng bộ lọc mới — vẫn tái dùng `getClassesDayOverview`, không thêm logic tính trạng thái; đổi nhãn ghi chú từ "Cấp 3 điều chỉnh" thành "Đã điều chỉnh (tên người thực hiện)" ở cả export Cấp 2 vì giờ người điều chỉnh có thể là Cấp 2 hoặc Cấp 3.
- Không đổi hành vi/giao diện Cấp 1 (MANAGER vẫn 403 ở 2 API mới) và Cấp 3 (`/admin/overview`, `/api/admin/overview/*` giữ nguyên, không sửa file).

**Đã kiểm tra**: `npx tsc --noEmit` sạch, `npm run lint` sạch. Vitest tích hợp mới (`tests/teacher-overview-adjust.integration.test.ts`) — xem bảng kết quả ở mục dưới.

**Quyết định có chủ đích — màu badge trạng thái**: yêu cầu gốc có đề một bảng màu riêng cho 6 trạng thái (ví dụ "Vắng mặt" = xám, "Đã cất" = xanh lá). Bảng `EFFECTIVE_STATUS_TONE` hiện tại (`src/lib/overviewStatus.ts`, dùng chung Cấp 2 + Cấp 3 từ Phase 8) đã phân biệt đủ 6 trạng thái bằng màu riêng nhưng theo một sơ đồ khác (ví dụ "Vắng mặt" = đỏ/danger để gây chú ý, "Được miễn" = tím, "Cần xác minh" = cam — 3/6 đã khớp yêu cầu gốc). Giữ nguyên sơ đồ màu hiện có cho Phase 10 để không đổi giao diện Cấp 3 ngoài yêu cầu ("không ảnh hưởng Cấp 3") — đổi `EFFECTIVE_STATUS_TONE` sẽ tự động đổi màu badge ở cả `/admin/overview`. Nếu bạn muốn đúng bảng màu đã đề (xanh lá/xanh dương/xám/tím/cam) áp dụng cho toàn hệ thống, đây là việc làm thêm cần xác nhận riêng.

### Phase 11 — Mỗi ngày là một phiên cất/trả độc lập (daily reset) (2026-11-12)

**Vấn đề phát hiện khi rà soát kiến trúc trước khi code** (đúng quy trình: đọc kiến trúc DB/trạng thái trước khi sửa): trang Theo dõi (Cấp 2/Cấp 3, `src/lib/overview.ts`) đã tính trạng thái theo đúng 1 ngày từ Phase 7/8 (không có vấn đề gì) — nhưng `getStudentPhoneStatus` (`src/lib/phone.ts`, dùng ở trạm cất/trả Cấp 1 và badge trạng thái Cấp 2) lại lấy **giao dịch gần nhất từ trước đến nay**, không giới hạn theo ngày. Hậu quả: học sinh cất điện thoại một ngày nào đó mà không có lượt trả thì trạng thái "đang cất" bị kế thừa sang mọi ngày sau, khiến Cấp 1 không cất lại được cho học sinh đó vào ngày mới (hệ thống báo "đã cất điện thoại trước đó") — đây là phần duy nhất của hệ thống không hoạt động theo đúng "mỗi ngày một phiên độc lập".

- **Cơ chế chọn**: suy trạng thái "hiện tại" từ truy vấn theo đúng ngày nghiệp vụ hôm nay (Asia/Ho_Chi_Minh) mỗi lần gọi — **không** tạo bảng "phiên theo ngày" riêng, **không** chạy job/cron lúc 00:00 để cập nhật hàng loạt. Lý do: hệ thống đã sẵn có `PhoneTransaction` lưu `createdAt` chính xác và các hàm tính theo ngày (`dayBoundsInAppTimezone`) — chỉ cần thu hẹp đúng phạm vi truy vấn ở một chỗ (`getStudentPhoneStatus`) là đủ, không cần hạ tầng mới, không có rủi ro "quên chạy job"/lệch giờ chạy job, và hoạt động đúng ngay cả khi deploy nhiều instance/serverless trên Vercel (không phụ thuộc RAM một máy chủ).
- Sửa `src/lib/phone.ts::getStudentPhoneStatus`: thêm điều kiện `createdAt: { gte, lt }` theo `dayBoundsInAppTimezone(todayInAppTimezone())`. Dùng ở: `/api/manager/students/lookup`, `/api/manager/transactions` (gate cất/trả Cấp 1), `/api/teacher/students`, `/api/teacher/students/[id]` (badge trạng thái Cấp 2). Không đổi chữ ký hàm, không đổi schema, không migration.
- Sửa thêm 3 chỗ dùng `setHours(0,0,0,0)` theo **giờ máy chủ** (sai lệch ngày khi deploy trên Vercel chạy UTC) thay vì Asia/Ho_Chi_Minh: `GET /api/manager/transactions/today`, `GET /api/admin/dashboard` (3 câu truy vấn: `todayCheckIns`, `todayCheckOuts`, `checkInsToday` theo lớp), `GET /api/teacher/transactions` (API cũ, không còn được UI hiện tại gọi nhưng vẫn còn tồn tại nên sửa cho đúng, thêm luôn validate `date` qua `isValidDateStr`). Cả 3 đổi sang `dayBoundsInAppTimezone`/`todayInAppTimezone` — nhất quán với `src/lib/overview.ts` đã dùng từ Phase 8.
- **Không chạm vào**: trang Theo dõi (`/teacher`, `/admin/overview`), API điều chỉnh trạng thái (`/api/teacher/overview/adjust`, `/api/admin/overview/adjust`), `DayStatusAdjustment`, `getClassesDayOverview`, luồng báo cáo cuối tuần — các phần này đã tính theo ngày đúng từ trước, không có lỗi, không cần sửa. Không xoá/sửa bất kỳ `PhoneTransaction` hay `DayStatusAdjustment` nào — lịch sử các ngày trước vẫn xem lại được nguyên vẹn qua Theo dõi, báo cáo cuối tuần đã tạo/gửi không bị ảnh hưởng.
- Trạng thái "Vắng mặt"/"Được miễn" vẫn **không** tự động kế thừa qua ngày mới (đã đúng từ Phase 8/10 vì `DayStatusAdjustment` gắn theo `date` cụ thể) — xác nhận lại bằng test, không có thay đổi hành vi ở phần này.

**Đã kiểm tra**: `npx tsc --noEmit` sạch, `npm run lint` sạch. Test mới `tests/daily-reset.integration.test.ts` (dùng Prisma trực tiếp để tạo giao dịch "hôm qua" một cách xác định, theo đúng cách các test tích hợp khác trong repo xử lý — không mock HTTP). Ngoài ra đã chạy một script xác minh thủ công qua Cấp 1 (`manager_12a1`) + Cấp 2 (`teacher_12a1`, không cần đăng nhập admin) với `npm run dev` thật đang chạy: 21/22 kiểm tra PASS (1 "fail" đầu tiên là do kỳ vọng sai trong script — đã cất nhưng chưa trả cùng ngày thì trạng thái hiệu lực đúng phải là "Cần xác minh", không phải "Đã cất", theo logic `deriveMechanicalStatus` có từ Phase 8, không phải lỗi mới; đã sửa lại kỳ vọng tương ứng trong `tests/daily-reset.integration.test.ts`). Script xác minh là file tạm, đã xoá sau khi dùng, không còn trong repo.

**Chưa chạy được bằng `npm test` đầy đủ trong lần này**: `tests/daily-reset.integration.test.ts` (giống `tests/import-and-overview.integration.test.ts` đã có từ Phase 8) cần đăng nhập `admin` ở bước `beforeAll` để tạo lớp/học sinh test — gặp đúng vấn đề đã ghi nhận ở mục "Rủi ro" (mật khẩu `admin` trong `.env` không khớp DB Neon đang kết nối ở máy này), không phải lỗi do thay đổi lần này: khi chạy `npm test` với env hiện tại, 2 file cần admin (`import-and-overview`, `daily-reset`) báo lỗi "Không đăng nhập được admin" ở `beforeAll` và toàn bộ test trong file bị skip, còn `rbac.integration.test.ts`/`teacher-overview-adjust.integration.test.ts`/`guard.unit.test.ts`/`password.db.test.ts` vẫn PASS như trước (đã xác nhận lại bằng cách chạy `npm run dev` + `npm test` thật ở lần sửa này). Khi có mật khẩu admin đúng (xem "Việc cần bạn quyết định"), `npm test` sẽ tự chạy được file test mới này cùng các file khác.

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
- Đã chuyển `provider` trong `schema.prisma` từ SQLite sang `postgresql` (commit trước Phase 9) — `.env.local` ở máy này trỏ `DATABASE_URL` sang một DB Neon Postgres thật (dùng cho Vercel). Khi smoke-test Phase 9 bằng curl, đây là DB được dùng trực tiếp — không chạy lệnh hủy/ghi đè dữ liệu (`migrate reset`, seed lại...), chỉ gọi các API đọc + 2 lượt gọi API xuất báo cáo (ghi thêm vài session đăng nhập demo bình thường + 2 dòng `AuditLog` hành động `TEACHER_OVERVIEW_EXPORT`, không khác gì người dùng thật bấm nút) nên không ảnh hưởng dữ liệu nghiệp vụ hiện có.
- Prisma 8 (RC) đã bị gỡ xuống Prisma 6 (ổn định) — tránh `npm update` tự động nâng lại Prisma 8 cho tới khi bản ổn định chính thức ra mắt.
- Mật khẩu tài khoản `admin` lưu trong `.env` của máy này **không khớp** với DB Neon đang kết nối (có thể do `.env` cục bộ và DB đã bị seed lệch nhau ở một thời điểm trước đó) — xem mục "Việc cần bạn quyết định" #4. Các tài khoản demo Cấp 1/Cấp 2 (`manager_12a1`, `teacher_12a1`, `teacher_12a2`, mật khẩu `Demo@123`) vẫn đăng nhập được bình thường.
- `xlsx` (SheetJS) đã cài từ CDN chính chủ thay vì npm registry để tránh 2 lỗi an ninh chưa có bản vá trên npm — khi `npm install` lại từ đầu, nếu môi trường chặn tải từ `cdn.sheetjs.com` thì bước cài sẽ lỗi; cần cho phép domain này hoặc đổi sang nguồn khác.

## Việc cần bạn quyết định

1. Repo git cũ ở `C:\Users\NGOC BAO` (home dir, chỉ 1 file README 28 bytes không liên quan) — xóa `.git` đó hay để nguyên?
2. Khi triển khai thật: cấu hình SMTP thật (host/port/user/password) hay dùng chế độ xem trước là đủ cho bản nộp KHKT?
3. Có cần xây lịch gửi báo cáo tự động (cron hàng tuần) hay admin bấm tạo dự thảo thủ công mỗi tuần là đủ cho phạm vi đề tài?
4. **Mới (Phase 9)**: mật khẩu admin đúng của DB Postgres (Neon) đang kết nối là gì? Chưa xác nhận được bằng mắt/HTTP thật giao diện mới của `/admin/*` (dashboard, sidebar, theme đỏ, nút xuất dữ liệu Cấp 3) vì chưa đăng nhập được bằng tài khoản admin thật — cần bạn cung cấp mật khẩu, tự kiểm tra, hoặc đồng ý chạy lại `npm run seed` với `SEED_ADMIN_PASSWORD` mới (sẽ đổi mật khẩu admin thật trong DB).

## 3 việc tiếp theo

1. Xác nhận bằng mắt/HTTP thật giao diện mới trên `/admin/*` sau khi có mật khẩu admin đúng (xem mục quyết định #4) — Cấp 1/Cấp 2 đã xác nhận xong trong Phase 9.
2. Tự kiểm tra responsive bằng mắt ở độ rộng ~400px cho toàn bộ giao diện, đặc biệt các trang nhiều cột/bảng (`/admin/classes/import`, `/admin/overview`, `/teacher` sau khi thêm khối xuất báo cáo) — cần công cụ trình duyệt/screenshot, môi trường hiện tại chưa có.
3. (Nếu cần) Xây API/UI cấu hình `ReportScheduleConfig` (lịch cron + người nhận mặc định) để không phải nhập tay mỗi lần — vẫn chưa làm, không nằm trong phạm vi Phase 8/9.
