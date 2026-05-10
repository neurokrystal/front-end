DigitalOcean App Platform Configuration Guide (Combined Deployment)

This guide covers deploying both the 'web' and 'api' applications as services within a single DigitalOcean App. This allows for "local" communication between services and shared domain routing.

1. GLOBAL / INITIAL APP SETTINGS
- Service Type: Web Service (Add two of these)
- Source: GitHub
- Repository: neurokrystal/front-end
- Branch: main
- Source Directory: / (CRITICAL: Must be the repository root)
- Auto-deploy: Yes

2. COMPONENT: web (Frontend)
- Component Type: Web Service
- Source Directory: /
- Build Command: pnpm --filter web... build
- Run Command: pnpm --filter web start
- HTTP Port: 3000
- Routes: /
- Health Check: Path: /
- Instance Size: Basic-XXS ($5.00/mo) or higher
- Instance Count: 1
- Environment Variables:
  * CI: true (Build & Run-time)
  * NPM_CONFIG_UPDATE_NOTIFIER: false (Build & Run-time)
  * NODE_ENV: production (Run-time)
  * APP_ENV: production (Build & Run-time)
  * NEXT_PUBLIC_API_URL: ${APP_URL}/api (Build-time) - Automatically infers the API path.
  * NEXT_PUBLIC_APP_URL: ${APP_URL} (Build-time) - Automatically infers the App URL.

3. COMPONENT: api (Backend)
- Component Type: Web Service
- Source Directory: /
- Build Command: pnpm --filter api... build
- Run Command: pnpm --filter api start
- HTTP Port: 8080
- Routes: /api (This routes all https://your-domain.com/api/* requests to this service)
- Health Check: Path: /health
- Instance Size: Basic-XXS ($5.00/mo) or higher
- Instance Count: 1
- Environment Variables:
  * CI: true (Build & Run-time)
  * NPM_CONFIG_UPDATE_NOTIFIER: false (Build & Run-time)
  * NODE_ENV: production (Run-time)
  * APP_ENV: production (Build & Run-time)
  * PORT: 8080 (Run-time)
  * POSTGRES_DB_URL: (Secret, Run-time) - Set this in the UI.
  * BETTER_AUTH_SECRET: (Secret, Run-time) - Set this in the UI.
  * BETTER_AUTH_URL: ${APP_URL}/api (Run-time) - Automatically inferred.
  * CORS_ORIGIN: ${APP_URL} (Run-time) - Automatically inferred.
  * MAILGUN_API_KEY: (Secret, Run-time)
  * MAILGUN_DOMAIN: (Run-time)
  * DO_SPACES_KEY: (Secret, Run-time)
  * DO_SPACES_SECRET: (Secret, Run-time)
  * DO_SPACES_ENDPOINT: (Run-time)
  * DO_SPACES_BUCKET: (Run-time)
  * DO_SPACES_REGION: (Run-time)

INFERRED VARIABLES:
- DigitalOcean automatically replaces ${APP_URL} with the actual URL of your app (including custom domains).
- This ensures that CORS and Auth redirects work perfectly without manual editing.

SECRETS:
- All items marked (Secret) in the UI should be overridden with your actual sensitive data.
- Non-secret items (like MAILGUN_DOMAIN) have sensible defaults or placeholders but should still be reviewed.

4. CUSTOM DOMAINS & HTTPS SETUP
- SSL/TLS: Automatic (provided by DigitalOcean).
- To assign a subdomain:
  1. Go to the App's dashboard in DigitalOcean.
  2. Click 'Settings' tab.
  3. Locate 'Domains' and click 'Edit'.
  4. Click 'Add Domain'.
  5. Enter your subdomain (e.g., app.example.com).
  6. DigitalOcean will provide a CNAME or ALIAS record. Update your DNS provider with this value.
  7. Wait for propagation. DigitalOcean will automatically issue and manage the HTTPS certificate.

TROUBLESHOOTING PNPM BUILDS:
If the build fails with '[ERR_PNPM_IGNORED_BUILDS]', it's because pnpm requires explicit approval for build scripts (e.g., for 'sharp' or 'esbuild').
We have configured this in the root package.json.

If the build hangs during 'pnpm install':
- We have disabled the pnpm update notifier.
- We have pinned 'better-auth' to a specific version.
- Ensure the instance has at least 512MB RAM (Basic-XXS). If it still hangs, consider upgrading to Basic-XS ($10/mo).
