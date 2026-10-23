import { describe, it, expect } from "vitest";
import {
  requireRole,
  requireClassAccess,
  getAssignedClassIds,
  AuthzError,
  type SessionUser,
} from "../src/lib/auth/guard";

function fakeUser(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: "u1",
    username: "test",
    fullName: "Test User",
    role: "MANAGER",
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    assignments: [],
    ...overrides,
  } as unknown as SessionUser;
}

describe("requireRole", () => {
  it("cho phép khi role khớp", () => {
    const user = fakeUser({ role: "ADMIN" });
    expect(() => requireRole(user, "ADMIN")).not.toThrow();
  });

  it("chặn khi role không khớp (vd. MANAGER gọi route chỉ dành ADMIN)", () => {
    const user = fakeUser({ role: "MANAGER" });
    expect(() => requireRole(user, "ADMIN")).toThrow(AuthzError);
  });

  it("chặn ngay cả ADMIN khi route chỉ dành MANAGER (không có vai trò nào tự động bypass)", () => {
    const user = fakeUser({ role: "ADMIN" });
    expect(() => requireRole(user, "MANAGER")).toThrow(AuthzError);
  });
});

describe("getAssignedClassIds / requireClassAccess", () => {
  const assignments = [
    { id: "a1", userId: "u1", classId: "class-12A1", role: "MANAGER", createdAt: new Date() },
    { id: "a2", userId: "u1", classId: "class-12A2", role: "TEACHER", createdAt: new Date() },
  ];

  it("chỉ trả về lớp đúng vai trò phân công", () => {
    const user = fakeUser({ role: "MANAGER", assignments: assignments as unknown as SessionUser["assignments"] });
    expect(getAssignedClassIds(user, "MANAGER")).toEqual(["class-12A1"]);
    expect(getAssignedClassIds(user, "TEACHER")).toEqual(["class-12A2"]);
  });

  it("MANAGER truy cập đúng lớp được phân công -> không throw", () => {
    const user = fakeUser({ role: "MANAGER", assignments: assignments as unknown as SessionUser["assignments"] });
    expect(() => requireClassAccess(user, "class-12A1", "MANAGER")).not.toThrow();
  });

  it("MANAGER truy cập lớp KHÔNG được phân công -> throw 403 (chống sửa URL/body để qua lớp khác)", () => {
    const user = fakeUser({ role: "MANAGER", assignments: assignments as unknown as SessionUser["assignments"] });
    expect(() => requireClassAccess(user, "class-OTHER", "MANAGER")).toThrow(AuthzError);
  });

  it("ADMIN luôn có quyền trên mọi lớp (giám sát toàn trường) dù không có assignment", () => {
    const user = fakeUser({ role: "ADMIN", assignments: [] });
    expect(() => requireClassAccess(user, "class-ANY", "MANAGER")).not.toThrow();
  });

  it("MANAGER không tự nâng quyền để truy cập như TEACHER của cùng lớp", () => {
    const user = fakeUser({ role: "MANAGER", assignments: assignments as unknown as SessionUser["assignments"] });
    // u1 được gán MANAGER ở 12A1, không phải TEACHER ở 12A1 -> phải bị chặn khi kiểm tra quyền TEACHER
    expect(() => requireClassAccess(user, "class-12A1", "TEACHER")).toThrow(AuthzError);
  });
});
