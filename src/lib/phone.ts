import { prisma } from "@/lib/prisma";

export type PhoneStatus = "IN" | "OUT"; // IN = điện thoại đang được nhà trường cất giữ

/** Trạng thái hiện tại của học sinh dựa trên giao dịch gần nhất (nguồn sự thật duy nhất). */
export async function getStudentPhoneStatus(studentId: string): Promise<PhoneStatus> {
  const last = await prisma.phoneTransaction.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return "OUT"; // chưa từng cất -> coi như đang giữ điện thoại ở học sinh
  return last.type === "CHECK_IN" ? "IN" : "OUT";
}

export function statusLabel(status: PhoneStatus): string {
  return status === "IN" ? "Đã cất tại trạm" : "Đang giữ (chưa cất / đã trả)";
}
