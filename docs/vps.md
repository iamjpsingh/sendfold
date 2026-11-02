# VPS / Docker

The same API runs on Node with SQLite WAL and private local file storage. No Cloudflare account is required.

1. Install Docker and Compose on your VPS.
2. Copy `.env.example` to `.env`. Set `APP_ORIGIN` to your final HTTPS URL. Generate different `BETTER_AUTH_SECRET` and `SETUP_TOKEN` values with `openssl rand -hex 32`.
3. Run `docker compose up --build -d` from the repository root.
4. Reverse proxy HTTPS to `127.0.0.1:8787` with Caddy, Nginx, or your existing proxy. The example Compose file binds the HTTP port to loopback only.
5. Open the final HTTPS URL and create your administrator using the setup token.

Example Caddy site:

```caddyfile
sendfold.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

The container runs as the unprivileged `node` user and persists SQLite and files in the `sendfold-data` volume. On startup it applies pending database migrations. The health endpoint is `/api/health`.

Back up the entire data volume and secrets. Stop the application during a filesystem snapshot or use SQLite's backup mechanism; copying only the live `.sqlite` file can omit WAL transactions. Test restoration on a separate instance. Retain matching file objects for all database revisions.

For a non-Docker deployment, run `npm ci && npm run build`, configure `NODE_ENV=production`, the three required environment variables, `DATA_DIR`, `HOST` and `PORT`, then run `npm start -w @sendfold/api` under a process manager. Use Node 22.22+ and keep the workspace packages and migration directory alongside the built API.

The initial SQLite adapter is intended for one application instance with a local persistent disk. Do not mount a shared SQLite database across multiple independently running servers. Cloudflare's D1/R2 adapter is the scale-out deployment path. If VPS requirements grow beyond one instance, add a Postgres/object-storage adapter and integration tests before scaling replicas.
