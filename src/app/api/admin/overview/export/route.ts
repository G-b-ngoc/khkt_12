import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { getClassesDayOverview, EFFECTIVE_STATUS_LABEL, type EffectiveStatusCode, type OverviewRow } from "@/lib/overview";
import { isValidDateStr, todayInAppTimezone, formatTimeInAppTimezone } from "@/lib/timezone";
import { matchesSearchQuery } from "@/lib/search";
import { toCsv, toXlsxBuffer, type ExportColumn } from "@/lib/exportTable";
import { writeAuditLog } from "@/lib/audit";

type ExportRow = OverviewRow & { stt: number };

function buildColumns(): ExportColumn<ExportRow>[] {
  return [
    { header: "STT", value: (r) => String(r.stt) },
    { header: "Mã HS", value: (r) => r.studentCode },
    { header: "Họ và tên", value: (r) => r.fullName },
    { header: "Trạng thái cất", value: (r) => r.checkInStatus },
    { header: "Giờ cất", value: (r) => formatTimeInAppTimezone(r.checkInAt) },
    { header: "Trạng thái trả", value: (r) => r.checkOutStatus },
    { header: "Giờ trả", value: (r) => formatTimeInAppTimezone(r.checkOutAt) },
    { header: "Trạng thái hiệu lực", value: (r) => EFFECTIVE_STATUS_LABEL[r.effectiveStatus] },
    {
      header: "Ghi chú",
      value: (r) => [r.note, r.adjustment ? `Điều chỉnh: ${r.adjustment.reason}` : null].filter(Boolean).join(" | "),
    },
  ];
}

/** Xuất đúng lớp + ngày + bộ lọc đang xem — không xuất dữ liệu ngoài phạm vi được chọn. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const classId = req.nextUrl.searchParams.get("classId");
    if (!classId) return NextResponse.json({ error: "Thiếu lớp cần xuất" }, { status: 400 });
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });

    const date = req.nextUrl.searchParams.get("date") ?? todayInAppTimezone();
    if (!isValidDateStr(date)) return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });

    const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const statusFilter = req.nextUrl.searchParams.get("status") as EffectiveStatusCode | null;

    let rows = await getClassesDayOverview([classId], date);
    if (statusFilter) rows = rows.filter((r) => r.effectiveStatus === statusFilter);
    if (q) rows = rows.filter((r) => matchesSearchQuery(`${r.fullName} ${r.studentCode}`, q));

    const exportRows: ExportRow[] = rows.map((r, i) => ({ ...r, stt: i + 1 }));
    const columns = buildColumns();
    const baseName = `theo-doi_${cls.code}_${date}`;

    await writeAuditLog({
      actorId: user.id,
      action: "OVERVIEW_EXPORT",
      targetType: "Class",
      targetId: classId,
      metadata: { classCode: cls.code, date, format, rowCount: rows.length },
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
