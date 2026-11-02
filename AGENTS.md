# Sendfold conventions

- Keep every hand-written source and test file at or below 300 lines. Aim for 100–200 lines. Split by responsibility; do not compress formatting to pass the limit.
- Use the repository Prettier defaults and run `npm run check` before handing off changes.
- Use shadcn/ui components and Tailwind theme tokens for product UI. Do not add a second component framework. Univer owns only the spreadsheet canvas.
- Keep platform details in the Cloudflare and Node adapters. Route modules use the shared Platform interface.
- Enforce authorization on the server for every project, file, share, and mutation. Never serve uploaded HTML on the application origin as executable content.
- Add focused tests for security, persistence, and concurrency changes. Run `npm test`, `npm run build`, and the Worker dry run when changing deployment code.
- Keep secrets and client files out of source control. Samples must be clearly labeled and opt-in.
- The initial release uses one editor at a time and optimistic revision checks. Do not claim real-time co-editing or full Excel fidelity.
