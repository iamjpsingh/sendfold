# Sendfold

[Open Sendfold](https://sendfold.pages.dev) · [GitHub](https://github.com/iamjpsingh/sendfold)

A private project portal for files, client questions, decisions, and feedback. MIT licensed; self-host on Cloudflare Pages + Workers or a VPS. No hosted authentication subscription is required.

## What works

- One self-hosted installation with named client projects. Super admins manage the installation; each project has its own admins, editors, and viewers.
- Drag-and-drop files and folders, preserving relative paths. 25 MB per file; 500 files per upload batch.
- Sandboxed HTML previews with local CSS, images, and classic scripts; local assets remain isolated from the dashboard.
- **Open full view** on every file opens a protected full-width viewer in a new tab, including spreadsheets, PDF, DOCX, images, HTML, and text.
- Browser PDF and image previews, DOCX rendering, and plain-text previews. Other formats remain downloadable.
- XLSX editing through Univer OSS: cells, basic formulas, worksheet tabs, a single-editor lease, and saved revisions. Original files stay in history.
- Password-only guest links, expiry, revocation, view/comment/edit permissions, and independent upload/download controls.
- Project and file feedback, resolved comments, questions, multiple-choice responses, approvals, CSV response export, and activity history.
- People management, per-project membership, account disabling, and light/dark/system themes with soft lavender, mint, and peach accents.

## Run locally

Requires Node 22.22+ and npm 10+.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The API runs on port 8787. Local SQLite and private files are stored in `.data/`. The first run creates `.data/setup-token`; use its contents in the first-run form to create your own super-admin account. There are no default accounts or passwords. Samples are created only when you click **Try a sample project**.

```sh
cat .data/setup-token
```

Do not publish this token. Production requires explicit secrets; local generated credentials are only a development convenience.

## Stack

| Layer | Implementation |
| --- | --- |
| Monorepo | npm workspaces + Turborepo + TypeScript |
| Web | React, Vite, TanStack Router and Query |
| UI | Official shadcn/ui components, Radix, Tailwind CSS |
| API | Hono and Zod |
| Authentication | Better Auth with email/password for team accounts |
| Guest access | Hashed link passwords and revocable HttpOnly guest sessions |
| Data | Drizzle, Cloudflare D1 / SQLite |
| Files | Private R2 / local filesystem |
| Spreadsheets | Univer OSS + ExcelJS |
| Documents | docx-preview and the browser PDF viewer |

## Repository

```text
apps/web/          React frontend and Pages API service-binding proxy
apps/api/          Hono routes, auth, and Cloudflare/Node adapters
packages/database Drizzle schema and generated SQL migrations
packages/shared/  Shared API types
scripts/          Small maintenance and source-size checks
```

Every hand-written source and test file is capped at 300 lines. Features live in focused modules; generated dependency declarations and migration metadata are excluded from this rule. `npm run check` enforces the cap and TypeScript checks. See `AGENTS.md` for contribution conventions.

```sh
npm run check
npm test
npm run build
npm run cf:check -w @sendfold/api
```

Tests cover access boundaries, guest permissions, revocation, locked projects, exclusive editing, concurrent revision conflicts, original-file retention, and XLSX round trips. Browser checks are recorded in `docs/verification.md`.

## Deployment

- [Cloudflare Pages + Worker + D1 + R2](docs/deployment.md)
- [VPS / Docker](docs/vps.md)
- [Architecture and security model](docs/architecture.md)

This repository provides deployment configuration. It does not reserve a domain or imply that a public deployment already exists. Hosting costs and quotas are separate from the software license.

## Current boundaries

This is an initial working release. Excel charts, macros, pivots, complex formatting, and all Excel formula semantics are not preserved by the basic import/export adapter. Use version history to retrieve the original; review exported workbooks before relying on advanced features. XLS and XLSM are download-only. Editing is one person at a time, not real-time co-editing. Views refresh every 20 seconds.

HTML previews run in an opaque-origin iframe with network requests restricted. They support static folder assets, not backend services, remote embeds, or a full application development server. A download toggle hides the supported download action; it cannot prevent capturing content that someone can view.

Questions and comments are persisted. DOCX/PDF are previewable, not full document editors. Identity supplied by a password guest is self-reported. Closing a guest session and entering again creates a new respondent identity. No transactional email is configured.

The MCP connector supports OAuth browser authorization and project-scoped, expiring access keys. Manage it in **Settings → AI connectors**. It exposes project context, text-file reading/revisions, feedback and questions. PDF/Office extraction, arbitrary binary uploads through MCP, and real-time subscriptions are not included. See the [connection guide](docs/connectors.md) for ChatGPT, Codex, Claude and Gemini CLI setup and verification limits.

## License

MIT for Sendfold code. Dependencies retain their own licenses; see `THIRD_PARTY_NOTICES.md`.
