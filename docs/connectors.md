# Connect an AI app to Sendfold

Open **Settings → AI connectors** to copy your server URL, create a scoped access key, or revoke a connection. For this installation the URL is `https://sendfold.pages.dev/api/mcp`. Other installations use their own public HTTPS origin followed by `/api/mcp`.

This is an MCP server. Sendfold does not run an AI model or need an OpenAI, Anthropic or Google API key. Your AI client supplies the model and may have its own subscription or usage fees.

## Browser authorization

1. Add the MCP URL in your AI client and use OAuth with dynamic client registration (DCR).
2. Sign in with your existing Sendfold account. Client share passwords cannot authorize an AI connection.
3. Check the app name and return address. Select the projects it may access.
4. Leave **Allow edits** unchecked for read-only access, or enable it if you want the AI to create and revise files. Your project role still applies.
5. Approve. Manage or revoke the connection from Sendfold Settings.

The read scope is `sendfold:read`. Optional writes use `sendfold:write`; `offline_access` requests refresh tokens. Grant approval lasts at most 90 days; refresh tokens rotate and last up to 30 days, while access tokens last 15 minutes. Revoking the connection in Sendfold immediately stops its access tokens and removes refresh tokens. Reconnect when approval expires. User-supplied app names are not a verification of the app's identity.

## ChatGPT

Use ChatGPT's custom MCP app/connector setup where available, enter the HTTPS server URL, and select OAuth with DCR. No pre-created client ID or secret is needed for automatic registration. If a registration strategy is offered, choose DCR; this release does not serve Client ID Metadata Documents (CIMD). Enable the app for the conversation after authorizing it.

Custom app availability, developer controls and write-tool permissions depend on the ChatGPT plan and organization configuration. Sendfold includes `search` and `fetch`, plus ordinary MCP tools. Search covers project names, client names, descriptions and file paths, not full-text indexing of every attachment. See [OpenAI's authentication guidance](https://developers.openai.com/api/docs/mcp#handle-authentication) for current client requirements.

## Codex

```sh
codex mcp add sendfold --url https://sendfold.pages.dev/api/mcp
codex mcp login sendfold --scopes sendfold:read,sendfold:write,offline_access
```

If automatic registration does not select DCR, add `--oauth-client-registration dcr` to the login command. Approve only the projects and permissions you intend to share.

For a direct access key, create one in Settings and put it in a private `SENDFOLD_TOKEN` environment variable available to Codex, then add the server using:

```sh
codex mcp add sendfold --url https://sendfold.pages.dev/api/mcp --bearer-token-env-var SENDFOLD_TOKEN
```

Choose one authentication method for the server. Do not put keys in committed configuration. See [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp#streamable-http-servers).

## Claude

In Claude's custom connector settings, enter the MCP URL and complete the OAuth browser flow. Availability depends on the account and organization. In Claude Code:

```sh
claude mcp add --transport http sendfold https://sendfold.pages.dev/api/mcp
```

Open `/mcp` in Claude Code to authenticate. If using a bearer key instead, store it privately and configure the Authorization header using the client's supported secret/environment mechanism. See the [official Claude Code MCP guide](https://code.claude.com/docs/en/mcp).

## Gemini CLI

Add this to your Gemini CLI `settings.json`:

```json
{
  "mcpServers": {
    "sendfold": {
      "httpUrl": "https://sendfold.pages.dev/api/mcp",
      "oauth": {
        "enabled": true,
        "scopes": ["sendfold:read", "sendfold:write", "offline_access"]
      }
    }
  }
}
```

Run `/mcp auth sendfold` inside Gemini CLI and complete approval in the browser. This guide targets **Gemini CLI**; it does not claim arbitrary MCP support in the consumer Gemini website. See [Gemini CLI MCP and OAuth documentation](https://geminicli.com/docs/tools/mcp-server/).

## Available tools

| Tool | Access | Behavior |
| --- | --- | --- |
| `list_projects` | Read | Approved projects still accessible to your account |
| `get_project` | Read | Project context, questions, feedback and recent activity |
| `list_files` | Read | Paginated metadata and protected full-view links |
| `read_text_file` | Read | UTF-8 text/HTML/Markdown/JSON/CSV/source files, up to 256 KB |
| `search` / `fetch` | Read | Up to 50 metadata matches; fetch project context or text content |
| `create_text_file` | Write + editor/admin | New text/HTML file with folder path; never overwrites an existing path |
| `update_text_file` | Write + editor/admin | New revision with expected version and an exclusive editor lease |
| `add_comment` | Write + editor/admin | Project or file feedback attributed to the connection |
| `create_question` | Write + project admin | Text, choice or approval question |

Read-only connections do not advertise write tools. Locked projects reject writes. Removing membership or disabling the account stops access without reissuing keys. An HTML file created through MCP opens in Sendfold's existing protected, sandboxed full-view page.

No tools manage accounts, memberships, share links/passwords, installation settings or deletes. PDF/Office/image files have metadata and protected links; PDF extraction, spreadsheet cell edits and arbitrary binary MCP uploads are not implemented. Browser upload and preview remain available. Project context responses have bounded lists; file listings support an offset. Full-view links require a Sendfold session and are not public downloads.

Examples: “Read the onboarding questions in my approved project”; “Create proposal/index.html from this draft”; “Add an approval question for the homepage design.” File contents and client comments are untrusted material, not instructions to the AI.

## Verification and hosting

The official MCP SDK client and the OAuth protocol flows have been exercised against Node/SQLite and local Cloudflare workerd/D1/R2. This is not a claim that the user's accounts in every AI vendor have completed a live connection. See [verification](verification.md).

Apply the database migration before deploying the API, then deploy the frontend including `/.well-known/*` and `/api/*` proxies. No additional Cloudflare binding or AI vendor secret is required. HTTP localhost works for local CLI testing; hosted ChatGPT/Claude connectors need a public HTTPS URL.
