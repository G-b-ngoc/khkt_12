import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";
import { getStudentDayEffectiveStatus } from "@/lib/overview";
import { EFFECTIVE_STATUS_CODES_TUPLE } from "@/lib/overviewStatus";
import { dayBoundsInAppTimezone, isValidDateStr } from "@/lib/timezone";

const bodySchema = z.object({
  studentId: z.string().min(1),
  date: z.string().min(1),
  newStatus: z.enum(EFFECTIVE_STATUS_CODES_TUPLE),
  reason: z.string().trim().min(1, "Cần nhập lý do điều chỉnh").max(500),
  note: z.string().trim().max(1000).optional(),
});

/**
 * Điều chỉnh trạng thái hiển thị của 1 học sinh trong 1 ngày — CHỈ GHI THÊM 1 bản ghi mới
 * (DayStatusAdjustment), không bao giờ sửa/xoá PhoneTransaction gốc hay bản điều chỉnh cũ.
 * Bắt buộc lý do; mọi điều kiện quyền + dữ liệu được kiểm tra ở backend, không tin frontend.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    const { studentId, date, newStatus, reason, note } = parsed.data;

    if (!isValidDateStr(date)) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { class: true } });
    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });
    }

    const previousStatus = await getStudentDayEffectiveStatus(studentId, student.classId, date);
    const { start } = dayBoundsInAppTimezone(date);

    const adjustment = await prisma.dayStatusAdjustment.create({
      data: {
        studentId,
        classId: student.classId,
        date: start,
        previousStatus,
        newStatus,
        reason,
        note: note || null,
        adjustedById: user.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "DAY_STATUS_ADJUST",
      targetType: "Student",
      targetId: studentId,
      metadata: {
        classId: student.classId,
        studentCode: student.studentCode,
        date,
        previousStatus,
        newStatus,
        reason,
      },
    });

    return NextResponse.json({
      ok: true,
      adjustment: {
        id: adjustment.id,
        previousStatus,
        newStatus,
        reason,
        note: adjustment.note,
        createdAt: adjustment.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
