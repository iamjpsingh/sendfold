import test from "node:test";
import assert from "node:assert/strict";
import { randomPassword } from "../src/lib/password";

test("generated access passwords are short, varied and easy to transcribe", () => {
  const generated = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const password = randomPassword();
    assert.equal(password.length, 12);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /[2-9]/);
    assert.match(password, /[!@#$%*?]/);
    assert.doesNotMatch(password, /[I0O1l\s]/);
    generated.add(password);
  }
  assert.equal(generated.size, 500);
});
