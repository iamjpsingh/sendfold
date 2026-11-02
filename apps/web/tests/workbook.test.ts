import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  importWorkbook,
  exportWorkbook,
} from "../src/features/sheets/workbook";
test("XLSX cells, formulas and added tabs survive a snapshot round trip", async () => {
  const original = new ExcelJS.Workbook();
  const sheet = original.addWorksheet("Scope");
  sheet.addRow(["Item", "Cost"]);
  sheet.addRow(["Design", 300]);
  sheet.getCell("B3").value = { formula: "SUM(B2:B2)", result: 300 };
  const buffer = await original.xlsx.writeBuffer();
  const data = await importWorkbook(buffer as ArrayBuffer, "Scope.xlsx");
  assert.equal(data.sheets[data.sheetOrder[0]].cellData?.[1]?.[0]?.v, "Design");
  assert.equal(
    data.sheets[data.sheetOrder[0]].cellData?.[2]?.[1]?.f,
    "=SUM(B2:B2)",
  );
  data.sheetOrder.push("empty-tab");
  data.sheets["empty-tab"] = { id: "empty-tab", name: "Empty", cellData: {} };
  data.sheetOrder.push("new-tab");
  data.sheets["new-tab"] = {
    id: "new-tab",
    name: "Client notes",
    cellData: { 0: { 0: { v: "Approved" } } },
  };
  const result = await exportWorkbook(data);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await result.arrayBuffer());
  assert.equal(restored.worksheets.length, 3);
  assert.equal(
    restored.getWorksheet("Client notes")?.getCell("A1").value,
    "Approved",
  );
  assert.equal(
    restored.getWorksheet("Scope")?.getCell("B3").formula,
    "SUM(B2:B2)",
  );
});
