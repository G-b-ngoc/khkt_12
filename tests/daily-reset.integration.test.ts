/**
 * Test tích hợp THẬT qua HTTP (cùng kiểu với các file tests/*.integration.test.ts khác) cho
 * tính năng "mỗi ngày là một phiên cất/trả độc lập" (daily reset).
 *
 * Cơ chế được kiểm thử KHÔNG lưu trạng thái "hôm nay" ở một bảng/bộ nhớ riêng — trạng thái
 * hiện tại (`getStudentPhoneStatus`, src/lib/phone.ts) được suy ra MỖI LẦN gọi từ đúng các
 * PhoneTransaction nằm trong ngày nghiệp vụ hôm nay (Asia/Ho_Chi_Minh). Vì vậy để kiểm thử
 * "hôm qua" một cách xác định (không phải chờ đồng hồ thật sang ngày), test này ghi thẳng
 * một PhoneTransaction với `createdAt` lùi về ngày trước qua Prisma — đây là cách duy nhất
 * hợp lý để mô phỏng "ngày hôm trước" trong một bộ test chạy trong vài giây.
 *
 * Yêu cầu `npm run dev` đang chạy, đã `npm run seed`, và SEED_ADMIN_PASSWORD có trong shell
 * chạy `npm test` (nạp từ .env).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { dayBoundsInAppTimezone, formatDateInAppTimezone } from "../src/lib/timezone";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

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

/** "Hôm qua" theo ĐÚNG lịch Việt Nam (không dùng toán UTC) — app không có giờ mùa hè nên lùi
 * đúng 24h luôn rơi vào đúng 1 ngày lịch trước đó theo Asia/Ho_Chi_Minh. */
function yesterdayVNStr(): string {
  return formatDateInAppTimezone(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

let adminCookie: string;
let managerCookie: string;
let teacherCookie: string;
let testClassId: string;
let managerUserId: string;
let studentCode: string;
let studentId: string;

beforeAll(async () => {
  try {
    await fetch(BASE_URL);
  } catch (e) {
    throw new Error(`Không kết nối được tới ${BASE_URL}: ${(e as Error).stack ?? e}. Hãy chạy "npm run dev" trước.`);
  }

  const admin = await login("admin", process.env.SEED_ADMIN_PASSWORD ?? "");
  if (admin.status !== 200) {
    throw new Error("Không đăng nhập được admin — kiểm tra SEED_ADMIN_PASSWORD đã nạp vào shell chạy test chưa.");
  }
  adminCookie = admin.cookie;
  managerCookie = (await login("manager_12a1", "Demo@123")).cookie;
  teacherCookie = (await login("teacher_12a1", "Demo@123")).cookie;

  const testClassCode = `TRST${randomUUID().slice(0, 6)}`;
  const classRes = await fetch(`${BASE_URL}/api/admin/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ code: testClassCode, name: `Lớp test reset ${testClassCode}` }),
  });
  testClassId = (await classRes.json()).id;

  // Gán thêm manager_12a1/teacher_12a1 vào lớp test này (không đổi/ảnh hưởng phân công cũ ở 12A1).
  const managerUser = await prisma.user.findUnique({ where: { username: "manager_12a1" } });
  const teacherUser = await prisma.user.findUnique({ where: { username: "teacher_12a1" } });
  managerUserId = managerUser!.id;
  await prisma.classAssignment.create({ data: { userId: managerUserId, classId: testClassId, role: "MANAGER" } });
  await prisma.classAssignment.create({ data: { userId: teacherUser!.id, classId: testClassId, role: "TEACHER" } });

  studentCode = `RST${randomUUID().slice(0, 6)}`;
  const studentRes = await fetch(`${BASE_URL}/api/admin/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ studentCode, fullName: "Học sinh Test Reset", classId: testClassId }),
  });
  studentId = (await studentRes.json()).id;
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Daily reset — mỗi ngày một phiên cất/trả độc lập (không mất lịch sử)", () => {
  const yesterday = yesterdayVNStr();

  it("học sinh đã CẤT 'hôm qua' nhưng chưa trả -> hôm nay trạng thái hiện tại vẫn là OUT (none), không kế thừa 'IN'", async () => {
    const { start } = dayBoundsInAppTimezone(yesterday);
    const backdatedAt = new Date(start.getTime() + 10 * 60 * 60 * 1000); // 10:00 giờ VN hôm qua
    await prisma.phoneTransaction.create({
      data: { studentId, classId: testClassId, type: "CHECK_IN", performedById: managerUserId, createdAt: backdatedAt },
    });

    const lookup = await fetch(`${BASE_URL}/api/manager/students/lookup?code=${studentCode}`, {
      headers: { Cookie: managerCookie },
    }).then((r) => r.json());
    expect(lookup.status).toBe("OUT");
  });

  it("lịch sử 'hôm qua' vẫn xem lại được chính xác qua Theo dõi (Cấp 2), báo cáo/ dữ liệu cũ không bị động", async () => {
    const res = await fetch(`${BASE_URL}/api/teacher/overview?date=${yesterday}`, { headers: { Cookie: teacherCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find((r: { studentCode: string }) => r.studentCode === studentCode);
    expect(row.checkInStatus).toBe("Đã cất");
    expect(row.checkInAt).toBeTruthy();
  });

  it("vì hôm nay là phiên mới (OUT), Cấp 1 vẫn cất được điện thoại — không bị báo 'đã cất trước đó'", async () => {
    const res = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ studentCode, type: "CHECK_IN" }),
    });
    expect(res.status).toBe(200);

    // Giao dịch "hôm qua" vẫn còn nguyên trong DB, không bị xoá/ghi đè bởi lượt cất hôm nay.
    const yesterdayCount = await prisma.phoneTransaction.count({
      where: { studentId, createdAt: { lt: dayBoundsInAppTimezone(yesterday).end } },
    });
    expect(yesterdayCount).toBe(1);
  });

  it("trang Theo dõi hôm nay (mặc định) hiện đúng trạng thái 'Đã cất' MỚI của hôm nay, không tự nhảy sang Vắng mặt/Được miễn", async () => {
    const res = await fetch(`${BASE_URL}/api/teacher/overview`, { headers: { Cookie: teacherCookie } });
    const body = await res.json();
    const row = body.rows.find((r: { studentCode: string }) => r.studentCode === studentCode);
    expect(row.checkInStatus).toBe("Đã cất");
    // Đã cất nhưng chưa có lượt trả cùng ngày -> "Cần xác minh" (logic suy diễn có sẵn từ
    // trước ở src/lib/overview.ts::deriveMechanicalStatus, không phải hành vi mới của reset).
    expect(row.effectiveStatus).toBe("NEEDS_VERIFICATION");
    expect(row.adjustment).toBeNull();
  });

  it("sau khi cất hôm nay, trạng thái hiện tại là IN và có thể trả (CHECK_OUT) bình thường, rồi quay lại OUT", async () => {
    const lookup = await fetch(`${BASE_URL}/api/manager/students/lookup?code=${studentCode}`, {
      headers: { Cookie: managerCookie },
    }).then((r) => r.json());
    expect(lookup.status).toBe("IN");

    const checkOut = await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ studentCode, type: "CHECK_OUT" }),
    });
    expect(checkOut.status).toBe(200);

    const lookupAfter = await fetch(`${BASE_URL}/api/manager/students/lookup?code=${studentCode}`, {
      headers: { Cookie: managerCookie },
    }).then((r) => r.json());
    expect(lookupAfter.status).toBe("OUT");
  });

  it("gọi lại API lookup nhiều lần liên tiếp (mô phỏng tải lại trang / đăng nhập lại) vẫn cho cùng kết quả", async () => {
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        fetch(`${BASE_URL}/api/manager/students/lookup?code=${studentCode}`, { headers: { Cookie: managerCookie } }).then((r) =>
          r.json()
        )
      )
    );
    expect(results.every((r) => r.status === "OUT")).toBe(true);
  });

  it("học sinh được đánh dấu Vắng mặt 'hôm qua' -> hôm nay KHÔNG kế thừa Vắng mặt (điều chỉnh chỉ có hiệu lực đúng 1 ngày)", async () => {
    const adjust = await fetch(`${BASE_URL}/api/teacher/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: teacherCookie },
      body: JSON.stringify({ studentId, date: yesterday, newStatus: "ABSENT", reason: "Test: vắng mặt hôm qua" }),
    });
    expect(adjust.status).toBe(200);

    const today = await fetch(`${BASE_URL}/api/teacher/overview`, { headers: { Cookie: teacherCookie } }).then((r) => r.json());
    const rowToday = today.rows.find((r: { studentCode: string }) => r.studentCode === studentCode);
    expect(rowToday.effectiveStatus).not.toBe("ABSENT");
    expect(rowToday.adjustment).toBeNull();

    const yest = await fetch(`${BASE_URL}/api/teacher/overview?date=${yesterday}`, { headers: { Cookie: teacherCookie } }).then(
      (r) => r.json()
    );
    const rowYesterday = yest.rows.find((r: { studentCode: string }) => r.studentCode === studentCode);
    expect(rowYesterday.effectiveStatus).toBe("ABSENT");
  });
});

describe("Mốc 00:00 giờ Việt Nam — giao dịch sát nửa đêm phải gắn đúng ngày nghiệp vụ", () => {
  it("giao dịch 23:59:30 ngày D và 00:00:30 ngày D+1 (giờ VN) được tính vào đúng 2 ngày khác nhau, không lệch theo UTC", async () => {
    const dayD = "2026-03-02"; // ngày cố định trong quá khứ để test không phụ thuộc đồng hồ thật
    const dayD1 = "2026-03-03";
    const boundaryCode = `RSTB${randomUUID().slice(0, 6)}`;
    const boundaryStudent = await fetch(`${BASE_URL}/api/admin/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ studentCode: boundaryCode, fullName: "Học sinh Test Mốc Nửa Đêm", classId: testClassId }),
    }).then((r) => r.json());

    const { end: endOfD } = dayBoundsInAppTimezone(dayD);
    const t1 = new Date(endOfD.getTime() - 30 * 1000); // 23:59:30 ngày D giờ VN
    const t2 = new Date(endOfD.getTime() + 30 * 1000); // 00:00:30 ngày D+1 giờ VN

    await prisma.phoneTransaction.create({
      data: { studentId: boundaryStudent.id, classId: testClassId, type: "CHECK_IN", performedById: managerUserId, createdAt: t1 },
    });
    await prisma.phoneTransaction.create({
      data: { studentId: boundaryStudent.id, classId: testClassId, type: "CHECK_IN", performedById: managerUserId, createdAt: t2 },
    });

    const overviewD = await fetch(`${BASE_URL}/api/admin/overview?classId=${testClassId}&date=${dayD}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    const rowD = overviewD.rows.find((r: { studentCode: string }) => r.studentCode === boundaryCode);
    expect(rowD.checkInStatus).toBe("Đã cất");
    expect(new Date(rowD.checkInAt).getTime()).toBe(t1.getTime());

    const overviewD1 = await fetch(`${BASE_URL}/api/admin/overview?classId=${testClassId}&date=${dayD1}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    const rowD1 = overviewD1.rows.find((r: { studentCode: string }) => r.studentCode === boundaryCode);
    expect(rowD1.checkInStatus).toBe("Đã cất");
    expect(new Date(rowD1.checkInAt).getTime()).toBe(t2.getTime());
  });
});

describe("Đồng bộ trên cả 3 cấp tài khoản", () => {
  it("Cấp 1 (MANAGER) không gọi được API Theo dõi/điều chỉnh của Cấp 2/3 — không đổi phân quyền", async () => {
    const res = await fetch(`${BASE_URL}/api/teacher/overview`, { headers: { Cookie: managerCookie } });
    expect(res.status).toBe(403);
  });

  it("Cấp 3 (ADMIN) xem dashboard 'hôm nay' thành công sau khi đổi cách tính mốc ngày (không còn dùng giờ máy chủ)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard`, { headers: { Cookie: adminCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.todayCheckIns).toBe("number");
    expect(typeof body.todayCheckOuts).toBe("number");
    expect(Array.isArray(body.perClass)).toBe(true);
  });

  it("Cấp 3 vẫn chọn được ngày cũ (hôm qua) để tra cứu toàn trường, dữ liệu khớp với Cấp 2", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/overview?classId=${testClassId}&date=${yesterdayVNStr()}`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find((r: { studentCode: string }) => r.studentCode === studentCode);
    expect(row.checkInStatus).toBe("Đã cất");
  });
});
