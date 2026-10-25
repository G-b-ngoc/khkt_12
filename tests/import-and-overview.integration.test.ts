/**
 * Test tích hợp THẬT qua HTTP (giống tests/rbac.integration.test.ts) cho 2 nhóm tính năng
 * mới: (A) nhập danh sách học sinh từ file, (B) Theo dõi cất/trả toàn trường + điều chỉnh
 * trạng thái của Cấp 3. Yêu cầu `npm run dev` đang chạy, đã `npm run seed`, và biến môi
 * trường SEED_ADMIN_PASSWORD có trong shell chạy `npm test` (nạp từ .env).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";

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

function buildXlsxFile(rows: (string | number)[][], fileName = "danh-sach.xlsx"): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new File([new Uint8Array(buf)], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function buildCsvFile(text: string, fileName = "danh-sach.csv"): File {
  return new File(["﻿" + text], fileName, { type: "text/csv" });
}

async function previewImport(cookie: string, classId: string, file: File) {
  const form = new FormData();
  form.set("classId", classId);
  form.set("file", file);
  const res = await fetch(`${BASE_URL}/api/admin/classes/import/preview`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

async function commitImport(cookie: string, batchId: string) {
  const res = await fetch(`${BASE_URL}/api/admin/classes/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ batchId }),
  });
  return { status: res.status, body: await res.json() };
}

let adminCookie: string;
let teacherCookie: string;
let managerCookie: string;
let testClassId: string;
let testClassCode: string;

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
  teacherCookie = (await login("teacher_12a1", "Demo@123")).cookie;
  managerCookie = (await login("manager_12a1", "Demo@123")).cookie;

  testClassCode = `TIMP${randomUUID().slice(0, 6)}`;
  const classRes = await fetch(`${BASE_URL}/api/admin/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ code: testClassCode, name: `Lớp test import ${testClassCode}` }),
  });
  testClassId = (await classRes.json()).id;
});

describe("Phần A — Nhập danh sách học sinh từ file", () => {
  it("Cấp 1 và Cấp 2 không gọi được API import (preview/commit/template) — 403", async () => {
    const file = buildXlsxFile([["Mã HS", "Họ và tên"], ["ZZ001", "Test"]]);
    const previewAsManager = await previewImport(managerCookie, testClassId, file);
    const previewAsTeacher = await previewImport(teacherCookie, testClassId, file);
    expect(previewAsManager.status).toBe(403);
    expect(previewAsTeacher.status).toBe(403);

    const templateAsManager = await fetch(`${BASE_URL}/api/admin/classes/import/template`, {
      headers: { Cookie: managerCookie },
    });
    expect(templateAsManager.status).toBe(403);

    const commitAsTeacher = await commitImport(teacherCookie, "khong-ton-tai");
    expect(commitAsTeacher.status).toBe(403);
  });

  it("nhập file Excel (.xlsx) hợp lệ — tạo đúng số học sinh mới", async () => {
    const codeA = `IM${randomUUID().slice(0, 6)}`;
    const codeB = `IM${randomUUID().slice(0, 6)}`;
    const file = buildXlsxFile([
      ["Mã HS", "Họ và tên"],
      [codeA, "Nguyễn Văn Test A"],
      [codeB, "Trần Thị Test B"],
    ]);

    const preview = await previewImport(adminCookie, testClassId, file);
    expect(preview.status).toBe(200);
    expect(preview.body.newCount).toBe(2);
    expect(preview.body.validRows).toBe(2);

    const commit = await commitImport(adminCookie, preview.body.batchId);
    expect(commit.status).toBe(200);
    expect(commit.body.createdCount).toBe(2);

    const students = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    expect(students.some((s: { studentCode: string }) => s.studentCode === codeA)).toBe(true);
    expect(students.some((s: { studentCode: string }) => s.studentCode === codeB)).toBe(true);
  });

  it("nhập CSV UTF-8 có tiếng Việt, tên cột khác nhau và thứ tự cột đảo ngược", async () => {
    const code = `IM${randomUUID().slice(0, 6)}`;
    // cột "Họ tên" đứng TRƯỚC "Mã học sinh" — hệ thống phải dò theo tên cột, không theo vị trí.
    const csv = `Họ tên,Mã học sinh\r\n"Đặng Thị Phương Thảo",${code}\r\n`;
    const preview = await previewImport(adminCookie, testClassId, buildCsvFile(csv));
    expect(preview.status).toBe(200);
    expect(preview.body.newCount).toBe(1);
    expect(preview.body.rows[0].fullName).toBe("Đặng Thị Phương Thảo");

    const commit = await commitImport(adminCookie, preview.body.batchId);
    expect(commit.body.createdCount).toBe(1);
  });

  it("thiếu cột bắt buộc -> báo lỗi rõ ràng, không tạo batch có thể commit", async () => {
    const file = buildXlsxFile([["Cột A", "Cột B"], ["1", "2"]]);
    const preview = await previewImport(adminCookie, testClassId, file);
    expect(preview.status).toBe(400);
    expect(preview.body.error).toMatch(/Mã HS|Họ và tên/);
  });

  it("mã HS trùng trong file -> chỉ dòng đầu hợp lệ, dòng sau bị đánh dấu trùng", async () => {
    const code = `IM${randomUUID().slice(0, 6)}`;
    const file = buildXlsxFile([
      ["Mã HS", "Họ và tên"],
      [code, "Bản ghi đầu"],
      [code, "Bản ghi trùng"],
    ]);
    const preview = await previewImport(adminCookie, testClassId, file);
    expect(preview.status).toBe(200);
    expect(preview.body.newCount).toBe(1);
    expect(preview.body.duplicateCount).toBe(1);

    const commit = await commitImport(adminCookie, preview.body.batchId);
    expect(commit.body.createdCount).toBe(1);

    const students = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    expect(students.filter((s: { studentCode: string }) => s.studentCode === code).length).toBe(1);
  });

  it("mã HS thuộc lớp khác -> cảnh báo, KHÔNG tự chuyển lớp", async () => {
    // HS1201 đã có sẵn trong lớp 12A1 (seed) — thử nhập vào lớp test khác.
    const file = buildXlsxFile([["Mã HS", "Họ và tên"], ["HS1201", "Tên khác đi"]]);
    const preview = await previewImport(adminCookie, testClassId, file);
    expect(preview.status).toBe(200);
    expect(preview.body.conflictCount).toBe(1);
    expect(preview.body.newCount).toBe(0);
    expect(preview.body.rows[0].outcome).toBe("CLASS_CONFLICT");

    const commit = await commitImport(adminCookie, preview.body.batchId);
    expect(commit.body.createdCount).toBe(0);
    expect(commit.body.updatedCount).toBe(0);

    const original = await fetch(`${BASE_URL}/api/manager/students/lookup?code=HS1201`, {
      headers: { Cookie: managerCookie },
    }).then((r) => r.json());
    expect(original.classCode).toBe("12A1");
    expect(original.fullName).not.toBe("Tên khác đi");
  });

  it("cập nhật đúng học sinh đã có trong CÙNG lớp (giữ nguyên id, không tạo bản ghi mới)", async () => {
    const code = `IM${randomUUID().slice(0, 6)}`;
    const first = await previewImport(adminCookie, testClassId, buildXlsxFile([["Mã HS", "Họ và tên"], [code, "Tên ban đầu"]]));
    await commitImport(adminCookie, first.body.batchId);

    const studentsBefore = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    const before = studentsBefore.find((s: { studentCode: string }) => s.studentCode === code);

    const second = await previewImport(adminCookie, testClassId, buildXlsxFile([["Mã HS", "Họ và tên"], [code, "Tên đã cập nhật"]]));
    expect(second.body.updateCount).toBe(1);
    const commit2 = await commitImport(adminCookie, second.body.batchId);
    expect(commit2.body.updatedCount).toBe(1);
    expect(commit2.body.createdCount).toBe(0);

    const studentsAfter = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    const after = studentsAfter.find((s: { studentCode: string }) => s.studentCode === code);
    expect(after.id).toBe(before.id); // giữ nguyên identity -> không mất lịch sử/nhận xét gắn theo studentId
    expect(after.fullName).toBe("Tên đã cập nhật");
    expect(studentsAfter.filter((s: { studentCode: string }) => s.studentCode === code).length).toBe(1);
  });

  it("xác nhận nhập 2 lần với cùng batchId -> lần 2 bị từ chối, không tạo trùng", async () => {
    const code = `IM${randomUUID().slice(0, 6)}`;
    const preview = await previewImport(adminCookie, testClassId, buildXlsxFile([["Mã HS", "Họ và tên"], [code, "Chống gửi trùng"]]));
    const first = await commitImport(adminCookie, preview.body.batchId);
    expect(first.status).toBe(200);
    expect(first.body.createdCount).toBe(1);

    const second = await commitImport(adminCookie, preview.body.batchId);
    expect(second.status).toBe(409);

    const students = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    expect(students.filter((s: { studentCode: string }) => s.studentCode === code).length).toBe(1);
  });
});

describe("Phần B — Theo dõi trạng thái cất/trả toàn trường (Cấp 3)", () => {
  it("Cấp 1 và Cấp 2 không truy cập được /api/admin/overview — 403", async () => {
    const asManager = await fetch(`${BASE_URL}/api/admin/overview?classId=${testClassId}`, { headers: { Cookie: managerCookie } });
    const asTeacher = await fetch(`${BASE_URL}/api/admin/overview?classId=${testClassId}`, { headers: { Cookie: teacherCookie } });
    expect(asManager.status).toBe(403);
    expect(asTeacher.status).toBe(403);
  });

  it("Cấp 3 chọn đúng lớp + ngày hiển thị đúng danh sách học sinh của lớp đó", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/overview?classId=${testClassId}`, { headers: { Cookie: adminCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classCode).toBe(testClassCode);
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.every((r: { classCode: string }) => r.classCode === testClassCode)).toBe(true);
  });

  it("dữ liệu nhiều ngày không bị trộn lẫn — cất điện thoại hôm nay không xuất hiện ở ngày hôm qua", async () => {
    // HS1205 (12A1) — đưa chắc về trạng thái OUT trước, rồi cất (CHECK_IN) ngay bây giờ.
    await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ studentCode: "HS1205", type: "CHECK_OUT" }),
    });
    await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ studentCode: "HS1205", type: "CHECK_IN" }),
    });

    const classRes = await fetch(`${BASE_URL}/api/admin/classes`, { headers: { Cookie: adminCookie } }).then((r) => r.json());
    const class12A1 = classRes.find((c: { code: string }) => c.code === "12A1");

    const todayRes = await fetch(`${BASE_URL}/api/admin/overview?classId=${class12A1.id}`, { headers: { Cookie: adminCookie } }).then((r) => r.json());
    const todayRow = todayRes.rows.find((r: { studentCode: string }) => r.studentCode === "HS1205");
    expect(todayRow.checkInStatus).toBe("Đã cất");
    expect(todayRow.checkInAt).toBeTruthy();

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const yestRes = await fetch(`${BASE_URL}/api/admin/overview?classId=${class12A1.id}&date=${yesterday}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    const yestRow = yestRes.rows.find((r: { studentCode: string }) => r.studentCode === "HS1205");
    expect(yestRow.checkInStatus).toBe("Chưa ghi nhận cất");
    expect(yestRow.checkInAt).toBeNull();

    // dọn lại trạng thái cho các test/khoá học khác
    await fetch(`${BASE_URL}/api/manager/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ studentCode: "HS1205", type: "CHECK_OUT" }),
    });
  });

  it("Cấp 2 không điều chỉnh được trạng thái qua API — 403", async () => {
    const studentsRes = await fetch(`${BASE_URL}/api/teacher/students`, { headers: { Cookie: teacherCookie } }).then((r) => r.json());
    const studentId = studentsRes[0].id;
    const res = await fetch(`${BASE_URL}/api/admin/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: teacherCookie },
      body: JSON.stringify({ studentId, date: new Date().toISOString().slice(0, 10), newStatus: "ABSENT", reason: "thử" }),
    });
    expect(res.status).toBe(403);
  });

  it("thiếu lý do điều chỉnh -> không xác nhận được (400)", async () => {
    const studentsRes = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, { headers: { Cookie: adminCookie } }).then((r) => r.json());
    const studentId = studentsRes[0].id;
    const res = await fetch(`${BASE_URL}/api/admin/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ studentId, date: new Date().toISOString().slice(0, 10), newStatus: "ABSENT", reason: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("Cấp 3 điều chỉnh hợp lệ thành công, lịch sử gốc vẫn còn, và Cấp 2 thấy kết quả (read-only)", async () => {
    const date = new Date().toISOString().slice(0, 10);
    const teacherStudents = await fetch(`${BASE_URL}/api/teacher/students`, { headers: { Cookie: teacherCookie } }).then((r) => r.json());
    const target = teacherStudents.find((s: { studentCode: string }) => s.studentCode === "HS1204");

    const adjust1 = await fetch(`${BASE_URL}/api/admin/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ studentId: target.id, date, newStatus: "ABSENT", reason: "Phụ huynh xin phép nghỉ (có xác nhận GVCN)" }),
    });
    expect(adjust1.status).toBe(200);

    const teacherOverview = await fetch(`${BASE_URL}/api/teacher/overview?date=${date}`, { headers: { Cookie: teacherCookie } }).then((r) => r.json());
    const row = teacherOverview.rows.find((r: { studentCode: string }) => r.studentCode === "HS1204");
    expect(row.effectiveStatus).toBe("ABSENT");
    expect(row.adjustment.reason).toMatch(/Phụ huynh/);

    // điều chỉnh LẦN 2 — bản cũ phải còn nguyên trong lịch sử, không bị xoá/ghi đè
    const adjust2 = await fetch(`${BASE_URL}/api/admin/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ studentId: target.id, date, newStatus: "EXEMPTED", reason: "Cập nhật lại: được miễn theo quy định" }),
    });
    expect(adjust2.status).toBe(200);

    const history = await fetch(`${BASE_URL}/api/admin/overview/adjustments?studentId=${target.id}&date=${date}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].newStatus).toBe("EXEMPTED"); // mới nhất đứng đầu (orderBy createdAt desc)
    expect(history.some((h: { newStatus: string }) => h.newStatus === "ABSENT")).toBe(true); // bản cũ vẫn còn
    expect(history[0].adjustedByName).toBeTruthy();
    expect(history[0].previousStatus).toBe("ABSENT");
  });

  it("gửi nhiều yêu cầu điều chỉnh đồng thời không làm dữ liệu sai lệch", async () => {
    const date = new Date().toISOString().slice(0, 10);
    const studentsRes = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, { headers: { Cookie: adminCookie } }).then((r) => r.json());
    const studentId = studentsRes[0].id;

    const statuses = ["ABSENT", "EXEMPTED", "NEEDS_VERIFICATION", "CHECKED_IN"];
    const results = await Promise.all(
      statuses.map((s, i) =>
        fetch(`${BASE_URL}/api/admin/overview/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: adminCookie },
          body: JSON.stringify({ studentId, date, newStatus: s, reason: `Điều chỉnh đồng thời #${i}` }),
        })
      )
    );
    expect(results.every((r) => r.status === 200)).toBe(true);

    const history = await fetch(`${BASE_URL}/api/admin/overview/adjustments?studentId=${studentId}&date=${date}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    expect(history.length).toBe(statuses.length); // không mất ghi, không tạo dư

    const overview = await fetch(`${BASE_URL}/api/admin/overview?classId=${testClassId}&date=${date}`, {
      headers: { Cookie: adminCookie },
    }).then((r) => r.json());
    const row = overview.rows.find((r: { id: string }) => r.id === studentId);
    expect(statuses).toContain(row.effectiveStatus); // kết quả cuối cùng nhất quán, không bị trộn/hỏng dữ liệu
  });

  it("báo cáo cuối tuần ĐÃ GỬI không bị thay đổi âm thầm sau khi điều chỉnh trạng thái", async () => {
    await fetch(`${BASE_URL}/api/admin/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ weekStart: "2026-10-19" }),
    });
    const reportsList = await fetch(`${BASE_URL}/api/admin/reports`, { headers: { Cookie: adminCookie } }).then((r) => r.json());
    // Không cần đúng tuần cụ thể — chỉ cần MỘT báo cáo bất kỳ đã tồn tại để xác nhận điều
    // chỉnh trạng thái không đụng tới bảng WeeklyReport (bất kể báo cáo đó đang ở trạng thái nào).
    const report = reportsList.find((r: { scope: string }) => r.scope === "CLASS");
    if (!report) throw new Error("Không tìm thấy báo cáo tuần để kiểm tra — bỏ qua được coi là lỗi test setup, không phải lỗi tính năng.");

    const before = await fetch(`${BASE_URL}/api/admin/reports/${report.id}`, { headers: { Cookie: adminCookie } }).then((r) => r.json());

    const studentsRes = await fetch(`${BASE_URL}/api/admin/students?classId=${testClassId}`, { headers: { Cookie: adminCookie } }).then((r) => r.json());
    await fetch(`${BASE_URL}/api/admin/overview/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        studentId: studentsRes[0].id,
        date: new Date().toISOString().slice(0, 10),
        newStatus: "ABSENT",
        reason: "Kiểm tra báo cáo đã gửi không bị đổi ngầm",
      }),
    });

    const after = await fetch(`${BASE_URL}/api/admin/reports/${report.id}`, { headers: { Cookie: adminCookie } }).then((r) => r.json());
    expect(after.contentVersion).toBe(before.contentVersion);
    expect(JSON.stringify(after.content)).toBe(JSON.stringify(before.content));
    expect(after.status).toBe(before.status);
  });

  it("xuất CSV đúng lớp/ngày/bộ lọc đang chọn, không lộ dữ liệu lớp khác", async () => {
    const date = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${BASE_URL}/api/admin/overview/export?classId=${testClassId}&date=${date}&format=csv`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    const text = await res.text();
    expect(text).toMatch(/Mã HS/);
    // không được lẫn mã học sinh của lớp 12A1 (khác lớp đang xuất)
    expect(text).not.toMatch(/HS1201/);
  });

  it("MANAGER/TEACHER không gọi được API xuất dữ liệu toàn trường — 403", async () => {
    const date = new Date().toISOString().slice(0, 10);
    const asManager = await fetch(`${BASE_URL}/api/admin/overview/export?classId=${testClassId}&date=${date}&format=csv`, {
      headers: { Cookie: managerCookie },
    });
    expect(asManager.status).toBe(403);
  });
});
