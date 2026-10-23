import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { generateWeeklyDrafts } from "@/lib/reports";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({
  weekStart: z.string(), // YYYY-MM-DD, quy ước là ngày Thứ Hai của tuần
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const weekStart = new Date(parsed.data.weekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const ids = await generateWeeklyDrafts(weekStart, weekEnd);

    await writeAuditLog({
      actorId: user.id,
      action: "REPORT_GENERATE_DRAFTS",
      targetType: "WeeklyReport",
      targetId: ids.join(","),
      metadata: { weekStart: weekStart.toISOString(), count: ids.length },
    });

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}
