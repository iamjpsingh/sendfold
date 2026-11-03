export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.error?.message ?? data?.error ?? data?.message ?? "Request failed.",
      response.status,
    );
  return data as T;
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const shareQuery = (token?: string) =>
  token ? `?share=${encodeURIComponent(token)}` : "";
export const contentUrl = (fileId: string, token?: string, download = false) =>
  `/api/files/${fileId}/content${shareQuery(token)}${download ? (token ? "&download=1" : "?download=1") : ""}`;
export async function uploadFile(
  projectId: string,
  file: File,
  path: string,
  token?: string,
) {
  const form = new FormData();
  form.set("file", file);
  form.set("path", path);
  return api(`/projects/${projectId}/files${shareQuery(token)}`, {
    method: "POST",
    body: form,
  });
}
export function formatBytes(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1024 ** 2
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 ** 2).toFixed(1)} MB`;
}
export function date(n: number | string) {
  return new Date(n).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
export { randomPassword } from "./password";
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
