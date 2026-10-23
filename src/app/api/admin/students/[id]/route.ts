import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  classId: z.string().min(1).optional(),
  action: z.enum(["ARCHIVE", "UNARCHIVE", "DELETE"]).optional(),
});

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
    const { action, ...fields } = parsed.data;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });
    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });
    }

    if (action === "DELETE") {
      // Ưu tiên lưu trữ (archive) thay xóa cứng khi hồ sơ đã có giao dịch — tránh mất
      // dữ liệu gốc của PhoneTransaction/TeacherComment đang tham chiếu tới học sinh này.
      if (student._count.transactions > 0) {
        await prisma.student.update({ where: { id }, data: { status: "ARCHIVED" } });
        await writeAuditLog({
          actorId: user.id,
          action: "STUDENT_ARCHIVE_INSTEAD_OF_DELETE",
          targetType: "Student",
          targetId: id,
          metadata: { reason: "Đã có giao dịch, chuyển sang lưu trữ thay xóa cứng" },
        });
        return NextResponse.json({
          ok: true,
          archived: true,
          message: "Học sinh đã có giao dịch nên được chuyển sang trạng thái lưu trữ thay vì xóa.",
        });
      }
      await prisma.student.delete({ where: { id } });
      await writeAuditLog({ actorId: user.id, action: "STUDENT_DELETE", targetType: "Student", targetId: id });
      return NextResponse.json({ ok: true, deleted: true });
    }

    const data: Record<string, unknown> = { ...fields };
    if (action === "ARCHIVE") data.status = "ARCHIVED";
    if (action === "UNARCHIVE") data.status = "ACTIVE";

    const updated = await prisma.student.update({ where: { id }, data });
    await writeAuditLog({
      actorId: user.id,
      action: action ? `STUDENT_${action}` : "STUDENT_UPDATE",
      targetType: "Student",
      targetId: id,
      metadata: fields,
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    return authErrorResponse(err);
  }
}
