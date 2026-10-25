# WorkTrack - Project Info

## Server
- IP: 34.18.50.195
- Domain: https://worktrack.ddns.net
- SSH: `ssh -i ~/.ssh/worktrack hrmohamedyehia@34.18.50.195`
- Project root: `~/WorkTrack`

## Key Paths
| Component | Path on server |
|-----------|---------------|
| Backend | `~/WorkTrack/backend` |
| Frontend source | `~/WorkTrack/frontend` |
| Frontend build | `~/WorkTrack/frontend/dist` |
| PM2 process | `worktrack-backend` on port 5000 |
| Caddy config | `~/Caddyfile` |
| Caddy service | systemd user service `caddy.service` |
| DB credentials | `~/WorkTrack/.env` |

## Deployment
Deployment is automated by `.github/workflows/ci-cd.yml`:

1. **Commit and push** to `main`.
2. CI runs smoke/isolation tests, frontend build, syntax checks, the dependency
   audit gate, and migration validation against MariaDB.
3. If `vars.STAGING_ENABLED == 'true'`, staging deploys first (environment `staging`).
4. Production waits for the `production` environment approval, then the server runs
   `scripts/deploy.sh`: pre-deploy DB backup → `npm ci` → frontend build → baseline
   (one-time) + pending migrations → `pm2 restart` → health check.
5. A failed health check rolls the code back to the previous commit. Migrations are
   **not** rolled back automatically, so migrations must stay backward-compatible
   with the previous release.

Manual deploy on the server (emergency only):

```
cd ~/WorkTrack && git fetch origin main
git show origin/main:scripts/deploy.sh > /tmp/deploy.sh
APP_DIR=~/WorkTrack HEALTH_URL=https://worktrack.ddns.net/api/health bash /tmp/deploy.sh
```

The legacy manual sequence (`git pull` + build + pm2 restart) skips migrations and
health checks; do not use it for releases that include schema changes.

## Migrations
- Files: `backend/migrations/NNN_*.sql`; `full_schema.sql` is a snapshot and is
  never executed by the runner.
- Apply: `cd backend && npm run migrate` (uses root `.env`).
- Inspect: `npm run migrate:status`.
- Applied files are tracked with checksums in `schema_migrations`; editing an
  applied migration makes the runner fail. Add a new numbered migration instead.
- A pre-existing database needs a one-time
  `node scripts/migrate.js --baseline-through=024` before applying newer files;
  the runner refuses to baseline if key schema markers are missing.

## Operations

### Health checks
- Liveness: `GET /api/health` (process is up).
- Readiness: `GET /api/health/ready` (returns 200 only when the DB answers within 3s).
- `.github/workflows/uptime.yml` polls readiness every 15 minutes. Set the optional
  repository secret `UPTIME_WEBHOOK_URL` (Slack-compatible `{"text": ...}`) to get
  notified on failure, and the optional variable `UPTIME_URL` to override the target.

### Backups
- Manual: `bash backend/scripts/backup.sh [daily|weekly|monthly]`.
- Scheduled: `bash backend/scripts/install-backup-cron.sh --apply` installs a
  tagged cron entry (02:30 daily) that picks monthly on the 1st, weekly on Sunday,
  otherwise daily. Monthly runs also execute a restore drill (`RUN_RESTORE_DRILL=false`
  disables it).
- Archives live in `~/WorkTrack/backups` (git-ignored), mode 0600, gzip-checked,
  with daily/weekly/monthly retention of 7/28/365 days.

### Restore drill
- `bash backend/scripts/restore.sh [archive]` restores the newest archive (or the
  given one) into `${DB_NAME}_restore_verify`, verifies the schema, and drops the
  scratch database. It refuses to target the live database or an existing scratch DB.
- Flags: `KEEP_RESTORE_DB=true`, `ALLOW_EXISTING_RESTORE_DB=true`,
  `ALLOW_PRODUCTION_RESTORE=true` (dangerous), `MYSQL_BIN=mariadb` if `mysql` is
  not installed.
- Cron and CI use the same script, so the drill is exercised every month.

### Monitoring
- `bash backend/scripts/check-backup-age.sh` fails when the newest archive is older
  than 30 hours (`MAX_AGE_HOURS` overrides). Run it from an external monitor or add
  it to the uptime check.

## Caddy
- Caddy replaces Nginx, handles HTTPS automatically via Let's Encrypt.
- Config file: `~/Caddyfile`
- Restart after config change: `systemctl --user restart caddy`
- Caddy is a systemd user service (no sudo needed after initial setup).

## PM2
- Manages the Node.js backend.
- Commands: `pm2 status`, `pm2 restart worktrack-backend`, `pm2 logs worktrack-backend`
- Auto-starts on server boot via PM2's saved process list.

## Database
- MariaDB (MySQL-compatible)
- DB name: `work_track_db`
- User: `worktrack`
- Credentials in `~/WorkTrack/.env`

## Admin Login
- URL: https://worktrack.ddns.net/login
- Admin accounts are bootstrapped via **magic link**, not a shared password.
- On fresh seed, a Tenant Admin row is created with `must_change_password=1`.
- **Onboarding flow:**
  1. Call `POST /api/magic-link/request-magic-link` with the tenant admin's email.
  2. In non-production (`NODE_ENV !== 'production'`), the response body includes
     `dev_magic_link` and `dev_token` — no SMTP required locally.
  3. Open the magic link → set an initial password.
  4. On first real login, `must_change_password=true` forces a second password change.
- **Dev shortcut:** When `NODE_ENV=development` (or unset), the magic-link endpoint
  returns the token in the response body so you can test without configuring SMTP.
- The tenant admin username defaults to `Admin` (env `ADMIN_USERNAME` overrides this).

## Git
- Remote: https://github.com/killmemo11/WorkTrack.git
- Branch: main
- Local repo: `D:\Work From Home\Work Track`
