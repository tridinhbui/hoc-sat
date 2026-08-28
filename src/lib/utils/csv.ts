/**
 * CSV tối giản: hỗ trợ ô bọc trong dấu nháy kép và `""` để thoát dấu nháy.
 * Trả về các dòng thô; việc hiểu cột nào là gì để nơi gọi tự lo.
 *
 * TODO: `src/lib/actions/questions.ts` có một bản y hệt viết riêng. Gộp về
 * đây khi nào file đó rảnh tay — hiện đang có người sửa, tách ra để không
 * đụng nhau.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
