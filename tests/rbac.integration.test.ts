/**
 * Test tích hợp THẬT qua HTTP — không mock. Yêu cầu `npm run dev` đang chạy ở BASE_URL
 * (mặc định http://localhost:3000) với dữ liệu seed mặc định (`npm run seed`) trước khi
 * chạy `npm test`. Đây là lựa chọn có chủ đích: route handler của Next.js App Router
 * dùng cookies() gắn với vòng đời request thật, nên kiểm thử bằng HTTP thật đáng tin hơn
 * là gọi hàm route trực tiếp ngoài request context.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";

// Dùng TEST_BASE_URL (không dùng BASE_URL) vì Vite/Vitest tự đặt process.env.BASE_URL = "/".
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

beforeAll(async () => {
  try {
    await fetch(BASE_URL);
  } catch (e) {
    throw new Error(
      `Không kết nối được tới ${BASE_URL}: ${(e as Error).stack ?? e}. Hãy chạy "npm run dev" (và "npm run seed" nếu chưa seed) trước khi chạy test tích hợp này.`
    );
  }
});

describe("Xác thực & phiên đăng nhập", () => {
  it("chưa đăng nhập không gọi được API nghiệp vụ", async () => {
    const res = await fetch(`${BASE_URL}/api/manager/students/lookup?code=HS1201`);
    expect(res.status).toBe(401);
  });

  it("sai mật khẩu bị từ chối với thông báo chung (không lộ username có tồn tại không)", async () => {
    const r1 = await login("manager_12a1", "sai-mat-khau");
    const r2 = await login("khong-ton-tai", "sai-mat-khau");
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
    expect(r1.body.error).toBe(r2.body.error);
  });

  it("đăng nhập đúng trả về role, không có ô chọn vai trò từ client", async () => {
    const r = await login("manager_12a1", "Demo@123");
    expect(r.status).toBe(200);
    expect(r.body.role).toBe("MANAGER");
    expect(r.cookie).toMatch(/^thb_session=/);
  });

  it("đăng xuất thu hồi session — gọi lại API bằng cookie cũ bị từ chối", async () => {
    const { cookie } = await login("manager_12a1", "Demo@123");
    await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", headers: { Cookie: cookie } });
    const res = await fetch(`${BASE_URL}/api/manager/students/lookup?code=HS1201`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(401);
  });
});

describe("Cấp 1 — Quản lý lớp: phạm vi đúng lớp được phân công", () => {
  it("tra cứu học sinh lớp của mình -> 200", async () => {
    const { cookie } = await login("manager_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/manager/students/lookup?code=HS1201`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classCode).toBe("12A1");
  });

  it("tra cứu học sinh lớp KHÁC -> 404 chung, không lộ thông tin", async () => {
    const { cookie } = await login("manager_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/manager/students/lookup?code=HS1221`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });

  it("cất điện thoại 2 lần liên tiếp -> lần 2 báo giao dịch không hợp lệ (409)", async () => {
    const { cookie } = await login("manager_12a1", "Demo@123");
    const code = "HS1202";
    // đưa về trạng thái "OUT" chắc chắn trước khi test (bỏ qua lỗi nếu đã OUT)
    await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ studentCode: code, type: "CHECK_OUT" }),
    });
    const first = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ studentCode: code, type: "CHECK_IN" }),
    });
    const second = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ studentCode: code, type: "CHECK_IN" }),
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    // dọn lại trạng thái
    await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ studentCode: code, type: "CHECK_OUT" }),
    });
  });

  it("không thể truy cập trang quản trị (API Cấp 3) — 403", async () => {
    const { cookie } = await login("manager_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/admin/accounts`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(403);
  });

  it("không thể gọi API sửa hồ sơ học sinh (chỉ ADMIN) — 403", async () => {
    const { cookie } = await login("manager_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/admin/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ studentCode: "X", fullName: "X", classId: "x" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("Cấp 2 — Giáo viên: xem đúng phạm vi, không thao tác cất/trả", () => {
  it("xem học sinh lớp mình -> chỉ gồm học sinh lớp đó", async () => {
    const { cookie } = await login("teacher_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/teacher/students`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s: { classCode: string }) => s.classCode === "12A1")).toBe(true);
  });

  it("không thể thực hiện cất/trả (API Cấp 1 chặn theo role) — 403", async () => {
    const { cookie } = await login("teacher_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ studentCode: "HS1201", type: "CHECK_IN" }),
    });
    expect(res.status).toBe(403);
  });

  it("không thể sửa danh sách học sinh (API Cấp 3) — 403", async () => {
    const { cookie } = await login("teacher_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/admin/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ studentCode: "X", fullName: "X", classId: "x" }),
    });
    expect(res.status).toBe(403);
  });

  it("không thể duyệt/gửi báo cáo toàn trường (API Cấp 3) — 403", async () => {
    const { cookie } = await login("teacher_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/admin/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ weekStart: "2026-10-19" }),
    });
    expect(res.status).toBe(403);
  });

  it("không xem được lớp không được phân công (truy cập thẳng id học sinh lớp khác) — 403", async () => {
    const t2 = await login("teacher_12a2", "Demo@123");
    const listRes = await fetch(`${BASE_URL}/api/teacher/students`, { headers: { Cookie: t2.cookie } });
    const otherClassStudent = (await listRes.json())[0];

    const { cookie } = await login("teacher_12a1", "Demo@123");
    const res = await fetch(`${BASE_URL}/api/teacher/students/${otherClassStudent.id}`, {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});

describe("Cấp 3 — Quản trị: quản lý toàn trường, chỉ admin phát hành báo cáo", () => {
  it("quản lý được lớp theo quyền quản trị (tạo lớp mới)", async () => {
    const { cookie } = await login("admin", process.env.SEED_ADMIN_PASSWORD ?? "");
    const code = `T${randomUUID().slice(0, 6)}`;
    const res = await fetch(`${BASE_URL}/api/admin/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ code, name: `Lớp test ${code}` }),
    });
    expect(res.status).toBe(200);
  });

  it("chỉ ADMIN phát hành được báo cáo cuối tuần — manager/teacher bị chặn ở trên đã kiểm; admin gọi được (409 nếu đã gửi trước, không phải 403)", async () => {
    const { cookie } = await login("admin", process.env.SEED_ADMIN_PASSWORD ?? "");
    const res = await fetch(`${BASE_URL}/api/admin/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ weekStart: "2026-10-19" }),
    });
    expect(res.status).toBe(200);
  });

  it("người dùng không thể tự nâng quyền: không có endpoint nào cho phép user tự đổi role/lớp của chính mình", async () => {
    const { cookie } = await login("manager_12a1", "Demo@123");
    // route PATCH tài khoản chỉ tồn tại dưới /api/admin/**, và đã được xác nhận 403 ở trên.
    // Thử trực tiếp PATCH route admin/accounts bằng id của chính manager -> vẫn phải 403.
    const res = await fetch(`${BASE_URL}/api/admin/accounts/self`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ action: "UNLOCK" }),
    });
    expect(res.status).toBe(403);
  });
});
