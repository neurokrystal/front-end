# Dimensional Monorepo

A production-ready TypeScript monorepo for DigitalOcean App Platform.

## Structure

- `apps/web`: Next.js frontend (App Router, Tailwind CSS).
- `apps/api`: Fastify backend (Better Auth, PostgreSQL).
- `packages/shared`: Shared TypeScript types and utilities.

## Local Development

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   - Copy `apps/api/.env.example` to `apps/api/.env` and fill in the values.
   - Copy `apps/web/.env.example` to `apps/web/.env` and fill in the values.

3. Generate Better Auth schema:
   ```bash
   pnpm --filter api auth:generate
   ```

4. Run migrations:
   ```bash
   pnpm --filter api auth:migrate
   ```

5. Start development servers:
   ```bash
   pnpm dev
   ```
   - Web: http://localhost:3000
   - API: http://localhost:8080

## Deployment (DigitalOcean App Platform)

### Database
Ensure you have a DigitalOcean Managed PostgreSQL cluster. Create two databases: `app_test` and `app_prod`.

### DigitalOcean App Platform Deployment

This monorepo is designed to run both applications (Frontend and API) within a single DigitalOcean App. This allows them to share the same domain and communicate "locally" through DigitalOcean's internal network and path-based routing.

#### Combined Deployment (Recommended)

In this setup:
- **Web (Next.js)**: Served at `/` (the root).
- **API (Fastify)**: Served at `/api`.
- **Automatic Configuration**: Most URLs are automatically inferred using DigitalOcean's `${APP_URL}` variable.

##### Automated Setup via App Spec

1.  Go to the [DigitalOcean Control Panel](https://cloud.digitalocean.com/apps).
2.  Click **Create** -> **Apps**.
3.  Choose **GitHub** and select the repository (`neurokrystal/front-end`).
4.  DigitalOcean will automatically detect `.do/app.yaml`.
5.  On the **Resources** page, ensure both the `web` and `api` services are listed.
6.  On the **Environment Variables** page, you only need to fill in the **Secrets**:
    - `POSTGRES_DB_URL`: Your database connection string.
    - `BETTER_AUTH_SECRET`: A long random string for auth security.
    - `MAILGUN_API_KEY`: If using email services.
    - `DO_SPACES_KEY` / `SECRET`: If using object storage.

##### Manual Dashboard Configuration (Single App)

If you prefer to configure it manually, add two **Web Services** to a single App:

**1. Service: `web`**
- **Source Directory**: `/`
- **Build Command**: `pnpm --filter web... build`
- **Run Command**: `pnpm --filter web start`
- **HTTP Port**: `3000`
- **Routes**: Path `/`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `${APP_URL}/api` (Build-time) - Auto-infers the API location.
  - `NEXT_PUBLIC_APP_URL`: `${APP_URL}` (Build-time) - Auto-infers the App URL.

**2. Service: `api`**
- **Source Directory**: `/`
- **Build Command**: `pnpm --filter api... build`
- **Run Command**: `pnpm --filter api start`
- **HTTP Port**: `8080`
- **Routes**: Path `/api`
- **Environment Variables**:
  - `PORT`: `8080` (Run-time)
  - `POSTGRES_DB_URL`: (Secret, Run-time)
  - `BETTER_AUTH_URL`: `${APP_URL}/api` (Run-time) - Auto-inferred.
  - `CORS_ORIGIN`: `${APP_URL}` (Run-time) - Auto-inferred.

#### Separate App Deployment

If you prefer to run them as completely separate DigitalOcean Apps, use the specialized specs:
- `.do/web.app.yaml` for the frontend.
- `.do/api.app.yaml` for the backend.

**Important Monorepo Notes**:
- **Source Directory**: Must always be set to the repository root (`/`) for all components.
- **Build Command**: Use `pnpm --filter <app>... --workspace-concurrency 1 build` (ensures shared packages are built first and sequentially to save memory).
- **Internal Networking**: Services in the same app can talk to each other using their service name as the hostname (e.g., `http://api:8080`).

### Troubleshooting pnpm Builds

If your build fails with `[ERR_PNPM_IGNORED_BUILDS]`, it means a dependency (like `sharp` or `esbuild`) needs permission to run its build script. This is explicitly handled in the root `package.json` under the `pnpm.onlyBuiltDependencies` field.

If the build fails with `ERR_PNPM_OUTDATED_LOCKFILE`:
- This means your `pnpm-lock.yaml` is out of sync with your `package.json` files.
- Run `pnpm install` locally to update the lockfile and commit the changes.
- DigitalOcean (and most CI systems) use `--frozen-lockfile` by default to ensure reproducible builds.

If the build seems to hang during `pnpm install` or `pnpm build`:
- **Concurrency**: We have set `--workspace-concurrency 1` in the root `package.json` and App Specs to build packages one-by-one, which significantly reduces peak memory usage.
- **Node Memory Limits**: We have added `NODE_OPTIONS: --max-old-space-size=400` to the App Specs. This tells Node.js to be more aggressive with garbage collection on small instances.
- **Update Notifier**: We have disabled the pnpm update notifier and other resource-heavy CI features via `.npmrc` and environment variables.
- **Memory Check**: DigitalOcean's `Basic-XXS` ($5.00/mo) instance has only 512MB RAM. This is extremely tight for monorepo builds. **We strongly recommend upgrading to `Basic-XS` ($10.00/mo) which provides 1GB RAM.**
- If you must use 512MB, ensure you are using the optimized settings provided in this repo.

## Custom Domains & HTTPS

DigitalOcean App Platform provides **automatic HTTPS** (SSL/TLS) for all applications, including those using custom domains.

1.  **Default Domain**: Every app gets a `*.ondigitalocean.app` domain with HTTPS enabled by default.
2.  **Custom Domains/Subdomains**:
    - Go to your App in the DigitalOcean Control Panel.
    - Click on the **Settings** tab.
    - Find the **Domains** section and click **Edit**.
    - Click **Add Domain**.
    - Enter your domain or subdomain (e.g., `app.yourdomain.com`).
    - Follow the instructions to update your DNS (usually adding a CNAME record).
    - DigitalOcean will automatically provision a Let's Encrypt SSL certificate once the DNS propagates.

**Note**: You do *not* need to set up a separate Load Balancer or CDN for HTTPS; it is a native feature of the App Platform.

## Scripts

- `pnpm build`: Build all projects.
- `pnpm typecheck`: Run type checking across the monorepo.
- `pnpm lint`: Run linting across the monorepo.
- `pnpm --filter api auth:generate`: Generate Better Auth schema.
- `pnpm --filter api auth:migrate`: Run Better Auth migrations.
