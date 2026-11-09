import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse, AuthzError } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";
import { getStudentDayEffectiveStatus } from "@/lib/overview";
import { dayBoundsInAppTimezone, isValidDateStr } from "@/lib/timezone";

/**
 * 4 trạng thái Cấp 2 được phép tự đặt tay. Không gồm NOT_RECORDED/NEEDS_VERIFICATION — đó là
 * trạng thái suy ra tự động từ giao dịch thật (xem src/lib/phone.ts), không phải quyết định
 * thủ công nên không cho đặt trực tiếp qua điều chỉnh (khác với Cấp 3, vẫn giữ đủ 6 trạng thái
 * ở /api/admin/overview/adjust).
 */
const TEACHER_ADJUSTABLE_STATUS = ["CHECKED_IN", "CHECKED_OUT", "ABSENT", "EXEMPTED"] as const;

const bodySchema = z.object({
  studentId: z.string().min(1),
  date: z.string().min(1),
  newStatus: z.enum(TEACHER_ADJUSTABLE_STATUS),
  reason: z.string().trim().min(1, "Cần nhập lý do điều chỉnh").max(500),
  note: z.string().trim().max(1000).optional(),
});

/**
 * Điều chỉnh trạng thái hiển thị của 1 học sinh trong 1 ngày — bản CHO CẤP 2 (giáo viên chủ
 * nhiệm), chỉ áp dụng cho đúng lớp giáo viên đang đăng nhập được phân công. Dùng lại đúng
 * bảng `DayStatusAdjustment` và quy trình bắt buộc lý do như Cấp 3
 * (xem src/app/api/admin/overview/adjust/route.ts) — KHÔNG tạo bảng/mô hình dữ liệu riêng,
 * KHÔNG bao giờ sửa/xoá PhoneTransaction gốc hay bản điều chỉnh cũ (chỉ ghi thêm bản mới).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

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

    // Kiểm tra quyền sở hữu lớp trên MỖI yêu cầu — classId không nhận trực tiếp từ client,
    // suy ra từ hồ sơ học sinh thật rồi so với ClassAssignment của giáo viên đang đăng nhập.
    // Chặn được cả việc giả mạo studentId của lớp khác.
    const assignedClassIds = getAssignedClassIds(user, "TEACHER");
    if (!assignedClassIds.includes(student.classId)) {
      throw new AuthzError("Bạn không được phân công vào lớp của học sinh này", 403);
    }

    // "Đã trả" chỉ hợp lệ khi đã có giao dịch cất THẬT trong đúng ngày đang xét — Cấp 2 không
    // được tự đặt "Đã trả" cho học sinh chưa từng cất trong ngày; trường hợp đặc biệt đó
    // (ví dụ dữ liệu lịch sử/khác thường) để Cấp 3 xử lý riêng qua /api/admin/overview/adjust.
    if (newStatus === "CHECKED_OUT") {
      const { start, end } = dayBoundsInAppTimezone(date);
      const hasCheckIn = await prisma.phoneTransaction.findFirst({
        where: { studentId, type: "CHECK_IN", createdAt: { gte: start, lt: end } },
      });
      if (!hasCheckIn) {
        return NextResponse.json(
          {
            error:
              "Chưa có giao dịch cất điện thoại trong ngày này nên không thể đánh dấu Đã trả. Trường hợp đặc biệt này cần Cấp 3 xử lý.",
          },
          { status: 400 }
        );
      }
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
        performedByRole: "TEACHER",
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
