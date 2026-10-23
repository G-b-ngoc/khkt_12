import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const logs = await prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(
      logs.map((l) => ({
        id: l.id,
        actorName: l.actor.fullName,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
