import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, requireClassAccess, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";

const createSchema = z.object({
  studentId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");
    const classIds = getAssignedClassIds(user, "TEACHER");

    const comments = await prisma.teacherComment.findMany({
      where: { classId: { in: classIds } },
      include: { student: true, author: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        content: c.content,
        studentId: c.studentId,
        studentName: c.student.fullName,
        studentCode: c.student.studentCode,
        authorName: c.author.fullName,
        editable: c.authorId === user.id,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    const json = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }
    const { studentId, content } = parsed.data;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });
    }
    requireClassAccess(user, student.classId, "TEACHER");

    const comment = await prisma.teacherComment.create({
      data: {
        studentId: student.id,
        classId: student.classId,
        authorId: user.id,
        content,
      },
    });

    return NextResponse.json({ id: comment.id, createdAt: comment.createdAt.toISOString() });
  } catch (err) {
    return authErrorResponse(err);
  }
}
