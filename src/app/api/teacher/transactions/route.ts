import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    const classIds = getAssignedClassIds(user, "TEACHER");
    const type = req.nextUrl.searchParams.get("type"); // CHECK_IN | CHECK_OUT | null (cả hai)
    const dateParam = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD, mặc định hôm nay

    const day = dateParam ? new Date(dateParam) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

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
