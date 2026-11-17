# Azim Realty — Deployment Guide

Target: **Ubuntu 22.04 LTS** on a VPS with **CloudPanel** or hand-rolled nginx + systemd. These steps assume one host runs PostgreSQL, the Go API, and the SPA behind a single public TLS endpoint.

---

## 1. Prepare the host

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql-16 postgresql-client-16 nginx certbot \
                    python3-certbot-nginx ufw git curl

# Install Go (for building without Docker) — skip if you only run containers.
curl -fsSL https://go.dev/dl/go1.23.4.linux-amd64.tar.gz | sudo tar -C /usr/local -xz
echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee /etc/profile.d/go.sh

# Node for the frontend build.
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Firewall: allow SSH, HTTP, HTTPS only.
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## 2. Create a Unix user for the app

```bash
sudo useradd --system --home /opt/azim --shell /usr/sbin/nologin azim
sudo mkdir -p /opt/azim /var/lib/azim/uploads /var/backups/azim
sudo chown -R azim:azim /opt/azim /var/lib/azim /var/backups/azim
```

## 3. Database

```bash
sudo -u postgres psql <<SQL
CREATE ROLE azim LOGIN PASSWORD '<CHANGE_ME>';
CREATE DATABASE azim OWNER azim;
SQL
```

Apply migrations in order:

```bash
cd /opt/azim/app/backend/migrations
for f in 001_init.sql 002_seed.sql 003_phase2.sql 004_phase3.sql 005_phase4.sql; do
  PGPASSWORD='<CHANGE_ME>' psql -h localhost -U azim -d azim -f "$f"
done
```

For a production system, **skip `002_seed.sql`** — that's demo data.

## 4. Build & install the backend

```bash
sudo -u azim git clone <your-repo> /opt/azim/app
cd /opt/azim/app/backend
sudo -u azim /usr/local/go/bin/go build -trimpath -ldflags="-s -w" -o server ./cmd/server
sudo -u azim /usr/local/go/bin/go build -trimpath -ldflags="-s -w" -o bootstrap ./cmd/bootstrap
```

Create `/opt/azim/app.env` (mode `0640`, owner `azim`):

```ini
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=azim
DB_PASSWORD=<CHANGE_ME>
DB_NAME=azim
JWT_SECRET=<64_random_chars>
CORS_ORIGIN=https://your-domain.tld
PUBLIC_BASE_URL=https://your-domain.tld
UPLOAD_DIR=/var/lib/azim/uploads
DOCS_PATH=/opt/azim/app/backend/docs/openapi.yaml
HSTS=true
PORT=8080
```

Create the first admin:

```bash
sudo -u azim bash -c '
  set -a; . /opt/azim/app.env; set +a
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="<min 12 chars>" ADMIN_NAME="Owner" \
    /opt/azim/app/backend/bootstrap
'
```

## 5. systemd service

`/etc/systemd/system/azim-api.service`:

```ini
[Unit]
Description=Azim Realty API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=azim
Group=azim
WorkingDirectory=/opt/azim/app/backend
EnvironmentFile=/opt/azim/app.env
ExecStart=/opt/azim/app/backend/server
Restart=on-failure
RestartSec=5
# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/azim/uploads
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictRealtime=true
RestrictSUIDSGID=true
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now azim-api
sudo systemctl status azim-api
curl -s http://127.0.0.1:8080/healthz    # → {"status":"ok"}
```

## 6. Build & deploy the frontend

```bash
cd /opt/azim/app/frontend
sudo -u azim npm ci
sudo -u azim env VITE_API_URL=https://your-domain.tld/api/v1 npm run build
# The static files now live at /opt/azim/app/frontend/dist
```

## 7. nginx + TLS

`/etc/nginx/sites-available/azim`:

```nginx
server {
    listen 80;
    server_name your-domain.tld;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.tld;

    # Managed by certbot — do not edit by hand.
    ssl_certificate     /etc/letsencrypt/live/your-domain.tld/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.tld/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # SPA
    root /opt/azim/app/frontend/dist;
    index index.html;
    client_max_body_size 10m;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location / { try_files $uri $uri/ /index.html; }

    # Backend — pass X-Forwarded-Proto so HSTS/secure-cookie logic fires.
    location /api/        { proxy_pass http://127.0.0.1:8080; include /etc/nginx/azim-proxy.conf; }
    location /uploads/    { proxy_pass http://127.0.0.1:8080; include /etc/nginx/azim-proxy.conf; }
    location = /sitemap.xml { proxy_pass http://127.0.0.1:8080; include /etc/nginx/azim-proxy.conf; }
    location = /robots.txt  { proxy_pass http://127.0.0.1:8080; include /etc/nginx/azim-proxy.conf; }
    location = /docs            { proxy_pass http://127.0.0.1:8080; include /etc/nginx/azim-proxy.conf; }
    location = /docs/openapi.yaml { proxy_pass http://127.0.0.1:8080; include /etc/nginx/azim-proxy.conf; }
}
```

`/etc/nginx/azim-proxy.conf`:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_read_timeout 60s;
```

```bash
sudo ln -s /etc/nginx/sites-available/azim /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.tld   # issues cert + reloads nginx
sudo nginx -t && sudo systemctl reload nginx
```

## 8. Backups

Scripts live at [scripts/backup.sh](scripts/backup.sh) and [scripts/restore.sh](scripts/restore.sh).

```bash
sudo install -m 0755 /opt/azim/app/scripts/backup.sh /usr/local/sbin/azim-backup
sudo install -m 0755 /opt/azim/app/scripts/restore.sh /usr/local/sbin/azim-restore
```

Nightly crontab for the `azim` user:

```cron
10 3 * * *  BACKUP_DIR=/var/backups/azim UPLOAD_DIR=/var/lib/azim/uploads /usr/local/sbin/azim-backup >> /var/log/azim-backup.log 2>&1
```

Set up offsite mirroring (rsync, S3, or any provider you trust) against `/var/backups/azim`. Test the restore path quarterly on a staging box.

## 9. Upgrades

```bash
sudo -u azim bash -c '
  cd /opt/azim/app && git pull
  cd backend && /usr/local/go/bin/go build -trimpath -ldflags="-s -w" -o server ./cmd/server
  # apply any new migrations in /opt/azim/app/backend/migrations/
'
sudo systemctl restart azim-api

cd /opt/azim/app/frontend && sudo -u azim npm ci && \
  sudo -u azim env VITE_API_URL=https://your-domain.tld/api/v1 npm run build
# nginx serves straight from dist; no reload needed.
```

Before destructive schema changes: **always run `azim-backup` first**, then apply the migration, then verify the app still starts. `scripts/restore.sh` handles rollback.

## 10. Monitoring & logs

- `journalctl -u azim-api -f` — live backend logs
- `tail -f /var/log/nginx/access.log /var/log/nginx/error.log`
- `/admin/audit` (super_admin only) — sensitive-action audit trail
- `GET /healthz` — liveness probe for your uptime monitor
- `GET /docs` — OpenAPI / Swagger UI (consider nginx-level basic auth on `/docs` in prod if you don't want the spec public)

## 11. Hardening checklist

- [ ] Rotate `JWT_SECRET` whenever a super_admin leaves the team; all refresh tokens are invalidated via the next-password-change flow on each user.
- [ ] Enable UFW, SSH key auth only, disable root login.
- [ ] Fail2ban on nginx + sshd.
- [ ] Database: `pg_hba.conf` restricts `azim` to `127.0.0.1` only.
- [ ] HTTPS everywhere, HSTS enabled (`HSTS=true` in env).
- [ ] Backups run nightly and are copied offsite.
- [ ] Monitoring/alerting hooked up to `/healthz`.
- [ ] Confirm `/admin/audit` fires for login, create, update, delete, publish/unpublish, password change, settings change.
