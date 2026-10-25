import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { isValidDateStr, dayBoundsInAppTimezone, formatDateInAppTimezone } from "@/lib/timezone";

/** Lịch sử điều chỉnh trạng thái — chỉ xem, không có API sửa/xoá (bảo vệ nhật ký kiểm toán). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const classId = req.nextUrl.searchParams.get("classId") ?? undefined;
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
      where: { ...(classId ? { classId } : {}), ...(studentId ? { studentId } : {}), ...dateFilter },
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
