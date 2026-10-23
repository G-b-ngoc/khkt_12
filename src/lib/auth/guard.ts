import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { AssignmentRole, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";

const ROLE_HOME: Record<Role, string> = {
  MANAGER: "/manager",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Bắt buộc đã đăng nhập (phiên hợp lệ, chưa hết hạn, chưa bị thu hồi, tài khoản không bị khóa). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthzError("Chưa đăng nhập hoặc phiên đã hết hạn", 401);
  return user;
}

/** Bắt buộc user có một trong các role được cho phép. Kiểm tra ở backend, không tin role từ client. */
export function requireRole(user: SessionUser, ...roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthzError("Không có quyền thực hiện hành động này", 403);
  }
}

/** Danh sách classId mà user được phân công với vai trò cụ thể (MANAGER hoặc TEACHER). */
export function getAssignedClassIds(user: SessionUser, assignmentRole: AssignmentRole): string[] {
  return user.assignments.filter((a) => a.role === assignmentRole).map((a) => a.classId);
}

/**
 * Bắt buộc user có quyền trên classId cụ thể — kiểm tra theo ĐỐI TƯỢNG DỮ LIỆU thật,
 * không chỉ theo role. ADMIN luôn có quyền (toàn trường). MANAGER/TEACHER chỉ khi
 * có ClassAssignment khớp classId + vai trò.
 */
export function requireClassAccess(
  user: SessionUser,
  classId: string,
  assignmentRole: AssignmentRole
): void {
  if (user.role === "ADMIN") return;
  const allowed = getAssignedClassIds(user, assignmentRole);
  if (!allowed.includes(classId)) {
    throw new AuthzError("Bạn không được phân công vào lớp này", 403);
  }
}

/**
 * Dùng trong Server Component layout (app/manager, app/teacher, app/admin).
 * Chưa đăng nhập -> về /login. Đăng nhập nhưng sai vai trò (vd. gõ thẳng URL /admin) ->
 * đưa về trang chủ đúng vai trò của họ, không render nội dung của vai trò khác.
 */
export async function requirePageRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

/** Chuyển AuthzError (hoặc lỗi khác) thành NextResponse JSON thống nhất cho mọi API route. */
export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthzError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Unexpected error:", err);
  return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
}
