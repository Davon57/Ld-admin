export const DEFAULT_PAGE_SIZES: number[] = [10, 20, 50, 100, 1000, 2000, 3000];

export type PageData<T> = {
  list: T[];
  total: number;
  page?: number;
  pageSize?: number;
};

export function isPageData<T>(value: unknown): value is PageData<T> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.list) && typeof v.total === "number";
}

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

function ensureBrowserGlobals(): void {
  const w = window as unknown as Record<string, unknown>;
  if (typeof w.global === "undefined") {
    w.global = w;
  }
}

function toTextCellValue(raw: unknown): string {
  if (raw == null) return "";
  if (raw instanceof Date) return raw.toISOString();
  return String(raw);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function guessColumnWidth(values: string[]): number {
  const maxLen = values.reduce((m, v) => Math.max(m, v.length), 0);
  return Math.min(60, Math.max(10, maxLen + 2));
}

export async function exportToXlsx<Row extends Record<string, unknown>>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  fileName: string
): Promise<void> {
  ensureBrowserGlobals();

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  const header = columns.map(c => c.label);
  sheet.addRow(header);

  const previewRowCount = Math.min(50, rows.length);
  const widthSamples: string[][] = columns.map(() => []);
  columns.forEach((c, colIndex) => {
    widthSamples[colIndex].push(toTextCellValue(c.label));
  });

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const values = columns.map(c => {
      const v = row[c.key];
      const rendered = c.format ? c.format(v, row) : v;
      return toTextCellValue(rendered);
    });
    sheet.addRow(values);

    if (i < previewRowCount) {
      values.forEach((v, colIndex) => {
        widthSamples[colIndex].push(v);
      });
    }
  }

  sheet.columns = columns.map((_, colIndex) => ({
    width: guessColumnWidth(widthSamples[colIndex])
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 12 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" }
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } }
    };
  });

  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    row.eachCell(cell => {
      cell.numFmt = "@";
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
    });
    row.commit();
  }

  const fullName = fileName.toLowerCase().endsWith(".xlsx")
    ? fileName
    : `${fileName}_${getDateStamp()}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  downloadBlob(blob, fullName);
}
