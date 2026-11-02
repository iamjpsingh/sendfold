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

Cloudflare remote resources and a live deployment have not been created. Local workerd verification does not measure production CPU limits. Docker configuration is provided. The Docker CLI is installed, but its daemon is not running, so container execution was not verified. The built production Node server was started separately and successfully served its health endpoint and frontend.

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
