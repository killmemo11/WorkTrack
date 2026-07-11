# WorkTrack - Project Info

## Server
- IP: 34.18.219.80
- Domain: https://worktrack.ddns.net
- SSH: `ssh -i ~/.ssh/worktrack hrmohamedyehia@34.18.219.80`
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

## Deployment Steps
After making changes to the local code:

1. **Commit and push** locally:
   ```
   git add -A
   git commit -m "description of changes"
   git push
   ```

2. **Update server** (SSH):
   ```
   cd ~/WorkTrack && git pull
   cd frontend && npm run build
   pm2 restart worktrack-backend
   ```

3. The site at https://worktrack.ddns.net will reflect the changes immediately after the build.

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
