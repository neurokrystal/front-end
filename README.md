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

### App Platform Component Settings

#### Test Environment
- **Web Service (`apps/web`)**:
  - Build Command: `pnpm install --frozen-lockfile && pnpm --filter web build`
  - Run Command: `pnpm --filter web start`
  - HTTP Port: `3000`
- **API Service (`apps/api`)**:
  - Build Command: `pnpm install --frozen-lockfile && pnpm --filter api build`
  - Run Command: `pnpm --filter api start`
  - HTTP Port: `8080`

#### Production Environment
- **Web Service (`apps/web`)**:
  - Build Command: `pnpm install --frozen-lockfile && pnpm --filter web build`
  - Run Command: `pnpm --filter web start`
  - HTTP Port: `3000`
- **API Service (`apps/api`)**:
  - Build Command: `pnpm install --frozen-lockfile && pnpm --filter api build`
  - Run Command: `pnpm --filter api start`
  - HTTP Port: `8080`

## Scripts

- `pnpm build`: Build all projects.
- `pnpm typecheck`: Run type checking across the monorepo.
- `pnpm lint`: Run linting across the monorepo.
- `pnpm --filter api auth:generate`: Generate Better Auth schema.
- `pnpm --filter api auth:migrate`: Run Better Auth migrations.
