import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";
import { dayBoundsInAppTimezone, todayInAppTimezone } from "@/lib/timezone";

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "MANAGER");

    const classIds = getAssignedClassIds(user, "MANAGER");
    // Ngày nghiệp vụ theo Asia/Ho_Chi_Minh — KHÔNG dùng setHours(0,0,0,0) theo giờ máy chủ
    // (Vercel chạy UTC), tránh "hôm nay" bị lệch ngày.
    const { start: startOfDay, end: endOfDay } = dayBoundsInAppTimezone(todayInAppTimezone());

    const transactions = await prisma.phoneTransaction.findMany({
      where: { classId: { in: classIds }, createdAt: { gte: startOfDay, lt: endOfDay } },
      include: { student: true, performedBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(
      transactions.map((t) => ({
        id: t.id,
        studentCode: t.student.studentCode,
        fullName: t.student.fullName,
        type: t.type,
        performedBy: t.performedBy.fullName,
        createdAt: t.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
