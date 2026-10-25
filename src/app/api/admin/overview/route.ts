import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, authErrorResponse } from "@/lib/auth/guard";
import { getClassesDayOverview } from "@/lib/overview";
import { isValidDateStr, todayInAppTimezone } from "@/lib/timezone";

/**
 * Theo dõi cất/trả toàn trường cho Cấp 3 — xem được BẤT KỲ lớp nào (không giới hạn theo
 * ClassAssignment như Cấp 2), nhưng vẫn phải chọn đúng 1 lớp + đúng 1 ngày mỗi lần gọi.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "ADMIN");

    const classId = req.nextUrl.searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ error: "Thiếu lớp cần xem" }, { status: 400 });
    }
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
    }

    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ?? todayInAppTimezone();
    if (!isValidDateStr(date)) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }

    const rows = await getClassesDayOverview([classId], date);
    return NextResponse.json({ date, classCode: cls.code, rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}
