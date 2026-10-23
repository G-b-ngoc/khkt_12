import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9_.]+$/i, "Chỉ gồm chữ, số, _ hoặc ."),
  fullName: z.string().min(1).max(150),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  role: z.enum(["MANAGER", "TEACHER", "ADMIN"]),
  classIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const users = await prisma.user.findMany({
      include: { assignments: { include: { class: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        isLocked: u.isLocked,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        classes: u.assignments.map((a) => a.class.code),
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const json = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    const { username, fullName, password, role, classIds } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash,
        role,
        ...(role !== "ADMIN" && classIds?.length
          ? {
              assignments: {
                create: classIds.map((classId) => ({
                  classId,
                  role: role as "MANAGER" | "TEACHER",
                })),
              },
            }
          : {}),
      },
    });

    // KHÔNG ghi password vào audit log/metadata.
    await writeAuditLog({
      actorId: user.id,
      action: "ACCOUNT_CREATE",
      targetType: "User",
      targetId: created.id,
      metadata: { username, role, classIds: classIds ?? [] },
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
