# Dimensional Monorepo

A production-ready TypeScript monorepo for DigitalOcean App Platform.

## Structure

- `apps/web`: Next.js frontend (App Router, Tailwind CSS).
- `apps/api`: Fastify backend (Better Auth, PostgreSQL).
- `libs/shared`: Shared TypeScript types and utilities.

## Local Development

0. Prerequisites:
   - Node.js >= 22.0.0
   - pnpm >= 9.0.0
   - Docker (for local DO validation)

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

##### Automated Setup via App Spec (BEST METHOD)

The most reliable way to deploy this monorepo is to use the DigitalOcean **Spec Editor**. This ensures all services and environment variables are configured exactly as intended.

1.  Go to the [DigitalOcean Control Panel](https://cloud.digitalocean.com/apps).
2.  Click **Create** -> **Apps**.
3.  Choose **GitHub** and select the repository (`neurokrystal/front-end`).
4.  If DigitalOcean doesn't automatically detect the spec, or you want to be sure:
    - On the **Resources** page, scroll down and look for **"Edit App Spec"** or **"Bulk Editor"**.
    - Copy the contents of `app.yaml` (from the root of this repo) and paste it into the editor.
    - Click **Save**.
5.  On the **Environment Variables** page, you only need to fill in the **Secrets**:
    - `POSTGRES_DB_URL`: Your database connection string.
    - `BETTER_AUTH_SECRET`: A long random string for auth security.
    - `MAILGUN_API_KEY`: If using email services.
    - `DO_SPACES_KEY` / `SECRET`: If using object storage.

##### Manual Dashboard Configuration (Single App)

If you prefer to configure it manually, add two **Web Services** to a single App:

**1. Service: `web`**
- **Source Directory**: `/`
- **Build Command**: `pnpm --filter @dimensional/shared build && pnpm --filter web build`
- **Run Command**: `pnpm --filter web start`
- **HTTP Port**: `3000`
- **Routes**: Path `/`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `${APP_URL}/api` (Build-time) - Auto-infers the API location.
  - `NEXT_PUBLIC_APP_URL`: `${APP_URL}` (Build-time) - Auto-infers the App URL.

**2. Service: `api`**
- **Source Directory**: `/`
- **Build Command**: `pnpm --filter @dimensional/shared build && pnpm --filter api build`
- **Run Command**: `pnpm --filter api start`
- **HTTP Port**: `8080`
- **Routes**: Path `/api`
- **Environment Variables**:
  - `PORT`: `8080` (Run-time)
  - `POSTGRES_DB_URL`: (Secret, Run-time)
  - `BETTER_AUTH_URL`: `${APP_URL}/api` (Run-time) - Auto-inferred.
  - `CORS_ORIGIN`: `${APP_URL}` (Run-time) - Auto-inferred.

#### Separate App Deployment

If you prefer to run them as completely separate DigitalOcean Apps, use the specialized specs in the `.do/` directory:
- `.do/web.app.yaml` for the frontend.
- `.do/api.app.yaml` for the backend.

### Routing & Path Trimming

DigitalOcean App Platform handles routing to different services based on paths. In our configuration:
- `/` routes to the **Web** service (Next.js).
- `/api` routes to the **API** service (Fastify).

**Crucial Note on Path Trimming:**
DigitalOcean is configured to **trim** the `/api` prefix before sending the request to the Fastify service. 
- A request to `https://your-domain.com/api/health` arrives at Fastify as `GET /health`.
- A request to `https://your-domain.com/api/auth/signin` arrives at Fastify as `GET /auth/signin`.

Because of this, **Fastify routes must NOT include the `/api` prefix**. All API routes in this repository (e.g., `/me`, `/auth/*`, `/health`) are defined relative to the service root. This ensures they work both locally (on port 8080) and in production (behind the `/api` route).

### Troubleshooting Monorepo Build Issues

If you encounter errors like `sh: 1: tsc: not found` or similar during deployment:

- **Dependency Pruning**: We move `typescript` to `dependencies` (not `devDependencies`) in the affected packages. This ensures the tools remain available after the buildpack's pruning phase.
- **Build-Time Environment**: We set `NODE_ENV: development` during `BUILD_TIME` in the App Spec. This forces `pnpm` to install all tools, regardless of the production flag.
- **SKIP_NODE_PRUNE**: We use `SKIP_NODE_PRUNE: "true"` at build-time. This provides an additional hint to the buildpack to keep dependencies intact for our custom build commands.

1.  **Use the Spec Editor**: As mentioned above, pasting the `app.yaml` directly into the "Edit App Spec" window in the DigitalOcean UI is the only way to guarantee both `web` and `api` are added correctly.
2.  **Manual Start Command**: If you are configuring manually, ensure the **Run Command** is set:
    - Web: `pnpm --filter web start` (or `pnpm start:web`)
    - API: `pnpm --filter api start` (or `pnpm start:api`)
3.  **Source Directory**: Ensure **Source Directory** is set to `/` (the root) for BOTH services. This allows `pnpm` to find the workspace root and shared libraries.

**Important Monorepo Notes**:
- **Source Directory**: Must always be set to the repository root (`/`) for all components.
- **Build Command**: Use `pnpm --filter @dimensional/shared build && pnpm --filter <app> build` (ensures shared packages are built first and sequentially to save memory).
- **Internal Networking**: Services in the same app can talk to each other using their service name as the hostname (e.g., `http://api:8080`).

### Troubleshooting pnpm Builds

If your build fails with `[ERR_PNPM_IGNORED_BUILDS]`, it means a dependency (like `sharp` or `esbuild`) needs permission to run its build script. This is explicitly handled in the root `package.json` under the `pnpm.onlyBuiltDependencies` field.

If the build fails with `ERR_PNPM_OUTDATED_LOCKFILE`:
- This means your `pnpm-lock.yaml` is out of sync with your `package.json` files.
- Run `pnpm install` locally to update the lockfile and commit the changes.
- DigitalOcean (and most CI systems) use `--frozen-lockfile` by default to ensure reproducible builds.

If the build seems to hang during `pnpm install` or `pnpm build`:
- **Redundant Builds**: We have renamed the root `build` script to `build:all`. This prevents the DigitalOcean Node.js buildpack from automatically running a full monorepo build for every service, which previously caused memory exhaustion.
- **Concurrency**: We use `CHILD_CONCURRENCY: 1` and `--workspace-concurrency 1` to ensure builds and installs happen sequentially.
- **Node Memory Limits**: We have moved `NODE_OPTIONS: --max-old-space-size=400` to the **Run-time** scope, and added explicit `NODE_OPTIONS` for the **Build-time** scope (1024MB for `web`, 448MB for `api`) to ensure the build process has enough head-room without hitting container limits.
- **Dependency Pruning**: We use `SKIP_NODE_PRUNE: "true"` at build-time. This prevents DigitalOcean from removing `devDependencies` (like `typescript`) before the custom build command runs.
- **Memory Recommendation**: The `Basic-XXS` ($5.00/mo) instance is extremely tight for monorepo builds. **The `web` service is now configured to use `Basic-XS` ($10.00/mo) by default to ensure reliable builds.**
- If you must use 512MB, ensure you are using the optimized settings provided in this repo.

### Troubleshooting "Functions" Build Errors

If you see errors like `runtime type could not be determined` or `runtime 'typescript:default' is not supported` along with a reference to `project.yml`:

- **Cause**: DigitalOcean App Platform sometimes misinterprets monorepos as **Functions** (Serverless) projects, especially if they have a `packages/` directory.
- **Solution**: 
  1. We have renamed the `packages/` directory to `libs/` to bypass DigitalOcean's auto-detection for functions.
  2. If the DigitalOcean UI still auto-detects a "Function" component named something like `front-end2`: **Delete it**.
  3. Manually add your components as **Web Services**.
  4. Always ensure your components are configured as **Web Services** and the **Source Directory** is set to `/`.
  5. Use the "Resources" tab to ensure you have exactly two Web Services named `web` and `api`.

- **Note on doctl**: If you are using the DigitalOcean CLI, ensure you use `doctl app create --spec .do/app.yaml`. **Do NOT use** `doctl serverless deploy`, as this will attempt to deploy the monorepo as a collection of serverless functions.

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

## Local Testing (DigitalOcean Simulation)

To test the DigitalOcean build and run process locally without deploying to the cloud, you can use the DigitalOcean CLI (`doctl`). This uses Docker to simulate the App Platform environment.

### Prerequisites
- [DigitalOcean CLI (doctl)](https://docs.digitalocean.com/reference/doctl/how-to/install/) installed and authenticated.
- [Docker](https://www.docker.com/products/docker-desktop/) installed and running.

### Testing the Build Phase
To verify that the build commands in the App Spec are working correctly:
```bash
# Build a specific component (e.g., web)
doctl apps dev build web --spec app.yaml

# Build the api component
doctl apps dev build api --spec app.yaml
```

### Running the App Locally
To run the entire app (both services) as it would run on DigitalOcean:
```bash
doctl apps dev run --spec app.yaml
```
This will start both the `web` and `api` services, mapping the ports and routes as defined in the spec.

**Note**: Local simulation is useful for catching build-time errors (like missing dependencies, memory limits, or incorrect commands) before pushing to GitHub.

### Local Validation (Pre-push/CI)

We have provided a script to simulate the DigitalOcean build process locally. This is highly recommended before pushing changes to GitHub to catch build errors early.

1.  **Run the validation script**:
    ```bash
    ./scripts/validate-do-deployment.sh
    ```
    *Prerequisites: `doctl` and `Docker` must be installed and running.*

2.  **Hook into Git (Optional)**:
    You can add this to your `.git/hooks/pre-push` to ensure you never push a broken build:
    ```bash
    #!/bin/bash
    ./scripts/validate-do-deployment.sh
    ```

## Scripts

- `pnpm build`: Build all projects.
- `pnpm typecheck`: Run type checking across the monorepo.
- `pnpm lint`: Run linting across the monorepo.
- `pnpm --filter api auth:generate`: Generate Better Auth schema.
- `pnpm --filter api auth:migrate`: Run Better Auth migrations.
