import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";
import { dayBoundsInAppTimezone, isValidDateStr, todayInAppTimezone } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    const classIds = getAssignedClassIds(user, "TEACHER");
    const type = req.nextUrl.searchParams.get("type"); // CHECK_IN | CHECK_OUT | null (cả hai)
    const dateParam = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD, mặc định hôm nay

    const dateStr = dateParam ?? todayInAppTimezone();
    if (!isValidDateStr(dateStr)) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }
    // Ngày nghiệp vụ theo Asia/Ho_Chi_Minh — KHÔNG dùng setHours(0,0,0,0) theo giờ máy chủ
    // (Vercel chạy UTC), tránh "hôm nay" bị lệch ngày.
    const { start, end } = dayBoundsInAppTimezone(dateStr);

    const transactions = await prisma.phoneTransaction.findMany({
      where: {
        classId: { in: classIds },
        createdAt: { gte: start, lt: end },
        ...(type === "CHECK_IN" || type === "CHECK_OUT" ? { type } : {}),
      },
      include: { student: true, performedBy: true },
      orderBy: { createdAt: "desc" },
      take: 200,
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
