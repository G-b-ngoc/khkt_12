import { prisma } from "@/lib/prisma";
import { computeDayPhoneState, type DayTxn } from "@/lib/phone";
import { dayBoundsInAppTimezone } from "@/lib/timezone";
import { EFFECTIVE_STATUS_LABEL, EFFECTIVE_STATUS_CODES, type EffectiveStatusCode } from "@/lib/overviewStatus";

export { EFFECTIVE_STATUS_LABEL, EFFECTIVE_STATUS_CODES, type EffectiveStatusCode };

export type AdjustmentInfo = {
  newStatus: EffectiveStatusCode;
  reason: string;
  note: string | null;
  adjustedByName: string;
  createdAt: string;
};

export type OverviewRow = {
  id: string;
  studentCode: string;
  fullName: string;
  classId: string;
  classCode: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInStatus: "Đã cất" | "Chưa ghi nhận cất";
  checkOutStatus: "Đã trả" | "Cần xác minh" | "Chưa áp dụng";
  note: string | null;
  effectiveStatus: EffectiveStatusCode;
  adjustment: AdjustmentInfo | null;
};

function deriveMechanicalStatus(
  checkInStatus: OverviewRow["checkInStatus"],
  checkOutStatus: OverviewRow["checkOutStatus"]
): EffectiveStatusCode {
  if (checkInStatus === "Chưa ghi nhận cất") return "NOT_RECORDED";
  if (checkOutStatus === "Đã trả") return "CHECKED_OUT";
  if (checkOutStatus === "Cần xác minh") return "NEEDS_VERIFICATION";
  return "CHECKED_IN";
}

/**
 * Trạng thái cất/trả của toàn bộ học sinh ACTIVE trong các lớp `classIds`, cho ĐÚNG 1 ngày
 * (`dateStr`, "YYYY-MM-DD" theo Asia/Ho_Chi_Minh) — dùng chung cho Cấp 2 (lớp mình) và Cấp 3
 * (chọn lớp bất kỳ). Nếu Cấp 3 đã điều chỉnh trạng thái ngày đó cho 1 học sinh, bản điều
 * chỉnh MỚI NHẤT (theo createdAt) ghi đè effectiveStatus hiển thị — không xoá/sửa
 * PhoneTransaction gốc, lịch sử giao dịch gốc vẫn tính nguyên trong checkInAt/checkOutAt.
 */
export async function getClassesDayOverview(classIds: string[], dateStr: string): Promise<OverviewRow[]> {
  if (classIds.length === 0) return [];
  const { start, end } = dayBoundsInAppTimezone(dateStr);

  const [students, txns, adjustments] = await Promise.all([
    prisma.student.findMany({
      where: { classId: { in: classIds }, status: "ACTIVE" },
      include: { class: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.phoneTransaction.findMany({
      where: { classId: { in: classIds }, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dayStatusAdjustment.findMany({
      where: { classId: { in: classIds }, date: start },
      include: { adjustedBy: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const txnsByStudent = new Map<string, DayTxn[]>();
  for (const t of txns) {
    const list = txnsByStudent.get(t.studentId) ?? [];
    list.push({ type: t.type, createdAt: t.createdAt, note: t.note });
    txnsByStudent.set(t.studentId, list);
  }

  // adjustments đã orderBy createdAt asc -> set() sau ghi đè set() trước, nên bản còn lại
  // trong Map luôn là bản ĐIỀU CHỈNH MỚI NHẤT (hiệu lực hiển thị) cho mỗi học sinh.
  const latestAdjustmentByStudent = new Map<string, (typeof adjustments)[number]>();
  for (const adj of adjustments) {
    latestAdjustmentByStudent.set(adj.studentId, adj);
  }

  return students.map((s) => {
    const dayState = computeDayPhoneState(txnsByStudent.get(s.id) ?? []);
    const mechanicalStatus = deriveMechanicalStatus(dayState.checkInStatus, dayState.checkOutStatus);
    const adj = latestAdjustmentByStudent.get(s.id);

    return {
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      classId: s.classId,
      classCode: s.class.code,
      checkInAt: dayState.checkInAt,
      checkOutAt: dayState.checkOutAt,
      checkInStatus: dayState.checkInStatus,
      checkOutStatus: dayState.checkOutStatus,
      note: dayState.note,
      effectiveStatus: adj ? (adj.newStatus as EffectiveStatusCode) : mechanicalStatus,
      adjustment: adj
        ? {
            newStatus: adj.newStatus as EffectiveStatusCode,
            reason: adj.reason,
            note: adj.note,
            adjustedByName: adj.adjustedBy.fullName,
            createdAt: adj.createdAt.toISOString(),
          }
        : null,
    };
  });
}

/** Trạng thái hiệu lực hiện tại của 1 học sinh trong 1 ngày — dùng làm `previousStatus` khi tạo điều chỉnh mới. */
export async function getStudentDayEffectiveStatus(
  studentId: string,
  classId: string,
  dateStr: string
): Promise<EffectiveStatusCode> {
  const { start, end } = dayBoundsInAppTimezone(dateStr);
  const [txns, latestAdjustment] = await Promise.all([
    prisma.phoneTransaction.findMany({
      where: { studentId, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dayStatusAdjustment.findFirst({
      where: { studentId, classId, date: start },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (latestAdjustment) return latestAdjustment.newStatus as EffectiveStatusCode;
  const dayState = computeDayPhoneState(txns.map((t) => ({ type: t.type, createdAt: t.createdAt, note: t.note })));
  return deriveMechanicalStatus(dayState.checkInStatus, dayState.checkOutStatus);
}
