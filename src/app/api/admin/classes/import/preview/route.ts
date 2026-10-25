import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { parseWorkbookRows, normalizeImportSheet, classifyRows, type RowOutcome } from "@/lib/importStudents";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — danh sách lớp không cần hơn
const ALLOWED_EXT = /\.(xlsx|xls|csv)$/i;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Dữ liệu tải lên không hợp lệ" }, { status: 400 });
    }
    const classId = String(form.get("classId") ?? "");
    const file = form.get("file");

    if (!classId) {
      return NextResponse.json({ error: "Thiếu lớp cần nhập danh sách" }, { status: 400 });
    }
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file danh sách học sinh" }, { status: 400 });
    }
    if (!ALLOWED_EXT.test(file.name)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ file .xlsx, .xls hoặc .csv" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File quá lớn (tối đa 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let sheetRows: unknown[][];
    try {
      sheetRows = parseWorkbookRows(buffer, file.name);
    } catch {
      return NextResponse.json({ error: "Không đọc được file — hãy kiểm tra lại định dạng" }, { status: 400 });
    }

    const { rows, invalidRows, columnsDetected } = normalizeImportSheet(sheetRows);
    if (!columnsDetected) {
      return NextResponse.json(
        {
          error:
            'Không nhận diện được cột "Mã HS" và "Họ và tên" trong file. Hãy dùng đúng file mẫu hoặc đặt tên cột rõ ràng (ví dụ "Mã HS", "Họ và tên").',
        },
        { status: 400 }
      );
    }

    const outcomes = await classifyRows(rows, classId);
    const invalidOutcomes: RowOutcome[] = invalidRows.map((r) => ({
      rowNumber: r.rowNumber,
      studentCode: "",
      fullName: "",
      outcome: "INVALID",
      reason: r.reason,
    }));
    const allOutcomes = [...outcomes, ...invalidOutcomes].sort((a, b) => a.rowNumber - b.rowNumber);

    const counts = {
      newCount: outcomes.filter((o) => o.outcome === "NEW").length,
      updateCount: outcomes.filter((o) => o.outcome === "UPDATE").length,
      conflictCount: outcomes.filter((o) => o.outcome === "CLASS_CONFLICT").length,
      duplicateCount: outcomes.filter((o) => o.outcome === "DUPLICATE_IN_FILE").length,
      invalidCount: invalidOutcomes.length,
    };
    const validRows = counts.newCount + counts.updateCount;
    const totalRows = allOutcomes.length;

    const batch = await prisma.importBatch.create({
      data: {
        classId,
        uploadedById: user.id,
        fileName: file.name,
        status: "PENDING",
        rowsJson: JSON.stringify(rows),
        totalRows,
        validRows,
        invalidCount: counts.invalidCount,
      },
    });

    return NextResponse.json({
      batchId: batch.id,
      classCode: cls.code,
      fileName: file.name,
      totalRows,
      validRows,
      ...counts,
      rows: allOutcomes,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
