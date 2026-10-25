/** Bỏ dấu tiếng Việt + hạ chữ thường, dùng để so khớp tìm kiếm không phân biệt hoa/thường/dấu. */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

/** true nếu mọi từ trong query đều xuất hiện (dạng chuỗi con, không phân biệt hoa/thường/dấu) trong haystack. */
export function matchesSearchQuery(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const normalizedHaystack = normalizeSearchText(haystack);
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => normalizedHaystack.includes(token));
}
