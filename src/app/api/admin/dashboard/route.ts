import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [classCount, studentCount, lockedAccounts, todayCheckIns, todayCheckOuts, pendingReports, classes] =
      await Promise.all([
        prisma.class.count(),
        prisma.student.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { isLocked: true } }),
        prisma.phoneTransaction.count({ where: { type: "CHECK_IN", createdAt: { gte: startOfDay } } }),
        prisma.phoneTransaction.count({ where: { type: "CHECK_OUT", createdAt: { gte: startOfDay } } }),
        prisma.weeklyReport.count({ where: { status: { in: ["DRAFT", "PREVIEW"] } } }),
        prisma.class.findMany({ include: { students: { where: { status: "ACTIVE" } } } }),
      ]);

    const perClass = await Promise.all(
      classes.map(async (c) => {
        const checkIns = await prisma.phoneTransaction.count({
          where: { classId: c.id, type: "CHECK_IN", createdAt: { gte: startOfDay } },
        });
        return { classCode: c.code, studentCount: c.students.length, checkInsToday: checkIns };
      })
    );

    return NextResponse.json({
      classCount,
      studentCount,
      lockedAccounts,
      todayCheckIns,
      todayCheckOuts,
      pendingReports,
      perClass,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
