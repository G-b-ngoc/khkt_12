import * as XLSX from "xlsx";

export type ExportColumn<T> = { header: string; value: (row: T) => string };

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

/** Chống CSV/Excel formula injection: nội dung bắt đầu bằng =,+,-,@ thì thêm nháy đơn phía trước. */
function sanitizeCell(value: string): string {
  return DANGEROUS_PREFIX.test(value) ? `'${value}` : value;
}

/** Luôn trả cột dạng chuỗi (SheetJS suy ra kiểu cell từ giá trị JS) nên mã HS không mất số 0 đầu. */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const escapeCell = (raw: string) => {
    const v = sanitizeCell(raw);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const lines = [columns.map((c) => escapeCell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(row))).join(","));
  }
  // BOM để Excel mở CSV UTF-8 không lỗi font tiếng Việt
  return "﻿" + lines.join("\r\n");
}

export function toXlsxBuffer<T>(rows: T[], columns: ExportColumn<T>[], sheetName = "Du lieu"): Buffer {
  const header = columns.map((c) => c.header);
  const body = rows.map((row) => columns.map((c) => sanitizeCell(c.value(row))));
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
