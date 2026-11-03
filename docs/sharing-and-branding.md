# Sharing and branding

## Whole project or one file

Use **Share project** to include all project files, questions, feedback, links and tasks. Use **Share file** beside a preview, or pick a file in the sharing dialog, to restrict a link to that file and its feedback. Each link has a separate password, permission, expiry and download setting. Revoke it to close existing guest sessions.

Single-file links can start in compact preview or full view. Recipients can switch views and use **Open full view** to open a protected preview in a new tab. Single-file access is enforced on the API for content, versions, spreadsheets, edits and comments. It does not allow uploading extra files or accessing project questions/resources. Signed-in team members retain their own project permissions.

Share the entire project for an HTML site that depends on separate stylesheets, images or scripts in the uploaded folder. A single-file link includes only its chosen file; self-contained HTML works in either mode. Unknown file formats can be stored and downloaded, but may not have a browser preview. Uploaded HTML runs in an isolated sandbox.

## Questions and next steps

Questions and their options are numbered, including numbers in the CSV response export. The question builder has separate choice fields and a response preview. One-answer questions use radio buttons; multiple-answer questions include select-all and clear controls.

**Links & tasks** keeps reference URLs and a checklist in the project. Editors can add and edit items and mark them important. People with comment access can complete/reopen tasks. Viewers can read them. Locked projects cannot be changed. Filter by links, tasks or important items, and hide completed tasks. Project tabs survive reloads and can be linked directly.

## Branding

Super admins can change the display name, tagline and logo under **Settings → Branding**. PNG, JPEG and WebP logos up to 1 MB are supported. Branding is visible before sign-in and on shared links; use a public-facing logo. Replacing a logo prevents its old URL from being served, while old image objects remain in private storage.

The footer links to the open-source repository by default. Enable the custom credit to show **Powered by {company name}**, with an optional HTTPS website link. These settings do not change the MIT license. Device theme preferences remain in **Settings → General**, and AI connections have their own tab.

## Possible next additions

- Reusable question and checklist templates for common client handoffs.
- A review summary that exports decisions, comments and outstanding tasks together.
- Optional review due dates and email reminders, after choosing a mail provider.
- A storage/backup dashboard with restore checks and retention controls.

These are suggestions, not features in this release. Live simultaneous spreadsheet editing and full Excel fidelity are also outside the current release; editing uses a lease and revision checks.
