import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

const ROLE_HOME: Record<string, string> = {
  MANAGER: "/manager",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(ROLE_HOME[user.role] ?? "/login");
}
