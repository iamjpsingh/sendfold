# Administrator responses and activity

Open a project and choose **Responses** to see current saved answers from every respondent. Questions stay numbered; administrators can search people/questions/answers, filter a question, refresh and export the visible page as CSV. The Questions tab also puts received answers ahead of the administrator's own optional response form. Answers submitted inside an uploaded HTML form are not automatically Sendfold question answers.

Choose **Activity** in the project for its event history and visitors. The main sidebar's Activity page also provides a project selector for projects you administer. Events can be filtered by visitor, name/email/IP/details, action and time period. Next/Previous traverse the complete stored history in pages of 50 using a stable time/ID cursor; this is separate from the bounded recent team-progress feed. CSV exports contain the displayed page and UTC timestamps.

## Recorded information

- Project views, protected-link visits, successful unlocks, incorrect passwords and throttled attempts.
- File preview/full-view requests, file/workbook content loads and download requests.
- Project creation/status/details, uploads and saved revisions, question creation/answers, comments and resolve/reopen actions, links/tasks, shares/revocation and membership changes.
- Event time, project, action, resource when available, actor kind/name/email, share label, IP, country code and browser user-agent when available.
- Visitors show first/last recorded activity, event count and latest recorded request metadata; opening a visitor's history shows changes in metadata over time.

Super admins can review all projects. Project admins can review their own projects. Editors, viewers, guests and AI connectors cannot read these private endpoints. The ordinary team-progress feed does not receive IP/browser/email metadata. Connector actions identify the connection separately when using the instrumented project/file routes; discovery/search calls are not logged as project visits.

Guest identity is self-reported; entering an email does not verify it. Anonymous link visits use a per-share HttpOnly cookie that grants no file access. Unlocking creates a separate guest identity, so anonymous and signed-in guest activity are not merged. New guest sessions also count separately. IPs can identify a shared network/proxy rather than a person. Browser information is client-supplied and country is network-derived. There is no fingerprinting, keystroke capture, recording inside uploaded HTML, or tracking across other sites. The unlock screen explains the recorded access information.

## Storage and deployment

Migration `0005_gray_black_queen.sql` adds `audit_events` and imports existing project activity as **Earlier record**, retaining its original time and detail. It does not invent earlier IPs, emails or verified identities. Future events snapshot actor information so revoking a share does not erase its history. Responses show the latest saved answer, while activity retains each answer-save event; prior answer values are not versioned in the activity table.

Project/file loads are grouped per actor/resource into five-minute windows to avoid polling noise. Preview/full-view events are grouped per minute; throttled password requests are grouped per share/minute. Downloads represent authorized requests, not proof of reading or completed transfer. Preview events are authenticated browser reports, not proof of human attention.

History has no automatic expiry and is retained with the project in the existing D1/SQLite database. Project deletion cascades to its history. Database operators can modify it; this is not a tamper-evident ledger. There is no new external analytics service or Cloudflare binding. Database storage and request quotas still apply.

Only the private Cloudflare adapter trusts edge IP headers; it ignores arbitrary `X-Forwarded-For`. The IPv6 companion is used only with a Class E pseudo-IPv4 address, and Cloudflare's cross-zone Worker sentinel is stored as unknown. See [Cloudflare's header reference](https://developers.cloudflare.com/fundamentals/reference/http-headers/). On a VPS, the Node adapter records the socket peer, so behind a reverse proxy this is the proxy address; forwarded headers are deliberately not trusted by default.
