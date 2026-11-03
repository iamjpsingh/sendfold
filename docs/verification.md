# Verification record

Initial local verification, 2 November 2026. This is a development release, not a production security or performance certification.

## Automated

- TypeScript checks for all workspaces, with unused local declarations rejected.
- Source-length check: all hand-written source and test files at most 300 lines.
- API integration: setup token, blocked public signup, login, project membership isolation, per-project admin/editor/viewer roles, membership revocation, directory restrictions, permission checks, comments, question responses, project locks, share revocation, and cross-origin mutation rejection.
- Revision integration: required editing lease, competing editor rejection, original-file retention, stale revision rejection, and concurrent saves producing exactly one winner.
- Workbook import/export: values, formulas, added tabs, and an empty tab survive XLSX conversion.
- Production frontend and Node API builds.
- Cloudflare Worker dry-run bundle and Pages Functions proxy compilation.
- Actual local workerd runtime: D1 migrations, first administrator, login, project counters, R2 upload, and authenticated content retrieval.

## Browser

- Administrator sign-in and projects dashboard, including the pastel theme.
- Regression coverage for uploaded-file, comment, and active-share counters.
- Optional sample project creates real HTML/CSS, XLSX, and questions.
- HTML preview loads local stylesheet and executes its sample button inside the sandbox.
- Open full view launches separate protected HTML and XLSX tabs; the saved worksheet tab persists after reopening.
- Password-only guest unlock, approval response, and posted project feedback verified in the browser. Guest access also carries into the separate full-view tab.
- Spreadsheet view is read-only until a lease is acquired; adding a blank worksheet and saving creates version 2.
- Switching files, signing out, and changing project tabs are disabled during an active workbook edit; route navigation is blocked until saving or discarding.

## Known validation limits

Production Cloudflare resources and hosting were subsequently configured; see the release verification below. Local workerd verification does not measure production CPU limits. Docker configuration is provided. The Docker CLI is installed, but its daemon is not running, so container execution was not verified. The built production Node server was started separately and successfully served its health endpoint and frontend.

The dependency audit reports moderate transitive advisories involving ExcelJS's Node archive/glob tooling and UUID utilities, and Drizzle Kit's legacy development loader/esbuild. The application does not expose those development servers. The browser XLSX path does not use the Node filesystem glob implementation. No forced major-version overrides were applied because they can break these libraries. Review upstream releases before a production rollout; do not treat this as a zero-advisory dependency tree.

The spreadsheet editor is a large lazy-loaded dependency. It is excluded from the initial app bundle, but opening a workbook requires downloading the editor. There is no load-test evidence for very large installations or concurrent production traffic.

## Release verification — 2 November 2026

- Project membership integration tests cover independent roles, inaccessible projects, editor/viewer restrictions, project-admin scope, membership removal, account disabling, and activity filtering.
- Built frontend checked in the browser: role changes persist; viewers have no upload, share, membership, account-directory, or installation-admin controls.
- GitHub Actions checks passed on the public repository.
- Production D1 migrations, private R2 bucket, API Worker, encrypted runtime secrets, and Pages service binding are configured.
- Live `/api/health` returns 200, `/api/setup` is reachable, and unauthenticated `/api/projects` returns 401.
- A Pages Git build completed successfully from commit `cd949fd`.
- First super-admin setup, production login, role checks, authenticated project listing, secure session cookies, and sign-out are verified. Initial setup is closed.
- Worker Git connection still requires completion. Authenticated production file flows have not yet been verified.

## AI connector verification — 2 November 2026

- Official MCP SDK client initializes the stateless server, lists tools and exercises project discovery, scoped search/fetch, text reading, HTML creation, optimistic revision saving, comments and questions.
- Integration coverage checks unapproved projects, read-only tool sets, account disabling, membership removal/downgrade, editor versus admin privileges, locked projects, expired/revoked keys and unsafe Origin rejection.
- OAuth tests cover both discovery endpoints, dynamic registration, signed consent tampering, login continuation, rejected PKCE verifier, scope narrowing, code replay rejection, refresh rotation, grant revocation and reconnect without reviving old tokens.
- Local workerd/D1/R2 run passed SDK initialization, all ten write-enabled tools being listed, an HTML upload, and immediate revocation. The OAuth discovery/consent/PKCE/refresh/revoke/reconnect flow also passed through workerd HTTP.
- Browser checked the built Settings connection panel, project selection and read-only defaults.
- Formatting, TypeScript, source-size checks, tests, production build, Worker dry run and Pages Functions compilation are required before release. Every handwritten source/test file remains at most 300 lines.
- Vendor setup follows current official documentation. End-to-end approval in the user's actual ChatGPT, Codex, Claude and Gemini accounts has not been performed. Custom connector availability depends on each client and plan. PDF/Office content extraction is not implemented.

## Sharing and branding release — 3 November 2026

- Formatting, TypeScript, all integration tests, XLSX round-trip tests, production build, Worker dry run, and Pages Functions compilation passed. All 126 handwritten source/test files are at most 300 lines.
- Single-file guest access is checked across metadata, content, history, workbooks, editing leases, comments, upload restrictions, expired/revoked links, and attempts to access other files or project resources.
- Branding tests cover administrator-only updates, safe logo formats, MIME spoofing, current-logo access, and concurrent partial settings updates. Task tests cover viewer restrictions, guest completion, unsafe links, and locked projects.
- Built UI verified in a real browser: numbered question creation and answers, task completion and filters, saved branding, sticky header, 390-pixel mobile layout, password-only single-file unlock, and opening an isolated HTML preview in a new tab.
- Cloudflare Pages reports `sendfold.imapro.in` Active with SSL enabled. Normal DNS and HTTPS return successfully. Production login, session lookup, and OAuth discovery on the custom origin passed.
- Backed up production D1, applied migration `0004_crazy_black_bolt.sql`, and deployed API version `41a9185a-85ee-4f18-9734-7f0e115f82b8`.
- Single-file shares deliberately exclude sibling HTML assets; use a whole-project share for multi-file HTML folders. Unrecognized formats have a full-view fallback and permitted downloads.

- GitHub Actions passed for release commit `e509568`; Pages deployed it successfully as `baf2a7c5-5e42-4a7f-8ace-6cd9f6b42d84`. The live browser verified administrator sign-in and the Branding settings.
- Production D1/R2 integration passed: uploading HTML/text, password-only single-file and whole-project access, denial of sibling-file access, task completion, approval answers, and immediate share revocation. Synthetic test data is removed after verification.
- Replaced the unsupported domain rule in `_redirects` with configurable Pages middleware. Regression coverage verifies path/query preservation, permanent method-preserving redirects, and no redirects for custom, preview, localhost, or self-targeting origins.
- API deployment works through Wrangler. Worker Git auto-deploy is still unconnected: the available login lacks Workers Builds access (403), and the existing dashboard browser session could not be controlled. Pages Git auto-deploy is working. The deployment guide contains the exact backend build settings for completing this account-level step.
