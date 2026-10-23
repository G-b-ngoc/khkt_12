import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, AuthzError, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({ summary: z.string().max(5000) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");
    const { id } = await params;

    const report = await prisma.weeklyReport.findUnique({
      where: { id },
      include: { class: true, approvedBy: true, sendLogs: true },
    });
    if (!report) return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 });

    return NextResponse.json({
      id: report.id,
      scope: report.scope,
      classCode: report.class?.code ?? null,
      weekStart: report.weekStart.toISOString(),
      weekEnd: report.weekEnd.toISOString(),
      status: report.status,
      content: JSON.parse(report.contentJson),
      contentVersion: report.contentVersion,
      dataIssues: report.dataIssues ? JSON.parse(report.dataIssues) : [],
      approvedBy: report.approvedBy?.fullName ?? null,
      approvedAt: report.approvedAt?.toISOString() ?? null,
      recipients: report.recipientsSnapshot ? JSON.parse(report.recipientsSnapshot) : [],
      sendLogs: report.sendLogs.map((l) => ({
        recipient: l.recipient,
        status: l.status,
        adapter: l.adapter,
        error: l.error,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");
    const { id } = await params;

    const json = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const report = await prisma.weeklyReport.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 });
    if (!["DRAFT", "PREVIEW", "POSTPONED"].includes(report.status)) {
      throw new AuthzError("Báo cáo đã gửi hoặc đã hủy, không thể chỉnh sửa", 409);
    }

    const content = JSON.parse(report.contentJson);
    content.summary = parsed.data.summary; // chỉ phần tổng hợp được phép chỉnh sửa

    const updated = await prisma.weeklyReport.update({
      where: { id },
      data: { contentJson: JSON.stringify(content), contentVersion: { increment: 1 }, status: "PREVIEW" },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "REPORT_EDIT_SUMMARY",
      targetType: "WeeklyReport",
      targetId: id,
      metadata: { contentVersion: updated.contentVersion },
    });

    return NextResponse.json({ ok: true, contentVersion: updated.contentVersion });
  } catch (err) {
    return authErrorResponse(err);
  }
}
