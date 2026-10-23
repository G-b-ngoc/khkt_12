import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");
    const { id } = await params;

    const { count } = await prisma.weeklyReport.updateMany({
      where: { id, status: { notIn: ["SENT", "CANCELLED"] } },
      data: { status: "POSTPONED" },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Không thể hoãn báo cáo ở trạng thái hiện tại" }, { status: 409 });
    }

    await writeAuditLog({ actorId: user.id, action: "REPORT_POSTPONE", targetType: "WeeklyReport", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
