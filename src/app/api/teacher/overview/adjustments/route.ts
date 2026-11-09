import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";
import { isValidDateStr, dayBoundsInAppTimezone, formatDateInAppTimezone } from "@/lib/timezone";

/**
 * Lịch sử điều chỉnh trạng thái — bản CHO CẤP 2. Luôn lọc theo ClassAssignment của giáo viên
 * đang đăng nhập (không nhận classId từ client) nên không có cách nào xem được lịch sử của
 * lớp khác dù sửa query string thủ công. Chỉ xem, không có API sửa/xoá (bảo vệ nhật ký).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    const classIds = getAssignedClassIds(user, "TEACHER");
    if (classIds.length === 0) return NextResponse.json([]);

    const studentId = req.nextUrl.searchParams.get("studentId") ?? undefined;
    const dateParam = req.nextUrl.searchParams.get("date");

    let dateFilter: { date: Date } | undefined;
    if (dateParam) {
      if (!isValidDateStr(dateParam)) {
        return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
      }
      dateFilter = { date: dayBoundsInAppTimezone(dateParam).start };
    }

    const adjustments = await prisma.dayStatusAdjustment.findMany({
      where: { classId: { in: classIds }, ...(studentId ? { studentId } : {}), ...dateFilter },
      include: { student: true, class: true, adjustedBy: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(
      adjustments.map((a) => ({
        id: a.id,
        studentCode: a.student.studentCode,
        fullName: a.student.fullName,
        classCode: a.class.code,
        date: formatDateInAppTimezone(a.date),
        previousStatus: a.previousStatus,
        newStatus: a.newStatus,
        reason: a.reason,
        note: a.note,
        adjustedByName: a.adjustedBy.fullName,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
