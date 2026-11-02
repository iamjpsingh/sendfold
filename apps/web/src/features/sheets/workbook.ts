import ExcelJS from "exceljs";
import {
  LocaleType,
  type IWorkbookData,
  type ICellData,
  type IStyleData,
} from "@univerjs/core";
export async function importWorkbook(
  bytes: ArrayBuffer,
  name: string,
): Promise<IWorkbookData> {
  const excel = new ExcelJS.Workbook();
  await excel.xlsx.load(bytes);
  const data: IWorkbookData = {
    id: crypto.randomUUID(),
    name,
    appVersion: "1.0.0",
    locale: LocaleType.EN_US,
    styles: {},
    sheets: {},
    sheetOrder: [],
  };
  let count = 0;
  for (const sheet of excel.worksheets) {
    const id = `sheet-${sheet.id}`,
      cells: Record<number, Record<number, ICellData>> = {};
    sheet.eachRow((row, r) =>
      row.eachCell((cell, c) => {
        if (++count > 100_000)
          throw new Error(
            "This workbook is too large for the browser editor. Download it to edit locally.",
          );
        let value: string | number | boolean | null = null;
        let formula: string | undefined;
        const raw = cell.value;
        if (raw instanceof Date) value = raw.toISOString().slice(0, 10);
        else if (typeof raw === "object" && raw) {
          if ("formula" in raw || "sharedFormula" in raw) {
            formula = cell.formula;
            const result = cell.result;
            value =
              typeof result === "number" ||
              typeof result === "string" ||
              typeof result === "boolean"
                ? result
                : null;
          } else value = cell.text;
        } else value = raw ?? null;
        const style: IStyleData = {};
        if (cell.font?.bold) style.bl = 1;
        if (cell.font?.italic) style.it = 1;
        if (cell.font?.size) style.fs = cell.font.size;
        if (cell.font?.color?.argb)
          style.cl = { rgb: `#${cell.font.color.argb.slice(-6)}` };
        if (cell.fill?.type === "pattern" && cell.fill.fgColor?.argb)
          style.bg = { rgb: `#${cell.fill.fgColor.argb.slice(-6)}` };
        if (cell.numFmt) style.n = { pattern: cell.numFmt };
        cells[r - 1] ??= {};
        cells[r - 1][c - 1] = {
          v: typeof value === "boolean" ? Number(value) : value,
          t: typeof value === "number" ? 2 : typeof value === "boolean" ? 3 : 1,
          ...(formula ? { f: `=${formula}` } : {}),
          s: style,
        };
      }),
    );
    data.sheetOrder.push(id);
    data.sheets[id] = {
      id,
      name: sheet.name,
      rowCount: Math.max(200, sheet.rowCount + 20),
      columnCount: Math.max(26, sheet.columnCount + 5),
      cellData: cells,
      defaultColumnWidth: 130,
      defaultRowHeight: 24,
    };
  }
  if (!data.sheetOrder.length)
    throw new Error("This workbook has no worksheets.");
  return data;
}
export async function exportWorkbook(data: IWorkbookData): Promise<Blob> {
  const excel = new ExcelJS.Workbook();
  for (const id of data.sheetOrder) {
    const source = data.sheets[id];
    if (!source) continue;
    const sheet = excel.addWorksheet(source.name ?? "Sheet");
    for (const [r, row] of Object.entries(source.cellData ?? {}))
      for (const [c, cell] of Object.entries(
        row as Record<number, ICellData>,
      )) {
        if (!cell) continue;
        const target = sheet.getCell(Number(r) + 1, Number(c) + 1),
          value = cell.v ?? cell.p?.body?.dataStream?.trim() ?? null;
        if (cell.f)
          target.value = {
            formula: cell.f.replace(/^=/, ""),
            result:
              typeof value === "string" || typeof value === "number"
                ? value
                : undefined,
          };
        else target.value = cell.t === 3 ? Boolean(value) : value;
        const style = typeof cell.s === "string" ? data.styles[cell.s] : cell.s;
        if (style) {
          target.font = {
            bold: style.bl === 1,
            italic: style.it === 1,
            size: style.fs,
            color: style.cl?.rgb
              ? { argb: style.cl.rgb.replace("#", "FF") }
              : undefined,
          };
          if (style.bg?.rgb)
            target.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: style.bg.rgb.replace("#", "FF") },
            };
          if (style.n?.pattern) target.numFmt = style.n.pattern;
        }
      }
    for (const merge of source.mergeData ?? [])
      sheet.mergeCells(
        merge.startRow + 1,
        merge.startColumn + 1,
        merge.endRow + 1,
        merge.endColumn + 1,
      );
    sheet.columns?.forEach((c) => {
      c.width = 18;
    });
  }
  const buffer = await excel.xlsx.writeBuffer();
  return new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
