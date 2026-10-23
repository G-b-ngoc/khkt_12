import { requirePageRole, getAssignedClassIds } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { MacTitleBar } from "@/components/ui/MacTitleBar";
import { PillBottomNav, type NavItem } from "@/components/nav/PillBottomNav";
import { PhoneInIcon, PhoneOutIcon, ReportIcon, AccountIcon } from "@/components/ui/Icons";

const NAV_ITEMS: NavItem[] = [
  { href: "/manager/checkin", label: "Cất điện thoại", icon: (p) => <PhoneInIcon {...p} /> },
  { href: "/manager/checkout", label: "Trả điện thoại", icon: (p) => <PhoneOutIcon {...p} /> },
  { href: "/manager/report", label: "Báo cáo", icon: (p) => <ReportIcon {...p} /> },
  { href: "/manager/account", label: "Tài khoản lớp", icon: (p) => <AccountIcon {...p} /> },
];

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("MANAGER");
  const classIds = getAssignedClassIds(user, "MANAGER");
  const classes = await prisma.class.findMany({ where: { id: { in: classIds } } });
  const classLabel = classes.map((c) => c.code).join(", ") || "Chưa được phân công lớp";

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <MacTitleBar title="Trạm quản lý điện thoại" subtitle={`Lớp ${classLabel}`} />
      <main className="flex-1 px-4 pb-28 pt-5">{children}</main>
      <PillBottomNav items={NAV_ITEMS} />
    </div>
  );
}
