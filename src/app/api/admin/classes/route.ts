import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const classes = await prisma.class.findMany({
      include: {
        students: { where: { status: "ACTIVE" } },
        assignments: { include: { user: true } },
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json(
      classes.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        studentCount: c.students.length,
        managers: c.assignments.filter((a) => a.role === "MANAGER").map((a) => a.user.fullName),
        teachers: c.assignments.filter((a) => a.role === "TEACHER").map((a) => a.user.fullName),
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
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const existing = await prisma.class.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return NextResponse.json({ error: "Mã lớp đã tồn tại" }, { status: 409 });
    }

    const cls = await prisma.class.create({ data: parsed.data });
    await writeAuditLog({
      actorId: user.id,
      action: "CLASS_CREATE",
      targetType: "Class",
      targetId: cls.id,
      metadata: { code: cls.code, name: cls.name },
    });

    return NextResponse.json({ id: cls.id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
