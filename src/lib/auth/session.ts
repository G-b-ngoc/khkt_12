import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 giờ — đủ một ca làm việc

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Tạo session mới trong DB và set cookie httpOnly cho response hiện tại.
 * Chỉ gọi được trong Route Handler / Server Action (nơi cookies() cho phép ghi).
 */
export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, userAgent: userAgent ?? null },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Đọc session hiện tại từ cookie, kiểm tra còn hiệu lực (chưa hết hạn, chưa revoke).
 * Trả về user kèm vai trò + phân công lớp, hoặc null nếu chưa đăng nhập / phiên không hợp lệ.
 * Đây là điểm xác thực backend duy nhất — không có nơi nào khác được tin vào role từ client.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { assignments: { include: { class: true } } },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.isLocked) return null;

  return session.user;
}

/** Thu hồi session hiện tại (đăng xuất) — sau khi gọi, cookie cũ không còn dùng được nữa. */
export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Thu hồi toàn bộ session của một user — dùng khi admin khóa tài khoản hoặc đổi mật khẩu. */
export async function revokeAllSessionsForUser(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
