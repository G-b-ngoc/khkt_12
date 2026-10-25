import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole, getAssignedClassIds, authErrorResponse } from "@/lib/auth/guard";
import { getClassesDayOverview } from "@/lib/overview";
import { isValidDateStr, todayInAppTimezone } from "@/lib/timezone";

/**
 * Tổng hợp trạng thái cất/trả của toàn bộ học sinh thuộc (các) lớp giáo viên được phân công,
 * cho ĐÚNG MỘT ngày được chọn (không trộn giao dịch nhiều ngày vào một bản ghi).
 * Chỉ xem — giống /api/teacher/students, không có API ghi nào ở đây. Nếu Cấp 3 đã điều
 * chỉnh trạng thái ngày đó, giáo viên thấy kết quả điều chỉnh (read-only), không sửa được.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireRole(user, "TEACHER");

    // classId lấy từ ClassAssignment của user đang đăng nhập — không nhận classId từ client,
    // nên không thể bị sửa qua query string để xem lớp khác.
    const classIds = getAssignedClassIds(user, "TEACHER");

    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ?? todayInAppTimezone();
    if (!isValidDateStr(date)) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }

    const rows = await getClassesDayOverview(classIds, date);
    return NextResponse.json({ date, rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}
