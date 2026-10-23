import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, requireClassAccess, authErrorResponse } from "@/lib/auth/guard";
import { getStudentPhoneStatus, statusLabel } from "@/lib/phone";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });
    }
    requireClassAccess(user, student.classId, "TEACHER");

    const [status, transactions, comments] = await Promise.all([
      getStudentPhoneStatus(student.id),
      prisma.phoneTransaction.findMany({
        where: { studentId: student.id },
        include: { performedBy: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.teacherComment.findMany({
        where: { studentId: student.id },
        include: { author: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      classCode: student.class.code,
      status,
      statusLabel: statusLabel(status),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        performedBy: t.performedBy.fullName,
        createdAt: t.createdAt.toISOString(),
      })),
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        authorId: c.authorId,
        authorName: c.author.fullName,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        editable: c.authorId === user.id,
      })),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
