import { NextResponse } from "next/server";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { buildTemplateWorkbookBuffer } from "@/lib/importStudents";

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const buffer = buildTemplateWorkbookBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="mau-danh-sach-hoc-sinh.xlsx"',
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
