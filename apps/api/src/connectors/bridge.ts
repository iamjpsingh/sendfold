import { eq, and, inArray, sql } from "drizzle-orm";
import * as s from "@sendfold/database/schema";
import type { Project, ProjectDetail } from "@sendfold/shared/types";
import type { C, Env } from "../context";
import type { ConnectorPrincipal } from "./authenticate";

export type Dispatch = (
  request: Request,
  env: Env["Bindings"],
) => Response | Promise<Response>;
export function connectorBridge(
  c: C,
  principal: ConnectorPrincipal,
  dispatch: Dispatch,
) {
  const origin = c.env.platform.origin;
  async function request(path: string, method = "GET", body?: unknown) {
    if (method !== "GET" && !principal.allowWrite)
      throw new Error("This connection is read-only.");
    const response = await dispatch(
      new Request(`${origin}/api${path}`, {
        method,
        headers: {
          Origin: origin,
          ...(body && !(body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          body instanceof FormData
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
      }),
      { platform: c.env.platform, connector: principal },
    );
    if (!response.ok)
      throw new Error(((await response.json()) as { error: string }).error);
    return response;
  }
  async function json<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    return (await request(path, method, body)).json() as Promise<T>;
  }
  const projects = () => json<Project[]>("/projects");
  const project = (id: string) =>
    json<ProjectDetail>(`/projects/${encodeURIComponent(id)}`);
  async function search(query: string) {
    const visible = await projects(),
      needle = query.toLowerCase();
    const found = visible
      .filter((p) =>
        `${p.name} ${p.client} ${p.description}`.toLowerCase().includes(needle),
      )
      .map((p) => ({
        id: `project:${p.id}`,
        title: p.name,
        url: `${origin}/projects/${p.id}`,
      }));
    if (visible.length && found.length < 50) {
      const files = await c.env.platform.db
        .select()
        .from(s.files)
        .where(
          and(
            inArray(
              s.files.projectId,
              visible.map((p) => p.id),
            ),
            sql`instr(lower(${s.files.path}), ${needle}) > 0`,
          ),
        )
        .orderBy(s.files.path)
        .limit(50 - found.length)
        .all();
      for (const file of files)
        found.push({
          id: `file:${file.id}`,
          title: `${visible.find((p) => p.id === file.projectId)!.name} / ${file.path}`,
          url: `${origin}/preview/${file.projectId}/${file.id}`,
        });
    }
    return { results: found.slice(0, 50) };
  }
  async function file(id: string) {
    const row = await c.env.platform.db
      .select()
      .from(s.files)
      .where(eq(s.files.id, id))
      .get();
    if (!row) throw new Error("File not found.");
    await project(row.projectId);
    return row;
  }
  function requireText(file: { path: string; size: number }) {
    if (
      !/\.(txt|md|mdx|html?|css|js|ts|json|csv|tsv|xml|yaml|yml|svg)$/i.test(
        file.path,
      )
    )
      throw new Error(
        "This connector reads text files. Open PDF, Office, image, or other binary files in Sendfold.",
      );
    if (file.size > 256 * 1024)
      throw new Error(
        "Text files must be 256 KB or smaller for connector editing and reading.",
      );
  }
  async function read(id: string) {
    const row = await file(id);
    requireText(row);
    const response = await request(`/files/${row.id}/content`);
    return {
      ...row,
      text: await response.text(),
      url: `${origin}/preview/${row.projectId}/${row.id}`,
    };
  }
  function textForm(path: string, content: string, mime = "text/plain") {
    requireText({ path, size: new TextEncoder().encode(content).length });
    const form = new FormData();
    form.set("path", path);
    form.set(
      "file",
      new File([content], path.split("/").pop()!, { type: mime }),
    );
    return form;
  }
  return { json, projects, project, file, read, textForm, search, origin };
}
export type Bridge = ReturnType<typeof connectorBridge>;
