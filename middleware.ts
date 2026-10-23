import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// Middleware chạy Edge runtime, không truy vấn DB được (SQLite cần Node.js runtime).
// Đây chỉ là lớp chặn THÔ: chưa có cookie session -> về /login ngay.
// Kiểm tra quyền THẬT (role, phạm vi lớp, hết hạn, bị thu hồi, bị khóa) luôn được
// thực hiện lại ở từng Server Component layout và từng API route qua lib/auth/guard.ts —
// đó là lớp kiểm tra có giá trị bảo mật, không phải lớp này.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
