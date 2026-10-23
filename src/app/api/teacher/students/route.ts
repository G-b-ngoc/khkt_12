import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";
import { getStudentPhoneStatus, statusLabel } from "@/lib/phone";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    const classIds = getAssignedClassIds(user, "TEACHER");
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const students = await prisma.student.findMany({
      where: {
        classId: { in: classIds },
        status: "ACTIVE",
        ...(q
          ? {
              OR: [
                { fullName: { contains: q } },
                { studentCode: { contains: q } },
              ],
            }
          : {}),
      },
      include: { class: true },
      orderBy: { fullName: "asc" },
    });

    const withStatus = await Promise.all(
      students.map(async (s) => {
        const status = await getStudentPhoneStatus(s.id);
        return {
          id: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          classCode: s.class.code,
          status,
          statusLabel: statusLabel(status),
        };
      })
    );

    return NextResponse.json(withStatus);
  } catch (err) {
    return authErrorResponse(err);
  }
}
