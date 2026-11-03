import test from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/_middleware";

const env = {
  REDIRECT_HOST: "sendfold.pages.dev",
  CANONICAL_ORIGIN: "https://sendfold.imapro.in",
};
const next = async () => new Response("application", { status: 200 });

test("legacy links preserve paths and query strings without redirecting other hosts", async () => {
  for (const method of ["GET", "POST"]) {
    const response = await onRequest({
      request: new Request("https://sendfold.pages.dev/s/test?tab=files", {
        method,
      }),
      env,
      next,
    });
    assert.equal(response.status, 308);
    assert.equal(
      response.headers.get("location"),
      "https://sendfold.imapro.in/s/test?tab=files",
    );
  }
  for (const origin of [
    "https://sendfold.imapro.in",
    "https://preview.sendfold.pages.dev",
    "http://localhost:5173",
  ]) {
    assert.equal(
      (await onRequest({ request: new Request(origin), env, next })).status,
      200,
    );
  }
  assert.equal(
    (
      await onRequest({
        request: new Request("https://sendfold.pages.dev"),
        env: { ...env, CANONICAL_ORIGIN: "https://sendfold.pages.dev" },
        next,
      })
    ).status,
    200,
  );
});
