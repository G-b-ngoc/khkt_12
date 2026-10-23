import { requirePageRole } from "@/lib/auth/guard";
import { MacTitleBar } from "@/components/ui/MacTitleBar";
import { PillBottomNav, type NavItem } from "@/components/nav/PillBottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { LogoutButton } from "@/components/nav/LogoutButton";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/classes", label: "Lớp học", icon: "class" },
  { href: "/admin/students", label: "Học sinh", icon: "students" },
  { href: "/admin/accounts", label: "Tài khoản", icon: "account" },
  { href: "/admin/audit", label: "Nhật ký", icon: "audit" },
  { href: "/admin/reports", label: "Hòm thư", icon: "mailbox" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("ADMIN");

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar items={NAV_ITEMS} highlightHref="/admin/reports" footer={<LogoutButton />} />
      <div className="flex min-h-screen flex-1 flex-col">
        <MacTitleBar title="Quản trị hệ thống" subtitle="Toàn trường" titleHref="/admin" />
        <main className="flex-1 px-4 pb-28 pt-5 md:pb-8">{children}</main>
        <div className="md:hidden">
          <PillBottomNav items={NAV_ITEMS} />
        </div>
      </div>
    </div>
  );
}
