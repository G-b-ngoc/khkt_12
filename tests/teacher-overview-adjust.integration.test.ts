/**
 * Test tích hợp THẬT qua HTTP (cùng kiểu với tests/import-and-overview.integration.test.ts)
 * cho tính năng điều chỉnh trạng thái cất/trả của CẤP 2 (giáo viên chủ nhiệm) — mở rộng từ
 * tính năng đã có của Cấp 3 ở Phase 8, dùng lại đúng bảng DayStatusAdjustment.
 * Yêu cầu `npm run dev` đang chạy, đã `npm run seed`, và SEED_ADMIN_PASSWORD có trong shell
 * chạy `npm test` (nạp từ .env).
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

function extractCookie(res: Response): string {
  const raw = res.headers.get("set-cookie");
  if (!raw) return "";
  return raw.split(";")[0];
}

async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  return { status: res.status, body, cookie: extractCookie(res) };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function adjustAsTeacher(
  cookie: string,
  payload: { studentId: string; date: string; newStatus: string; reason?: string; note?: string }
) {
  const res = await fetch(`${BASE_URL}/api/teacher/overview/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

let teacher12a1Cookie: string;
let teacher12a2Cookie: string;
let managerCookie: string;
let adminCookie: string | null = null;
let student1201Id: string; // HS1201 thuộc 12A1
let student1202Id: string; // HS1202 thuộc 12A1 — dùng cho các ca cần giao dịch cất "sạch"

beforeAll(async () => {
  try {
    await fetch(BASE_URL);
  } catch (e) {
    throw new Error(`Không kết nối được tới ${BASE_URL}: ${(e as Error).stack ?? e}. Hãy chạy "npm run dev" trước.`);
  }

  teacher12a1Cookie = (await login("teacher_12a1", "Demo@123")).cookie;
  teacher12a2Cookie = (await login("teacher_12a2", "Demo@123")).cookie;
  managerCookie = (await login("manager_12a1", "Demo@123")).cookie;
  // Đăng nhập admin KHÔNG bắt buộc cho bộ test này (toàn bộ ca kiểm thử chính đều là Cấp 2) —
  // chỉ 1 ca cuối cần admin để xác nhận Cấp 3 không bị ảnh hưởng, tự bỏ qua nếu không đăng
  // nhập được (ví dụ SEED_ADMIN_PASSWORD trong .env không khớp mật khẩu thật trên môi trường).
  const admin = await login("admin", process.env.SEED_ADMIN_PASSWORD ?? "");
  if (admin.status === 200) adminCookie = admin.cookie;

  const students = await fetch(`${BASE_URL}/api/teacher/students`, { headers: { Cookie: teacher12a1Cookie } }).then(
    (r) => r.json()
  );
  student1201Id = students.find((s: { studentCode: string }) => s.studentCode === "HS1201").id;
  student1202Id = students.find((s: { studentCode: string }) => s.studentCode === "HS1202").id;
}, 30000);

describe("Điều chỉnh trạng thái cất/trả — Cấp 2 (giáo viên chủ nhiệm)", () => {
  it("Cấp 1 (MANAGER) không gọi được API điều chỉnh của Cấp 2 — 403", async () => {
    const res = await adjustAsTeacher(managerCookie, {
      studentId: student1201Id,
      date: todayStr(),
      newStatus: "ABSENT",
      reason: "thử",
    });
    expect(res.status).toBe(403);
  });

  it("chưa đăng nhập không gọi được — 401", async () => {
    const res = await fetch(`${BASE_URL}/api/teacher/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student1201Id, date: todayStr(), newStatus: "ABSENT", reason: "thử" }),
    });
    expect(res.status).toBe(401);
  });

  it("thiếu lý do -> 400, không lưu điều chỉnh", async () => {
    const res = await adjustAsTeacher(teacher12a1Cookie, {
      studentId: student1201Id,
      date: todayStr(),
      newStatus: "ABSENT",
      reason: "",
    });
    expect(res.status).toBe(400);
  });

  it("trạng thái không nằm trong 4 trạng thái cho phép (ví dụ NOT_RECORDED) -> 400", async () => {
    const res = await adjustAsTeacher(teacher12a1Cookie, {
      studentId: student1201Id,
      date: todayStr(),
      newStatus: "NOT_RECORDED",
      reason: "thử trạng thái không hợp lệ",
    });
    expect(res.status).toBe(400);
  });

  it("giáo viên lớp 12A2 không điều chỉnh được học sinh lớp 12A1 — 403 (chặn giả mạo studentId lớp khác)", async () => {
    const res = await adjustAsTeacher(teacher12a2Cookie, {
      studentId: student1201Id,
      date: todayStr(),
      newStatus: "ABSENT",
      reason: "thử truy cập lớp khác",
    });
    expect(res.status).toBe(403);
  });

  it("đánh dấu Vắng mặt thành công — không tạo giờ cất/trả giả, lưu đủ thông tin lịch sử", async () => {
    const date = todayStr();
    const res = await adjustAsTeacher(teacher12a1Cookie, {
      studentId: student1201Id,
      date,
      newStatus: "ABSENT",
      reason: "Phụ huynh xin phép nghỉ, có xác nhận GVCN",
      note: "Đã gọi điện xác nhận với phụ huynh",
    });
    expect(res.status).toBe(200);
    expect(res.body.adjustment.newStatus).toBe("ABSENT");

    const overview = await fetch(`${BASE_URL}/api/teacher/overview?date=${date}`, {
      headers: { Cookie: teacher12a1Cookie },
    }).then((r) => r.json());
    const row = overview.rows.find((r: { studentCode: string }) => r.studentCode === "HS1201");
    expect(row.effectiveStatus).toBe("ABSENT");
    expect(row.adjustment.reason).toMatch(/Phụ huynh/);
    // Vắng mặt không phải giao dịch cất/trả thật -> không có giờ cất/trả giả được sinh ra.
    expect(row.checkInAt).toBeNull();

    const history = await fetch(`${BASE_URL}/api/teacher/overview/adjustments?date=${date}&studentId=${student1201Id}`, {
      headers: { Cookie: teacher12a1Cookie },
    }).then((r) => r.json());
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].newStatus).toBe("ABSENT");
    expect(history[0].reason).toMatch(/Phụ huynh/);
    expect(history[0].adjustedByName).toBeTruthy();
    expect(history[0].createdAt).toBeTruthy();
  });

  it("đánh dấu Được miễn thành công, lịch sử trước đó (Vắng mặt) vẫn còn nguyên — append-only", async () => {
    const date = todayStr();
    const res = await adjustAsTeacher(teacher12a1Cookie, {
      studentId: student1201Id,
      date,
      newStatus: "EXEMPTED",
      reason: "Được miễn theo quy định của nhà trường",
    });
    expect(res.status).toBe(200);
    expect(res.body.adjustment.previousStatus).toBe("ABSENT");

    const history = await fetch(`${BASE_URL}/api/teacher/overview/adjustments?date=${date}&studentId=${student1201Id}`, {
      headers: { Cookie: teacher12a1Cookie },
    }).then((r) => r.json());
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].newStatus).toBe("EXEMPTED"); // mới nhất đứng đầu
    expect(history.some((h: { newStatus: string }) => h.newStatus === "ABSENT")).toBe(true); // bản cũ còn nguyên

    const overview = await fetch(`${BASE_URL}/api/teacher/overview?date=${date}`, {
      headers: { Cookie: teacher12a1Cookie },
    }).then((r) => r.json());
    const row = overview.rows.find((r: { studentCode: string }) => r.studentCode === "HS1201");
    expect(row.effectiveStatus).toBe("EXEMPTED");
  });

  it("không cho đánh dấu Đã trả khi chưa có giao dịch cất thật trong ngày — 400", async () => {
    // Dùng một ngày trong quá khứ chắc chắn không có giao dịch nào (tránh phụ thuộc vào
    // trạng thái "hôm nay" có thể đã bị test khác/lần chạy trước ghi nhận lượt cất) — một
    // khi đã có giao dịch CHECK_IN trong ngày, checkInStatus giữ "Đã cất" cho cả ngày đó
    // theo đúng thiết kế (sổ giao dịch không xoá), nên không thể "reset" lại bằng CHECK_OUT.
    const pastDate = "2026-01-10";
    const overviewBefore = await fetch(`${BASE_URL}/api/teacher/overview?date=${pastDate}`, {
      headers: { Cookie: teacher12a1Cookie },
    }).then((r) => r.json());
    const rowBefore = overviewBefore.rows.find((r: { studentCode: string }) => r.studentCode === "HS1202");
    expect(rowBefore.checkInStatus).toBe("Chưa ghi nhận cất");

    const res = await adjustAsTeacher(teacher12a1Cookie, {
      studentId: student1202Id,
      date: pastDate,
      newStatus: "CHECKED_OUT",
      reason: "thử đánh dấu đã trả khi chưa cất",
    });
    expect(res.status).toBe(400);
  });

  it("đánh dấu Đã trả hợp lệ khi đã có giao dịch cất thật trong ngày", async () => {
    const date = todayStr();
    // Tạo giao dịch cất thật cho HS1202 (Cấp 1).
    const checkIn = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ studentCode: "HS1202", type: "CHECK_IN" }),
    });
    expect(checkIn.status).toBe(200);

    const res = await adjustAsTeacher(teacher12a1Cookie, {
      studentId: student1202Id,
      date,
      newStatus: "CHECKED_OUT",
      reason: "Giáo viên xác nhận học sinh đã nhận lại điện thoại",
    });
    expect(res.status).toBe(200);
    expect(res.body.adjustment.newStatus).toBe("CHECKED_OUT");

    const overview = await fetch(`${BASE_URL}/api/teacher/overview?date=${date}`, {
      headers: { Cookie: teacher12a1Cookie },
    }).then((r) => r.json());
    const row = overview.rows.find((r: { studentCode: string }) => r.studentCode === "HS1202");
    expect(row.effectiveStatus).toBe("CHECKED_OUT");
    // Giao dịch cất gốc vẫn còn nguyên — không bị điều chỉnh trạng thái ghi đè/xoá.
    expect(row.checkInAt).toBeTruthy();

    // dọn lại trạng thái cho các test khác
    await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ studentCode: "HS1202", type: "CHECK_OUT" }),
    }).catch(() => {});
  });

  it("đánh dấu Đã cất thành công khi học sinh chưa ghi nhận gì trong ngày", async () => {
    const date = todayStr();
    const students = await fetch(`${BASE_URL}/api/teacher/students`, { headers: { Cookie: teacher12a1Cookie } }).then(
      (r) => r.json()
    );
    const target = students.find((s: { studentCode: string }) => s.studentCode === "HS1203");

    const res = await adjustAsTeacher(teacher12a1Cookie, {
      studentId: target.id,
      date,
      newStatus: "CHECKED_IN",
      reason: "Giáo viên xác nhận học sinh đã gửi điện thoại nhưng Cấp 1 quên ghi nhận",
    });
    expect(res.status).toBe(200);

    const overview = await fetch(`${BASE_URL}/api/teacher/overview?date=${date}`, {
      headers: { Cookie: teacher12a1Cookie },
    }).then((r) => r.json());
    const row = overview.rows.find((r: { studentCode: string }) => r.studentCode === "HS1203");
    expect(row.effectiveStatus).toBe("CHECKED_IN");
    // Điều chỉnh trạng thái không tạo giờ cất giả trong PhoneTransaction.
    expect(row.checkInAt).toBeNull();
  });

  it("Cấp 2 chỉ xem được lịch sử điều chỉnh của lớp mình — giáo viên 12A2 không thấy điều chỉnh của 12A1", async () => {
    const date = todayStr();
    const history12a2 = await fetch(`${BASE_URL}/api/teacher/overview/adjustments?date=${date}`, {
      headers: { Cookie: teacher12a2Cookie },
    }).then((r) => r.json());
    expect(history12a2.every((h: { studentCode: string }) => h.studentCode !== "HS1201")).toBe(true);
  });

  it("MANAGER/chưa đăng nhập không gọi được API lịch sử điều chỉnh của Cấp 2 — 403/401", async () => {
    const asManager = await fetch(`${BASE_URL}/api/teacher/overview/adjustments`, { headers: { Cookie: managerCookie } });
    expect(asManager.status).toBe(403);
    const anon = await fetch(`${BASE_URL}/api/teacher/overview/adjustments`);
    expect(anon.status).toBe(401);
  });

  it("điều chỉnh của Cấp 2 phản ánh đúng trong file xuất CSV của Cấp 2 (ghi chú + trạng thái mới)", async () => {
    const date = todayStr();
    const res = await fetch(`${BASE_URL}/api/teacher/overview/export?date=${date}&format=csv&scope=all`, {
      headers: { Cookie: teacher12a1Cookie },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/Được miễn/);
    expect(text).toMatch(/Đã điều chỉnh/);
  });

  it("xuất lọc theo trạng thái hiệu lực (status=EXEMPTED) chỉ còn đúng học sinh đang ở trạng thái đó", async () => {
    const date = todayStr();
    const res = await fetch(
      `${BASE_URL}/api/teacher/overview/export?date=${date}&format=csv&scope=filtered&status=EXEMPTED`,
      { headers: { Cookie: teacher12a1Cookie } }
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/HS1201/);
    expect(text).not.toMatch(/HS1203/);
  });

  it("Cấp 3 không bị ảnh hưởng — vẫn điều chỉnh được qua API cũ của Cấp 3 như trước", async () => {
    if (!adminCookie) {
      console.warn("Bỏ qua: không đăng nhập được admin trong môi trường này (SEED_ADMIN_PASSWORD không khớp DB thật).");
      return;
    }
    const date = todayStr();
    const res = await fetch(`${BASE_URL}/api/admin/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        studentId: student1201Id,
        date,
        newStatus: "NEEDS_VERIFICATION",
        reason: "Cấp 3 kiểm tra không bị ảnh hưởng bởi thay đổi của Cấp 2",
      }),
    });
    expect(res.status).toBe(200);

    // Cấp 3 vẫn dùng được trạng thái mà Cấp 2 không được phép tự đặt (NEEDS_VERIFICATION).
    const adminClasses = await fetch(`${BASE_URL}/api/admin/classes`, { headers: { Cookie: adminCookie } }).then(
      (r) => r.json()
    );
    const class12a1 = adminClasses.find((c: { code: string }) => c.code === "12A1");
    const overview = await fetch(`${BASE_URL}/api/admin/overview?classId=${class12a1.id}&date=${date}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    const row = overview.rows.find((r: { studentCode: string }) => r.studentCode === "HS1201");
    expect(row.effectiveStatus).toBe("NEEDS_VERIFICATION");
  });
});
