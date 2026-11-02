import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../src/app";
import { createNodePlatform } from "../src/node-platform";
export async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "sendfold-test-"));
  const platform = createNodePlatform({
    dataDir: dir,
    origin: "http://localhost:5173",
    secret: "test-secret-with-at-least-thirty-two-characters",
    setupToken: "test-setup-token",
  });
  const cookie = (r: Response) =>
    r.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; ");
  async function req(
    path: string,
    method = "GET",
    data?: unknown,
    session = "",
  ) {
    return app.fetch(
      new Request(`http://localhost:5173/api${path}`, {
        method,
        headers: {
          Origin: platform.origin,
          ...(session ? { Cookie: session } : {}),
          ...(data && !(data instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          data instanceof FormData
            ? data
            : data
              ? JSON.stringify(data)
              : undefined,
      }),
      { platform },
    );
  }
  async function ok(
    path: string,
    method = "GET",
    data?: unknown,
    session = "",
  ) {
    const r = await req(path, method, data, session);
    const body = await r.json();
    assert.ok(r.ok, `${method} ${path}: ${JSON.stringify(body)}`);
    return body as Record<string, any>;
  }
  return {
    platform,
    req,
    ok,
    cookie,
    cleanup: async () => {
      platform.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
