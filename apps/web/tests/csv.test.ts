import test from "node:test";
import assert from "node:assert/strict";
import { csv } from "../src/lib/csv";

test("recipient text stays literal in CSV exports and preserves delimiters", () => {
  for (const input of ["=1+1", " +1", "\t=1", "\ntext", "@SUM(A1)", "-1+1"])
    assert.equal(csv([[input]]), `"'${input}"`);
  assert.equal(
    csv([
      ["Alex, Jamie", 'Use "blue"'],
      ["Line 1\nLine 2", "Approved"],
    ]),
    '"Alex, Jamie","Use ""blue"""\r\n"Line 1\nLine 2","Approved"',
  );
});
