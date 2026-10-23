import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, requireClassAccess, authErrorResponse } from "@/lib/auth/guard";
import { getStudentPhoneStatus, statusLabel } from "@/lib/phone";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "MANAGER");

    const code = req.nextUrl.searchParams.get("code")?.trim();
    if (!code) {
      return NextResponse.json({ error: "Thiếu mã học sinh" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentCode: code },
      include: { class: true },
    });

    // Không tiết lộ học sinh có tồn tại ở lớp khác hay không — cùng một thông báo chung.
    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json({ error: "Không tìm thấy học sinh trong lớp bạn quản lý" }, { status: 404 });
    }
    try {
      requireClassAccess(user, student.classId, "MANAGER");
    } catch {
      return NextResponse.json({ error: "Không tìm thấy học sinh trong lớp bạn quản lý" }, { status: 404 });
    }

    const status = await getStudentPhoneStatus(student.id);

    return NextResponse.json({
      studentCode: student.studentCode,
      fullName: student.fullName,
      classCode: student.class.code,
      status,
      statusLabel: statusLabel(status),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
