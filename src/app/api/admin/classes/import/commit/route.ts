import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/audit";
import { classifyRows, type ParsedRow } from "@/lib/importStudents";

const bodySchema = z.object({ batchId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Thiếu mã lô nhập dữ liệu" }, { status: 400 });
    }
    const { batchId } = parsed.data;

    const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ error: "Không tìm thấy lô dữ liệu đã xem trước" }, { status: 404 });
    }

    // Chỉ chuyển PENDING -> PROCESSING khi còn PENDING: đảm bảo 1 batch chỉ được xác nhận
    // đúng 1 lần dù người dùng bấm "Xác nhận" nhiều lần hoặc gửi trùng request.
    const { count } = await prisma.importBatch.updateMany({
      where: { id: batchId, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (count === 0) {
      return NextResponse.json(
        { error: "Lô dữ liệu này đã được xử lý trước đó (đã nhập hoặc đã lỗi) — không xử lý lại." },
        { status: 409 }
      );
    }

    try {
      const rows: ParsedRow[] = JSON.parse(batch.rowsJson);
      // Phân loại LẠI theo dữ liệu hiện tại trong DB — không tin kết quả xem trước đã cũ.
      const outcomes = await classifyRows(rows, batch.classId);
      const toCreate = outcomes.filter((o) => o.outcome === "NEW");
      const toUpdate = outcomes.filter((o) => o.outcome === "UPDATE");
      const conflictCount = outcomes.filter((o) => o.outcome === "CLASS_CONFLICT").length;
      const duplicateCount = outcomes.filter((o) => o.outcome === "DUPLICATE_IN_FILE").length;

      await prisma.$transaction(async (tx) => {
        for (const o of toCreate) {
          await tx.student.create({ data: { studentCode: o.studentCode, fullName: o.fullName, classId: batch.classId } });
        }
        for (const o of toUpdate) {
          await tx.student.update({ where: { studentCode: o.studentCode }, data: { fullName: o.fullName } });
        }
      });

      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: "COMMITTED",
          createdCount: toCreate.length,
          updatedCount: toUpdate.length,
          conflictCount,
          duplicateCount,
          committedAt: new Date(),
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "STUDENT_IMPORT_COMMIT",
        targetType: "Class",
        targetId: batch.classId,
        metadata: {
          batchId,
          fileName: batch.fileName,
          totalRows: batch.totalRows,
          validRows: batch.validRows,
          createdCount: toCreate.length,
          updatedCount: toUpdate.length,
          conflictCount,
          duplicateCount,
          invalidCount: batch.invalidCount ?? 0,
        },
      });

      return NextResponse.json({
        ok: true,
        createdCount: toCreate.length,
        updatedCount: toUpdate.length,
        conflictCount,
        duplicateCount,
        invalidCount: batch.invalidCount ?? 0,
      });
    } catch (err) {
      await prisma.importBatch.update({
        where: { id: batchId },
        data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Lỗi không xác định" },
      });
      return NextResponse.json(
        { error: "Nhập dữ liệu thất bại, không có thay đổi nào được lưu. Hãy thử nhập lại." },
        { status: 500 }
      );
    }
  } catch (err) {
    return authErrorResponse(err);
  }
}
