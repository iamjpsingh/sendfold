import SQLite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "@sendfold/database/schema";
import type { Platform } from "./platform";
import { randomToken } from "./security";
export const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
export function createNodePlatform(
  options: {
    dataDir?: string;
    origin?: string;
    secret?: string;
    setupToken?: string;
    production?: boolean;
  } = {},
): Platform & { close: () => void } {
  const dataDir = resolve(
    options.dataDir ?? process.env.DATA_DIR ?? resolve(repoRoot, ".data"),
  );
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(resolve(dataDir, "files"), { recursive: true });
  const production =
    options.production ?? process.env.NODE_ENV === "production";
  function credential(name: string, provided: string | undefined) {
    if (provided) return provided;
    if (production)
      throw new Error(`${name} must be configured in production.`);
    const file = resolve(
      dataDir,
      name === "BETTER_AUTH_SECRET" ? "auth-secret" : "setup-token",
    );
    if (!existsSync(file)) writeFileSync(file, randomToken(), { mode: 0o600 });
    return readFileSync(file, "utf8").trim();
  }
  const sqlite = new SQLite(resolve(dataDir, "sendfold.sqlite"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: resolve(repoRoot, "packages/database/migrations"),
  });
  function filePath(key: string) {
    if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes(".."))
      throw new Error("Invalid object key");
    return resolve(dataDir, "files", key);
  }
  return {
    db,
    origin: options.origin ?? process.env.APP_ORIGIN ?? "http://127.0.0.1:5173",
    production,
    secret: credential(
      "BETTER_AUTH_SECRET",
      options.secret ?? process.env.BETTER_AUTH_SECRET,
    ),
    setupToken: credential(
      "SETUP_TOKEN",
      options.setupToken ?? process.env.SETUP_TOKEN,
    ),
    blobs: {
      async put(key, bytes) {
        const path = filePath(key);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, bytes);
      },
      async get(key) {
        try {
          const bytes = await readFile(filePath(key));
          return { body: new Uint8Array(bytes), size: bytes.length };
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
          throw e;
        }
      },
      async delete(key) {
        try {
          await unlink(filePath(key));
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        }
      },
    },
    async batch(statements) {
      return sqlite.transaction(() =>
        statements.map((s) => sqlite.prepare(s.sql).run(...s.params).changes),
      )();
    },
    close: () => sqlite.close(),
  };
}
