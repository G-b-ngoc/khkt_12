import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { normalizeSearchText } from "@/lib/search";

export type ParsedRow = { rowNumber: number; studentCode: string; fullName: string };

export type RowOutcome = ParsedRow & {
  outcome: "NEW" | "UPDATE" | "CLASS_CONFLICT" | "DUPLICATE_IN_FILE" | "INVALID";
  existingClassCode?: string;
  previousFullName?: string;
  reason?: string;
};

const CODE_HEADER_ALIASES = new Set([
  "ma hs",
  "mahs",
  "ma hoc sinh",
  "ma so hoc sinh",
  "ma so",
  "student id",
  "studentid",
  "student code",
  "studentcode",
  "id",
  "code",
]);
const NAME_HEADER_ALIASES = new Set([
  "ho va ten",
  "ho ten",
  "hoten",
  "ho va ten hoc sinh",
  "ten hoc sinh",
  "ten",
  "full name",
  "fullname",
  "name",
  "student name",
  "hs",
  "hoc sinh",
]);

function normHeader(cell: unknown): string {
  return normalizeSearchText(String(cell ?? ""));
}

function looksLikeCodeHeader(h: string): boolean {
  if (h.includes("student id") || h.includes("studentid") || h.includes("code")) return true;
  return h.includes("ma") && (h.includes("hs") || h.includes("hoc sinh") || h.includes("so"));
}

function looksLikeNameHeader(h: string): boolean {
  return h.includes("ten") || h.includes("name");
}

/** Dò cột "Mã HS" / "Họ và tên" theo TÊN cột (không theo vị trí) — chấp nhận nhiều cách viết khác nhau. */
export function detectColumns(headerRow: unknown[]): { codeIdx: number; nameIdx: number } | null {
  const norm = headerRow.map(normHeader);

  let codeIdx = norm.findIndex((h) => CODE_HEADER_ALIASES.has(h));
  let nameIdx = norm.findIndex((h) => NAME_HEADER_ALIASES.has(h));

  if (codeIdx === -1) codeIdx = norm.findIndex((h) => looksLikeCodeHeader(h));
  if (nameIdx === -1) nameIdx = norm.findIndex((h, i) => i !== codeIdx && looksLikeNameHeader(h));

  if (codeIdx === -1 || nameIdx === -1 || codeIdx === nameIdx) return null;
  return { codeIdx, nameIdx };
}

/** Đọc .xlsx/.xls/.csv thành mảng 2 chiều (dòng x cột), dòng 0 là header. */
export function parseWorkbookRows(buffer: Buffer, fileName: string): unknown[][] {
  const isCsv = /\.csv$/i.test(fileName);
  const workbook = isCsv
    ? XLSX.read(buffer.toString("utf-8").replace(/^﻿/, ""), { type: "string" })
    : XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
}

export type NormalizeResult = {
  rows: ParsedRow[];
  invalidRows: { rowNumber: number; reason: string }[];
  columnsDetected: boolean;
};

/** Chuẩn hoá: trim khoảng trắng thừa, gộp khoảng trắng giữa từ, bỏ dòng trống, giữ mã HS dạng chuỗi. */
export function normalizeImportSheet(sheetRows: unknown[][]): NormalizeResult {
  if (sheetRows.length === 0) return { rows: [], invalidRows: [], columnsDetected: false };

  const cols = detectColumns(sheetRows[0] ?? []);
  if (!cols) return { rows: [], invalidRows: [], columnsDetected: false };

  const rows: ParsedRow[] = [];
  const invalidRows: { rowNumber: number; reason: string }[] = [];

  for (let i = 1; i < sheetRows.length; i++) {
    const raw = sheetRows[i] ?? [];
    const rowNumber = i + 1; // số dòng thật trong file (dòng 1 = header)

    const isBlank = raw.every((c) => String(c ?? "").trim() === "");
    if (isBlank) continue;

    const studentCode = String(raw[cols.codeIdx] ?? "").trim();
    const fullName = String(raw[cols.nameIdx] ?? "")
      .trim()
      .replace(/\s+/g, " ");

    if (!studentCode || !fullName) {
      invalidRows.push({
        rowNumber,
        reason: !studentCode && !fullName ? "Thiếu cả mã HS và họ tên" : !studentCode ? "Thiếu mã HS" : "Thiếu họ và tên",
      });
      continue;
    }
    rows.push({ rowNumber, studentCode, fullName });
  }

  return { rows, invalidRows, columnsDetected: true };
}

/**
 * Phân loại từng dòng theo dữ liệu HIỆN TẠI trong DB (luôn gọi lại hàm này ở cả bước xem
 * trước và bước xác nhận — không tin kết quả xem trước đã cũ, tránh race condition).
 */
export async function classifyRows(rows: ParsedRow[], targetClassId: string): Promise<RowOutcome[]> {
  const seenCodes = new Set<string>();
  const firstOccurrence: ParsedRow[] = [];
  const duplicates: ParsedRow[] = [];

  for (const row of rows) {
    if (seenCodes.has(row.studentCode)) {
      duplicates.push(row);
    } else {
      seenCodes.add(row.studentCode);
      firstOccurrence.push(row);
    }
  }

  const codes = firstOccurrence.map((r) => r.studentCode);
  const existing = codes.length
    ? await prisma.student.findMany({
        where: { studentCode: { in: codes } },
        select: { studentCode: true, classId: true, fullName: true, class: { select: { code: true } } },
      })
    : [];
  const existingByCode = new Map(existing.map((e) => [e.studentCode, e]));

  const outcomes: RowOutcome[] = [];
  for (const row of firstOccurrence) {
    const match = existingByCode.get(row.studentCode);
    if (!match) {
      outcomes.push({ ...row, outcome: "NEW" });
    } else if (match.classId === targetClassId) {
      outcomes.push({ ...row, outcome: "UPDATE", previousFullName: match.fullName });
    } else {
      outcomes.push({ ...row, outcome: "CLASS_CONFLICT", existingClassCode: match.class.code });
    }
  }
  for (const row of duplicates) {
    outcomes.push({ ...row, outcome: "DUPLICATE_IN_FILE", reason: "Mã HS bị lặp lại trong file, chỉ dòng đầu tiên được xét" });
  }

  return outcomes.sort((a, b) => a.rowNumber - b.rowNumber);
}

export function buildTemplateWorkbookBuffer(): Buffer {
  const header = ["Mã HS", "Họ và tên"];
  const sample = [
    ["HS0001", "Nguyễn Văn A"],
    ["HS0002", "Trần Thị B"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([header, ...sample]);
  sheet["!cols"] = [{ wch: 14 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Danh sách học sinh");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
