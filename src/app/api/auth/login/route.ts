import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const bodySchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

// Hash "mồi" dùng để so sánh khi không tìm thấy user, tránh lộ thông tin qua thời gian phản hồi.
let dummyHash: string | null = null;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await hashPassword("dummy-password-for-timing-safety");
  return dummyHash;
}

const GENERIC_ERROR = "Tên đăng nhập hoặc mật khẩu không đúng";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    await verifyPassword(password, await getDummyHash());
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (user.isLocked) {
    return NextResponse.json(
      { error: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." },
      { status: 403 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await createSession(user.id, req.headers.get("user-agent"));
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return NextResponse.json({ role: user.role });
}
