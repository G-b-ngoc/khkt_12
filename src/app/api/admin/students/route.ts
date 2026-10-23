import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  studentCode: z.string().min(1).max(30),
  fullName: z.string().min(1).max(150),
  classId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const classId = req.nextUrl.searchParams.get("classId") ?? undefined;
    const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "1";

    const students = await prisma.student.findMany({
      where: { ...(classId ? { classId } : {}), ...(includeArchived ? {} : { status: "ACTIVE" }) },
      include: { class: true, _count: { select: { transactions: true } } },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json(
      students.map((s) => ({
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        classCode: s.class.code,
        classId: s.classId,
        status: s.status,
        transactionCount: s._count.transactions,
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

    const existing = await prisma.student.findUnique({ where: { studentCode: parsed.data.studentCode } });
    if (existing) {
      return NextResponse.json({ error: "Mã học sinh đã tồn tại" }, { status: 409 });
    }

    const student = await prisma.student.create({ data: parsed.data });
    await writeAuditLog({
      actorId: user.id,
      action: "STUDENT_CREATE",
      targetType: "Student",
      targetId: student.id,
      metadata: { studentCode: student.studentCode },
    });

    return NextResponse.json({ id: student.id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
