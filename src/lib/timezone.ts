/**
 * Asia/Ho_Chi_Minh không có giờ mùa hè — luôn lệch UTC đúng +7:00, nên có thể tính trực
 * tiếp bằng offset cố định mà không cần thư viện timezone. Dùng chung cho cả API (server)
 * và trang client để "hôm nay"/mốc ngày không bị lệch theo giờ máy chủ.
 */
export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";
const APP_UTC_OFFSET = "+07:00";

const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(value: string): boolean {
  if (!DATE_STR_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00${APP_UTC_OFFSET}`);
  return !Number.isNaN(d.getTime());
}

/** "YYYY-MM-DD" của ngày hôm nay theo Asia/Ho_Chi_Minh (không phải giờ UTC/giờ máy chủ). */
export function todayInAppTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "YYYY-MM-DD" theo Asia/Ho_Chi_Minh của 1 Date — KHÔNG dùng toISOString().slice(0,10) (đó là ngày UTC, có thể lệch 1 ngày). */
export function formatDateInAppTimezone(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Mốc đầu ngày (00:00 Asia/Ho_Chi_Minh) và đầu ngày kế tiếp, dùng làm khoảng [start, end). */
export function dayBoundsInAppTimezone(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00${APP_UTC_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function formatTimeInAppTimezone(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeInAppTimezone(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { timeZone: APP_TIMEZONE });
}
