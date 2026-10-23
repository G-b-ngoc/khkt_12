import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");
    const classIds = getAssignedClassIds(user, "TEACHER");

    // Giáo viên chỉ xem báo cáo ĐÃ GỬI (status = SENT) của đúng lớp mình — không xem bản
    // nháp/đang chờ duyệt, và không xem được báo cáo tổng hợp toàn trường (scope = SCHOOL).
    const reports = await prisma.weeklyReport.findMany({
      where: { scope: "CLASS", classId: { in: classIds }, status: "SENT" },
      orderBy: { weekStart: "desc" },
      take: 20,
    });

    return NextResponse.json(
      reports.map((r) => ({
        id: r.id,
        weekStart: r.weekStart.toISOString(),
        weekEnd: r.weekEnd.toISOString(),
        content: JSON.parse(r.contentJson),
        approvedAt: r.approvedAt?.toISOString() ?? null,
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
