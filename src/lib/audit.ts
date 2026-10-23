import { prisma } from "@/lib/prisma";

/**
 * Ghi nhật ký kiểm toán cho hành động quản trị quan trọng.
 * KHÔNG được truyền password, token, hoặc cookie vào metadata.
 */
export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}
