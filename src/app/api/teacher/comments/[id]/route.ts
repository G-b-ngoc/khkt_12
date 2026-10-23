import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, requireClassAccess, AuthzError, authErrorResponse } from "@/lib/auth/guard";

const updateSchema = z.object({ content: z.string().min(1).max(2000) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");
    const { id } = await params;

    const json = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const comment = await prisma.teacherComment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: "Không tìm thấy nhận xét" }, { status: 404 });
    }
    requireClassAccess(user, comment.classId, "TEACHER");
    if (comment.authorId !== user.id) {
      throw new AuthzError("Chỉ người viết nhận xét mới được cập nhật", 403);
    }

    const updated = await prisma.teacherComment.update({
      where: { id },
      data: { content: parsed.data.content },
    });

    return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    return authErrorResponse(err);
  }
}
