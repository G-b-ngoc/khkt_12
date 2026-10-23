import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, requireClassAccess, authErrorResponse } from "@/lib/auth/guard";
import { getStudentPhoneStatus, statusLabel } from "@/lib/phone";

const bodySchema = z.object({
  studentCode: z.string().min(1),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "MANAGER");

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const { studentCode, type } = parsed.data;

    const student = await prisma.student.findUnique({ where: { studentCode } });
    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ error: "Không tìm thấy học sinh trong lớp bạn quản lý" }, { status: 404 });
    }
    try {
      // classId lấy từ record thật trong DB — không tin classId do client gửi lên,
      // nên không thể bị sửa đổi qua request để thao tác lớp khác.
      requireClassAccess(user, student.classId, "MANAGER");
    } catch {
      return NextResponse.json({ error: "Không tìm thấy học sinh trong lớp bạn quản lý" }, { status: 404 });
    }

    const currentStatus = await getStudentPhoneStatus(student.id);
    const expectedCurrent = type === "CHECK_IN" ? "OUT" : "IN";
    if (currentStatus !== expectedCurrent) {
      const msg =
        type === "CHECK_IN"
          ? "Giao dịch không hợp lệ: học sinh đã cất điện thoại trước đó."
          : "Giao dịch không hợp lệ: học sinh chưa cất điện thoại, không thể trả.";
      return NextResponse.json({ error: msg, invalidTransaction: true }, { status: 409 });
    }

    await prisma.phoneTransaction.create({
      data: {
        studentId: student.id,
        classId: student.classId,
        type,
        performedById: user.id,
      },
    });

    const newStatus = await getStudentPhoneStatus(student.id);

    return NextResponse.json({
      ok: true,
      studentCode: student.studentCode,
      fullName: student.fullName,
      status: newStatus,
      statusLabel: statusLabel(newStatus),
      performedAt: new Date().toISOString(),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
