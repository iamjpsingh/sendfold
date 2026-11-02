# Architecture

Sendfold uses a small shared API rather than separate implementations for each host. Hono routes depend on `Platform`, which provides a Drizzle database, a private blob store, configuration, and atomic SQL batches. `worker.ts` implements D1/R2; `node-platform.ts` implements SQLite/filesystem.

## Access

One installation contains all client projects. Super admins create accounts and projects and can access everything. Project admins manage assigned projects, members, shares, questions, and locks. Editors upload, edit, answer, and comment on assigned projects. Viewers view and download assigned files. A user can have different roles on multiple projects. Membership is checked on every resource request; project and activity lists are filtered by membership. Only super admins can browse the account directory. Project admins add existing accounts by exact email.

The internal `workspaces` table is retained for migration compatibility and the installation name; no workspace creation or switching API is exposed. The membership migration preserves existing access, mapping legacy admins to project admins and legacy members to editors in their existing projects.

Guest links have independent random tokens, scrypt password hashes, permissions, and expiry. Unlocking creates a hashed session token in the database and an HttpOnly cookie. Production cookies are Secure and SameSite=Strict. Guest sessions expire within eight hours or at link expiry, whichever comes first. Each request rechecks link revocation, expiry, and project access.

Public account signup is blocked. First-run setup needs the server's setup token and can only create the initial administrator. Admin-created team accounts use Better Auth. Disabled users lose server access and existing sessions. Unsafe browser requests must match the configured origin.

Login and share unlock attempts use persistent database throttles. These are a basic application control, not a distributed abuse defense. Add platform-level controls when operating an exposed instance at scale. Expired throttle/session rows currently require periodic maintenance; no background scheduler is installed.

## Files and previews

Files are private objects referenced by metadata, never public URLs. Content routes require project access, return `no-store`, `nosniff`, and attachment content disposition. File paths are normalized and reject traversal. Upload metadata and initial revisions are inserted atomically.

HTML is parsed in the browser; local assets are resolved from the same project and embedded into an iframe document. The iframe permits scripts but does not permit same-origin access, forms, popups, or top-level navigation. Its CSP blocks external network and nested frames. Every file has a full-view route that opens in another tab. HTML uses the same isolated viewer there. It never publishes a raw HTML object on the app origin.

Supported preview types are explicit. DOCX uses docx-preview; PDFs use the browser viewer. XLSX conversion is an intentionally limited ExcelJS adapter around the open-source Univer grid. No paid Univer import, export, or collaboration service is used.

## Revisions and collaboration

Edits acquire a 90-second lease renewed every 30 seconds. Every save includes the expected revision; an atomic conditional batch prevents stale or concurrent saves from overwriting a newer revision. Original bytes are retained. R2/filesystem writes and database transactions cannot form one cross-system transaction; failed writes are cleaned up on handled errors. A crashed request can leave an unreferenced object, so a future maintenance task should reconcile these.

Comments capture the current file version. Questions support written, single-choice, multiple-choice, and approval answers. Admins see all responses; guests see their own responses. Guest display names are not verified identity. Approval records are workflow responses, not electronic signatures.

Indexed project, comment, share, question, and activity lookups keep common operations simple. Project counters are fetched in one SQL query rather than one network round trip per project. Large project lists, comment histories, and file trees need pagination before very large-scale use; do not treat the current initial release as load-tested enterprise infrastructure.

## Later MCP connectors

Add a separate authentication and scope layer for machine clients. Begin with read-only project/file metadata, then explicit comment/response tools. Require project-scoped revocable tokens or OAuth, audit tool use, and treat uploaded content as untrusted. Browser cookies and guest link passwords must not become machine API keys. No connector endpoint exists in this release.
