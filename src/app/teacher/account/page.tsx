import { requirePageRole, getAssignedClassIds } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/nav/LogoutButton";

export default async function TeacherAccountPage() {
  const user = await requirePageRole("TEACHER");
  const classIds = getAssignedClassIds(user, "TEACHER");
  const classes = await prisma.class.findMany({ where: { id: { in: classIds } } });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="p-5">
        <p className="text-sm text-text-muted">Tài khoản</p>
        <p className="text-lg font-semibold text-text">{user.fullName}</p>
        <p className="text-sm text-text-muted">@{user.username}</p>
      </Card>
      <Card className="p-5">
        <p className="mb-2 text-sm text-text-muted">Lớp chủ nhiệm</p>
        {classes.length === 0 ? (
          <p className="text-sm text-danger">Chưa được phân công lớp nào — liên hệ quản trị viên.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {classes.map((c) => (
              <li key={c.id} className="text-sm text-text">{c.code} — {c.name}</li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-2 md:hidden">
        <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-danger hover:bg-danger/10" />
      </Card>
    </div>
  );
}
