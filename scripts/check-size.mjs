import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const roots = [
  "apps/api/src",
  "apps/api/tests",
  "apps/web/src",
  "apps/web/tests",
  "apps/web/functions",
  "packages/database/src",
  "packages/shared/src",
  "scripts",
];
let checked = 0;
const violations = [];
async function visit(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) await visit(path);
    else if (/\.(tsx?|mjs|css)$/.test(path)) {
      const source = await readFile(path, "utf8"),
        lines = source.trimEnd().split("\n").length;
      checked++;
      if (lines > 300) violations.push(`${path}: ${lines} lines`);
    }
  }
}
for (const root of roots) await visit(root);
if (violations.length) {
  console.error(
    "Split these files into smaller modules:\n" + violations.join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(`${checked} source files checked; all are at most 300 lines.`);
