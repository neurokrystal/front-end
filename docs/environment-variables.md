# Environment Variables

## Required (API will not start without these)

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_DB_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `BETTER_AUTH_SECRET` | Secret for Better-Auth sessions | Random 32+ character string |
| `BETTER_AUTH_URL` | Public URL of the API service (where the API is hosted) | `https://api.dimensional.io` |
| `CORS_ORIGIN` | Allowed origin for CORS | `https://dimensional.io` |
| `MAILGUN_API_KEY` | Mailgun API key for sending emails | `key-xxxxxxxxxxxxxxxx` |
| `MAILGUN_DOMAIN` | Mailgun domain for sending emails | `mg.dimensional.io` |

## Optional (features degrade gracefully)

| Variable | Description | Default Behaviour Without It |
|----------|-------------|------------------------------|
| `APP_ENV` | Application environment stage (`test` or `production`) | Defaults to `test` |
| `MAILGUN_URL` | Mailgun API base URL | Defaults to US region |
| `STRIPE_SECRET_KEY` | Stripe API secret key | Mock payment provider used |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Webhooks won't verify |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend) | No Stripe checkout UI |
| `DO_SPACES_KEY` | DigitalOcean Spaces access key | Mock storage used (files stored locally) |
| `DO_SPACES_SECRET` | DigitalOcean Spaces secret | Mock storage |
| `DO_SPACES_BUCKET` | Spaces bucket name | Mock storage |
| `DO_SPACES_ENDPOINT` | Spaces endpoint URL | Mock storage |
| `DO_SPACES_REGION` | DigitalOcean Spaces region | Mock storage |

## Frontend Variables (Web)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Public URL of the API | `https://api.dimensional.io` |
| `NEXT_PUBLIC_APP_URL` | Public URL of the Web app | `https://dimensional.io` |

## Set Automatically

| Variable | Description | Set By |
|----------|-------------|--------|
| `NODE_ENV` | Node environment (`development`, `test`, `production`) | Environment / Dockerfile |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chromium binary | Dockerfile |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | Prevents Puppeteer downloading Chromium | Dockerfile |
| `COMMIT_SHA` | Git commit hash for the deployed version | app.yaml / CI |
| `PORT` | Port the API listens on | app.yaml (8080) |
