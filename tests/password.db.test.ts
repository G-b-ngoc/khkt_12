import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { verifyPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

describe("Mật khẩu không được lưu dạng văn bản thuần", () => {
  it("passwordHash của tài khoản demo không chứa mật khẩu gốc, có định dạng bcrypt", async () => {
    const user = await prisma.user.findUnique({ where: { username: "manager_12a1" } });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe("Demo@123");
    expect(user!.passwordHash).toMatch(/^\$2[aby]\$/); // định dạng hash bcrypt
    const ok = await verifyPassword("Demo@123", user!.passwordHash);
    expect(ok).toBe(true);
  });
});
