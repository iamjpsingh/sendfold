import type { ProjectFile } from "@sendfold/shared/types";
import { contentUrl } from "@/lib/api";
const types: Record<string, string> = {
  css: "text/css",
  js: "application/javascript",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  ico: "image/x-icon",
};
export async function htmlPreview(
  file: ProjectFile,
  files: ProjectFile[],
  token?: string,
) {
  const byPath = new Map(files.map((f) => [f.path, f])),
    cache = new Map<string, string>();
  function pathOf(value: string, base: string) {
    try {
      const url = new URL(value, `https://preview.invalid/${base}`);
      return url.origin === "https://preview.invalid"
        ? decodeURIComponent(url.pathname.slice(1))
        : null;
    } catch {
      return null;
    }
  }
  async function rewriteCss(css: string, base: string) {
    for (const match of [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)])
      css = css.replace(match[0], `url("${await asset(match[2], base)}")`);
    for (const match of [...css.matchAll(/@import\s+(['"])(.*?)\1/g)])
      css = css.replace(
        match[0],
        `@import url("${await asset(match[2], base)}")`,
      );
    return css;
  }
  async function asset(value: string, base: string): Promise<string> {
    if (/^data:(image\/(png|jpeg|gif|webp|svg\+xml)|font\/)/i.test(value))
      return value;
    const path = pathOf(value, base);
    if (!path) return "";
    if (cache.has(path)) return cache.get(path)!;
    const target = byPath.get(path),
      ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (!target || !types[ext]) return "";
    cache.set(path, "");
    const response = await fetch(contentUrl(target.id, token));
    if (!response.ok) throw new Error("A preview asset could not be loaded.");
    let blob: Blob;
    if (ext === "css") {
      const css = await rewriteCss(await response.text(), path);
      blob = new Blob([css], { type: types[ext] });
    } else
      blob = new Blob([await response.arrayBuffer()], { type: types[ext] });
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    cache.set(path, url);
    return url;
  }
  const response = await fetch(contentUrl(file.id, token));
  if (!response.ok) throw new Error("Preview could not be loaded.");
  const doc = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  doc
    .querySelectorAll("base,meta[http-equiv],iframe,object,embed,form")
    .forEach((n) => n.remove());
  for (const element of Array.from(
    doc.querySelectorAll("[src],[href],[srcset]"),
  )) {
    element.removeAttribute("srcset");
    for (const attr of ["src", "href"]) {
      const value = element.getAttribute(attr);
      if (!value) continue;
      if (element.tagName === "A") {
        element.removeAttribute("href");
        continue;
      }
      element.setAttribute(attr, await asset(value, file.path));
    }
  }
  for (const style of Array.from(doc.querySelectorAll("style")))
    style.textContent = await rewriteCss(style.textContent ?? "", file.path);
  for (const element of Array.from(doc.querySelectorAll("[style]")))
    element.setAttribute(
      "style",
      await rewriteCss(element.getAttribute("style") ?? "", file.path),
    );
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content =
    "default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline' data:; img-src data:; font-src data:; media-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  doc.head.prepend(policy);
  return {
    html: "<!DOCTYPE html>" + doc.documentElement.outerHTML,
    dispose: () => {},
  };
}
