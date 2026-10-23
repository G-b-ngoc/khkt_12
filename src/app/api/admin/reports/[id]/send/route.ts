import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { getMailer } from "@/lib/mail";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({ recipients: z.array(z.string().email()).min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");
    const { id } = await params;

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Cần danh sách người nhận hợp lệ (email)" }, { status: 400 });
    }
    const { recipients } = parsed.data;

    const report = await prisma.weeklyReport.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 });

    // Chặn gửi trùng ở mức DB: chỉ chuyển sang SENT nếu đang KHÔNG ở trạng thái SENT.
    const { count } = await prisma.weeklyReport.updateMany({
      where: { id, status: { not: "SENT" } },
      data: {
        status: "SENT",
        approvedById: user.id,
        approvedAt: new Date(),
        recipientsSnapshot: JSON.stringify(recipients),
      },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Báo cáo này đã được gửi trước đó — không gửi trùng." }, { status: 409 });
    }

    const mailer = getMailer();
    const content = JSON.parse(report.contentJson);
    const subject = `[THB] Báo cáo tuần ${report.weekStart.toLocaleDateString("vi-VN")}`;
    const body = JSON.stringify(content, null, 2);

    const results = await Promise.all(recipients.map((to) => mailer.send(to, subject, body)));
    await prisma.reportSendLog.createMany({
      data: results.map((r, i) => ({
        reportId: id,
        recipient: recipients[i],
        status: r.success ? "SUCCESS" : "FAILED",
        adapter: r.adapter,
        error: r.error,
      })),
    });

    const anyFailed = results.some((r) => !r.success);
    if (anyFailed) {
      await prisma.weeklyReport.update({ where: { id }, data: { status: "FAILED" } });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "REPORT_APPROVE_SEND",
      targetType: "WeeklyReport",
      targetId: id,
      metadata: { recipients, adapter: results[0]?.adapter, anyFailed },
    });

    return NextResponse.json({
      ok: !anyFailed,
      adapter: results[0]?.adapter,
      results,
      isPreviewOnly: results[0]?.adapter === "console-preview",
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
