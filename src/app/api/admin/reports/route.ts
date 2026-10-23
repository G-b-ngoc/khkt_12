import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const reports = await prisma.weeklyReport.findMany({
      include: { class: true },
      orderBy: [{ weekStart: "desc" }, { scope: "asc" }],
      take: 100,
    });

    return NextResponse.json(
      reports.map((r) => ({
        id: r.id,
        scope: r.scope,
        classCode: r.class?.code ?? "Toàn trường",
        weekStart: r.weekStart.toISOString(),
        weekEnd: r.weekEnd.toISOString(),
        status: r.status,
        hasIssues: !!r.dataIssues,
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
