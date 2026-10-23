import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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

    const cls = await prisma.class.update({ where: { id }, data: parsed.data });
    await writeAuditLog({
      actorId: user.id,
      action: "CLASS_UPDATE",
      targetType: "Class",
      targetId: id,
      metadata: parsed.data,
    });

    return NextResponse.json({ id: cls.id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
