import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";
import {
  getClassesDayOverview,
  EFFECTIVE_STATUS_LABEL,
  type EffectiveStatusCode,
  type OverviewRow,
} from "@/lib/overview";
import { isValidDateStr, todayInAppTimezone, formatTimeInAppTimezone } from "@/lib/timezone";
import { matchesSearchQuery } from "@/lib/search";
import { toCsv, toXlsxBuffer, type ExportColumn } from "@/lib/exportTable";
import { writeAuditLog } from "@/lib/audit";

type ExportRow = OverviewRow & { stt: number };

/** Nhãn hiển thị trùng với bảng trên trang /teacher: nếu Cấp 3 đã điều chỉnh, 2 cột trạng thái đều hiện trạng thái hiệu lực. */
function displayStatus(r: OverviewRow, column: "in" | "out"): string {
  if (r.adjustment) return EFFECTIVE_STATUS_LABEL[r.adjustment.newStatus];
  return column === "in" ? r.checkInStatus : r.checkOutStatus;
}

/** Nhãn chung — bản điều chỉnh có thể do Cấp 2 (giáo viên của chính lớp) hoặc Cấp 3 tạo. */
function displayNote(r: OverviewRow): string {
  if (r.adjustment) return `Đã điều chỉnh (${r.adjustment.adjustedByName}): ${r.adjustment.reason}`;
  return r.note ?? "";
}

function buildColumns(): ExportColumn<ExportRow>[] {
  return [
    { header: "STT", value: (r) => String(r.stt) },
    { header: "Mã học sinh", value: (r) => r.studentCode },
    { header: "Họ và tên", value: (r) => r.fullName },
    { header: "Trạng thái cất điện thoại", value: (r) => displayStatus(r, "in") },
    { header: "Thời gian cất", value: (r) => formatTimeInAppTimezone(r.checkInAt) },
    { header: "Trạng thái trả điện thoại", value: (r) => displayStatus(r, "out") },
    { header: "Thời gian trả", value: (r) => formatTimeInAppTimezone(r.checkOutAt) },
    { header: "Ghi chú", value: (r) => displayNote(r) },
  ];
}

function slugifyClassCodes(codes: string[]): string {
  return codes.join("+").replace(/[^A-Za-z0-9+_-]/g, "_");
}

/**
 * Xuất Excel/CSV danh sách trạng thái cất/trả cho ĐÚNG (các) lớp mà giáo viên đang đăng nhập
 * được phân công (lấy từ ClassAssignment của session, không nhận classId từ client) — cùng
 * một ngày đang xem trên trang /teacher. Tái sử dụng getClassesDayOverview (đã dùng ở
 * /api/teacher/overview và /api/admin/overview/export) nên không có logic tính trạng thái mới.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    const classIds = getAssignedClassIds(user, "TEACHER");
    if (classIds.length === 0) {
      return NextResponse.json({ error: "Bạn chưa được phân công lớp nào" }, { status: 400 });
    }
    const classes = await prisma.class.findMany({ where: { id: { in: classIds } } });

    const date = req.nextUrl.searchParams.get("date") ?? todayInAppTimezone();
    if (!isValidDateStr(date)) return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });

    const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const scope = req.nextUrl.searchParams.get("scope") === "filtered" ? "filtered" : "all";

    let rows = await getClassesDayOverview(classIds, date);

    if (scope === "filtered") {
      const q = req.nextUrl.searchParams.get("q") ?? "";
      const checkIn = req.nextUrl.searchParams.get("checkIn") ?? "ALL";
      const checkOut = req.nextUrl.searchParams.get("checkOut") ?? "ALL";
      const statusFilter = req.nextUrl.searchParams.get("status") as EffectiveStatusCode | null;
      rows = rows.filter((r) => {
        if (checkIn === "DONE" && r.checkInStatus !== "Đã cất") return false;
        if (checkIn === "MISSING" && r.checkInStatus !== "Chưa ghi nhận cất") return false;
        if (checkOut === "DONE" && r.checkOutStatus !== "Đã trả") return false;
        if (checkOut === "NEEDS_VERIFY" && r.checkOutStatus !== "Cần xác minh") return false;
        if (checkOut === "NA" && r.checkOutStatus !== "Chưa áp dụng") return false;
        if (statusFilter && r.effectiveStatus !== statusFilter) return false;
        return matchesSearchQuery(`${r.fullName} ${r.studentCode}`, q);
      });
    }

    const exportRows: ExportRow[] = rows.map((r, i) => ({ ...r, stt: i + 1 }));
    const columns = buildColumns();
    const classLabel = slugifyClassCodes(classes.map((c) => c.code));
    const baseName = `Bao_cao_Edu_Lop_${classLabel}_${date}`;

    await writeAuditLog({
      actorId: user.id,
      action: "TEACHER_OVERVIEW_EXPORT",
      targetType: "Class",
      targetId: classIds[0],
      metadata: { classIds, date, format, scope, rowCount: rows.length },
    });

    if (format === "xlsx") {
      const buffer = toXlsxBuffer(exportRows, columns, "Theo doi");
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
        },
      });
    }

    const csv = toCsv(exportRows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
