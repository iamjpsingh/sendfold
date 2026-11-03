import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "@sendfold/database/schema";
export type Database = BaseSQLiteDatabase<
  "sync" | "async",
  unknown,
  typeof schema
>;
export interface BlobStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{
    body: ReadableStream<Uint8Array> | Uint8Array;
    size: number;
  } | null>;
  delete(key: string): Promise<void>;
}
export interface Platform {
  requestInfo?: import("@sendfold/shared/audit").RequestInfo;
  db: Database;
  blobs: BlobStore;
  origin: string;
  secret: string;
  setupToken: string;
  production: boolean;
  batch(
    statements: { sql: string; params: (string | number | null)[] }[],
  ): Promise<number[]>;
}
