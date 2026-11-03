// Prefix untrusted formula-like cells before CSV quoting. Quotes alone do not
// stop a spreadsheet from evaluating a recipient's answer or display name.
export function csv(rows: string[][]) {
  const cell = (value: string) =>
    `"${(/^(\s*[=+@-]|[\t\r\n])/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
