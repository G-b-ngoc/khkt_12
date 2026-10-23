/**
 * Seed dữ liệu DEMO cho môi trường phát triển/thử nghiệm.
 * KHÔNG dùng dữ liệu học sinh thật — toàn bộ tên/mã học sinh dưới đây là dữ liệu giả.
 *
 * Mật khẩu tài khoản quản trị (ADMIN) bắt buộc lấy từ biến môi trường SEED_ADMIN_PASSWORD,
 * không hardcode, không chấp nhận giá trị mặc định dễ đoán. Mật khẩu cấp 1/cấp 2 dùng
 * mật khẩu demo cố định — PHẢI đổi trước khi dùng với dữ liệu thật.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const WEAK_PASSWORDS = new Set([
  "admin",
  "admin123",
  "123456",
  "password",
  "changeme",
  "change-me-before-seeding",
]);

function assertStrongAdminPassword(pw: string | undefined): string {
  if (!pw) {
    throw new Error(
      "Thiếu SEED_ADMIN_PASSWORD trong .env — hãy đặt một mật khẩu mạnh trước khi seed."
    );
  }
  if (pw.length < 10 || WEAK_PASSWORDS.has(pw.toLowerCase())) {
    throw new Error(
      "SEED_ADMIN_PASSWORD quá yếu hoặc là giá trị mặc định dễ đoán. " +
        "Hãy đặt mật khẩu mạnh (>=10 ký tự, không dùng từ phổ biến) trong .env rồi chạy lại."
    );
  }
  return pw;
}

async function main() {
  const adminPassword = assertStrongAdminPassword(process.env.SEED_ADMIN_PASSWORD);
  const demoPassword = "Demo@123"; // DEMO ONLY — đổi trước khi dùng dữ liệu thật

  const classes = await Promise.all(
    [
      { code: "12A1", name: "Lớp 12A1" },
      { code: "12A2", name: "Lớp 12A2" },
    ].map((c) =>
      prisma.class.upsert({ where: { code: c.code }, update: {}, create: c })
    )
  );
  const [c12a1, c12a2] = classes;

  const studentData = [
    { code: "HS1201", name: "Nguyễn Văn An", classId: c12a1.id },
    { code: "HS1202", name: "Trần Thị Bình", classId: c12a1.id },
    { code: "HS1203", name: "Lê Văn Cường", classId: c12a1.id },
    { code: "HS1204", name: "Phạm Thị Dung", classId: c12a1.id },
    { code: "HS1205", name: "Hoàng Văn Em", classId: c12a1.id },
    { code: "HS1221", name: "Đỗ Thị Hoa", classId: c12a2.id },
    { code: "HS1222", name: "Vũ Văn Giang", classId: c12a2.id },
    { code: "HS1223", name: "Bùi Thị Hạnh", classId: c12a2.id },
    { code: "HS1224", name: "Ngô Văn Inh", classId: c12a2.id },
    { code: "HS1225", name: "Đặng Thị Kim", classId: c12a2.id },
  ];
  for (const s of studentData) {
    await prisma.student.upsert({
      where: { studentCode: s.code },
      update: {},
      create: { studentCode: s.code, fullName: s.name, classId: s.classId },
    });
  }

  const demoHash = await hashPassword(demoPassword);
  const adminHash = await hashPassword(adminPassword);

  const manager12a1 = await prisma.user.upsert({
    where: { username: "manager_12a1" },
    update: {},
    create: {
      username: "manager_12a1",
      fullName: "Quản lý lớp 12A1",
      passwordHash: demoHash,
      role: "MANAGER",
    },
  });
  const manager12a2 = await prisma.user.upsert({
    where: { username: "manager_12a2" },
    update: {},
    create: {
      username: "manager_12a2",
      fullName: "Quản lý lớp 12A2",
      passwordHash: demoHash,
      role: "MANAGER",
    },
  });
  const teacher12a1 = await prisma.user.upsert({
    where: { username: "teacher_12a1" },
    update: {},
    create: {
      username: "teacher_12a1",
      fullName: "GVCN lớp 12A1",
      passwordHash: demoHash,
      role: "TEACHER",
    },
  });
  const teacher12a2 = await prisma.user.upsert({
    where: { username: "teacher_12a2" },
    update: {},
    create: {
      username: "teacher_12a2",
      fullName: "GVCN lớp 12A2",
      passwordHash: demoHash,
      role: "TEACHER",
    },
  });
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Quản trị viên hệ thống",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const assignments: Array<{ userId: string; classId: string; role: "MANAGER" | "TEACHER" }> = [
    { userId: manager12a1.id, classId: c12a1.id, role: "MANAGER" },
    { userId: manager12a2.id, classId: c12a2.id, role: "MANAGER" },
    { userId: teacher12a1.id, classId: c12a1.id, role: "TEACHER" },
    { userId: teacher12a2.id, classId: c12a2.id, role: "TEACHER" },
  ];
  for (const a of assignments) {
    await prisma.classAssignment.upsert({
      where: { userId_classId_role: a },
      update: {},
      create: a,
    });
  }

  console.log("Seed thành công. Tài khoản demo:");
  console.table([
    { username: "manager_12a1", role: "MANAGER (Cấp 1)", class: "12A1", password: demoPassword },
    { username: "manager_12a2", role: "MANAGER (Cấp 1)", class: "12A2", password: demoPassword },
    { username: "teacher_12a1", role: "TEACHER (Cấp 2)", class: "12A1", password: demoPassword },
    { username: "teacher_12a2", role: "TEACHER (Cấp 2)", class: "12A2", password: demoPassword },
    { username: "admin", role: "ADMIN (Cấp 3)", class: "-", password: "(lấy từ .env SEED_ADMIN_PASSWORD)" },
  ]);
  console.log(
    "\n⚠ Mật khẩu demo ở trên CHỈ dùng cho môi trường phát triển/thử nghiệm. " +
      "Khi triển khai thật với dữ liệu học sinh thật, phải đổi toàn bộ mật khẩu ngay sau lần đăng nhập đầu tiên."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
