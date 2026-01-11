export const DEFAULT_PAGE_SIZES: number[] = [10, 20, 50, 100, 1000, 2000, 3000];

export type CsvColumn<Row extends Record<string, unknown>> = {
  label: string;
  key: keyof Row;
  format?: (value: Row[keyof Row], row: Row) => string;
};

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function getDateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function escapeCsvCell(raw: unknown): string {
  const str = raw == null ? "" : String(raw);
  if (/[\n\r,\"]/g.test(str)) {
    return `"${str.replace(/\"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv<Row extends Record<string, unknown>>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  fileName: string
): void {
  const header = columns.map(c => escapeCsvCell(c.label)).join(",");
  const body = rows
    .map(row => {
      return columns
        .map(c => {
          const value = row[c.key];
          const rendered = c.format ? c.format(value, row) : value;
          return escapeCsvCell(rendered);
        })
        .join(",");
    })
    .join("\n");

  const content = `\uFEFF${header}\n${body}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".csv")
    ? fileName
    : `${fileName}_${getDateStamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
