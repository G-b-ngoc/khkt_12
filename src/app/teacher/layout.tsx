import { requirePageRole, getAssignedClassIds } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { MacTitleBar } from "@/components/ui/MacTitleBar";
import { PillBottomNav, type NavItem } from "@/components/nav/PillBottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { LogoutButton } from "@/components/nav/LogoutButton";

const NAV_ITEMS: NavItem[] = [
  { href: "/teacher/checkin", label: "Cất điện thoại", icon: "phoneIn" },
  { href: "/teacher/checkout", label: "Trả điện thoại", icon: "phoneOut" },
  { href: "/teacher/report", label: "Báo cáo", icon: "report" },
  { href: "/teacher/comments", label: "Nhận xét", icon: "comment" },
  { href: "/teacher/account", label: "Tài khoản", icon: "account" },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("TEACHER");
  const classIds = getAssignedClassIds(user, "TEACHER");
  const classes = await prisma.class.findMany({ where: { id: { in: classIds } } });
  const classLabel = classes.map((c) => c.code).join(", ") || "Chưa được phân công lớp";

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar items={NAV_ITEMS} footer={<LogoutButton />} />
      <div className="flex min-h-screen flex-1 flex-col">
        <MacTitleBar
          title="Giáo viên chủ nhiệm"
          subtitle={`Lớp ${classLabel}`}
          titleHref="/teacher"
        />
        <main className="flex-1 px-4 pb-28 pt-5 md:pb-8">{children}</main>
        <div className="md:hidden">
          <PillBottomNav items={NAV_ITEMS} />
        </div>
      </div>
    </div>
  );
}
