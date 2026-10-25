import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";
import { computeDayPhoneState, type DayTxn } from "@/lib/phone";

/**
 * Tổng hợp trạng thái cất/trả của toàn bộ học sinh thuộc (các) lớp giáo viên được phân công,
 * cho ĐÚNG MỘT ngày được chọn (không trộn giao dịch nhiều ngày vào một bản ghi).
 * Chỉ xem — giống /api/teacher/students và /api/teacher/transactions, không có API ghi nào ở đây.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    // classId lấy từ ClassAssignment của user đang đăng nhập — không nhận classId từ client,
    // nên không thể bị sửa qua query string để xem lớp khác.
    const classIds = getAssignedClassIds(user, "TEACHER");

    const dateParam = req.nextUrl.searchParams.get("date");
    const day = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(day.getTime())) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    if (classIds.length === 0) {
      return NextResponse.json({ date: start.toISOString().slice(0, 10), rows: [] });
    }

    const [students, txns] = await Promise.all([
      prisma.student.findMany({
        where: { classId: { in: classIds }, status: "ACTIVE" },
        include: { class: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.phoneTransaction.findMany({
        where: { classId: { in: classIds }, createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const txnsByStudent = new Map<string, DayTxn[]>();
    for (const t of txns) {
      const list = txnsByStudent.get(t.studentId) ?? [];
      list.push({ type: t.type, createdAt: t.createdAt, note: t.note });
      txnsByStudent.set(t.studentId, list);
    }

    const rows = students.map((s) => {
      const dayState = computeDayPhoneState(txnsByStudent.get(s.id) ?? []);
      return {
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        classCode: s.class.code,
        ...dayState,
      };
    });

    return NextResponse.json({ date: start.toISOString().slice(0, 10), rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}
