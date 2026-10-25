/**
 * Chỉ chứa type/nhãn/màu cho trạng thái cất/trả — KHÔNG import prisma ở đây, vì file này
 * được dùng cả ở client component (trang Theo dõi) lẫn API route. Logic truy vấn DB nằm ở
 * src/lib/overview.ts (chỉ server).
 */
export const EFFECTIVE_STATUS_CODES_TUPLE = [
  "NOT_RECORDED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "ABSENT",
  "EXEMPTED",
  "NEEDS_VERIFICATION",
] as const;

export type EffectiveStatusCode = (typeof EFFECTIVE_STATUS_CODES_TUPLE)[number];

export const EFFECTIVE_STATUS_LABEL: Record<EffectiveStatusCode, string> = {
  NOT_RECORDED: "Chưa ghi nhận cất",
  CHECKED_IN: "Đã cất",
  CHECKED_OUT: "Đã trả",
  ABSENT: "Vắng mặt",
  EXEMPTED: "Được miễn / có lý do hợp lệ",
  NEEDS_VERIFICATION: "Cần xác minh",
};

export const EFFECTIVE_STATUS_CODES: EffectiveStatusCode[] = [...EFFECTIVE_STATUS_CODES_TUPLE];

export type StatusTone = "neutral" | "success" | "warning" | "danger";

export const EFFECTIVE_STATUS_TONE: Record<EffectiveStatusCode, StatusTone> = {
  NOT_RECORDED: "neutral",
  CHECKED_IN: "success",
  CHECKED_OUT: "success",
  ABSENT: "danger",
  EXEMPTED: "neutral",
  NEEDS_VERIFICATION: "warning",
};
