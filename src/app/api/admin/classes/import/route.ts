import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";

/** Nhật ký các lần nhập danh sách học sinh từ file — tài khoản, thời gian, lớp, file, kết quả. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const classId = req.nextUrl.searchParams.get("classId") ?? undefined;

    const batches = await prisma.importBatch.findMany({
      where: { ...(classId ? { classId } : {}), status: { not: "PENDING" } },
      include: { class: true, uploadedBy: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      batches.map((b) => ({
        id: b.id,
        classCode: b.class.code,
        fileName: b.fileName,
        status: b.status,
        totalRows: b.totalRows,
        validRows: b.validRows,
        createdCount: b.createdCount,
        updatedCount: b.updatedCount,
        conflictCount: b.conflictCount,
        duplicateCount: b.duplicateCount,
        invalidCount: b.invalidCount,
        errorMessage: b.errorMessage,
        uploadedByName: b.uploadedBy.fullName,
        createdAt: b.createdAt.toISOString(),
        committedAt: b.committedAt?.toISOString() ?? null,
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}
