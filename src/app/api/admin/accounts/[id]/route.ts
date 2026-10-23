import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, AuthzError, authErrorResponse } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({
  action: z.enum(["LOCK", "UNLOCK", "RESET_PASSWORD", "REASSIGN"]),
  newPassword: z.string().min(8).optional(),
  classIds: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser();
    requireRole(admin, "ADMIN");
    const { id } = await params;

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const { action, newPassword, classIds } = parsed.data;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    if (action === "LOCK") {
      if (target.id === admin.id) {
        throw new AuthzError("Không thể tự khóa tài khoản của chính mình", 400);
      }
      await prisma.user.update({ where: { id }, data: { isLocked: true } });
      await revokeAllSessionsForUser(id); // khóa thì thu hồi ngay mọi phiên đang mở
      await writeAuditLog({ actorId: admin.id, action: "ACCOUNT_LOCK", targetType: "User", targetId: id });
    } else if (action === "UNLOCK") {
      await prisma.user.update({ where: { id }, data: { isLocked: false } });
      await writeAuditLog({ actorId: admin.id, action: "ACCOUNT_UNLOCK", targetType: "User", targetId: id });
    } else if (action === "RESET_PASSWORD") {
      if (!newPassword) {
        return NextResponse.json({ error: "Thiếu mật khẩu mới" }, { status: 400 });
      }
      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({ where: { id }, data: { passwordHash } });
      await revokeAllSessionsForUser(id); // đổi mật khẩu -> buộc đăng nhập lại
      // Không ghi mật khẩu mới vào audit log.
      await writeAuditLog({ actorId: admin.id, action: "ACCOUNT_RESET_PASSWORD", targetType: "User", targetId: id });
    } else if (action === "REASSIGN") {
      if (target.role === "ADMIN") {
        return NextResponse.json({ error: "Tài khoản quản trị không gán theo lớp" }, { status: 400 });
      }
      await prisma.classAssignment.deleteMany({ where: { userId: id, role: target.role as "MANAGER" | "TEACHER" } });
      if (classIds?.length) {
        await prisma.classAssignment.createMany({
          data: classIds.map((classId) => ({ userId: id, classId, role: target.role as "MANAGER" | "TEACHER" })),
        });
      }
      await writeAuditLog({
        actorId: admin.id,
        action: "ACCOUNT_REASSIGN",
        targetType: "User",
        targetId: id,
        metadata: { classIds: classIds ?? [] },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
