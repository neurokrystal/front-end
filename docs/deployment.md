# Deployment Guide: Dimensional System

This document provides comprehensive instructions for deploying the Dimensional System (API and Web) to DigitalOcean App Platform.

## 1. Overview
The Dimensional System is a monorepo containing:
- **API Service**: Fastify + Puppeteer (for PDF generation).
- **Web Service**: Next.js (frontend).
- **Database**: PostgreSQL.

Deployment is managed via the `app.yaml` DigitalOcean App Spec.

## 2. Prerequisites
- **DigitalOcean Account**: With access to App Platform and Managed Databases.
- **doctl CLI**: Installed and authenticated (`doctl auth init`).
- **GitHub**: Repository connected to your DigitalOcean account.
- **PNPM**: The project uses PNPM for package management.

## 3. Infrastructure Setup

### Managed Database
1. Create a **PostgreSQL** database (v16+) in DigitalOcean.
2. In the "Trusted Sources" section, ensure your App Platform app (once created) or your local IP (for migrations) is allowed.
3. Save the connection string (URI).

### Storage (Optional)
If using DigitalOcean Spaces for file storage:
1. Create a new Space and obtain the access key, secret, and endpoint.
2. Configure the `DO_SPACES_*` environment variables.

## 4. Environment Configuration
Update the environment variables in DigitalOcean App Platform. See `docs/environment-variables.md` for a complete list of required and optional variables.

**Critical Variables:**
- `POSTGRES_DB_URL`: Connection string to your managed database.
- `BETTER_AUTH_SECRET`: Random 32+ character string.
- `BETTER_AUTH_URL`: The public URL of your API (e.g., `https://api.yourdomain.com`).
- `CORS_ORIGIN`: The public URL of your Web app (e.g., `https://yourdomain.com`).

## 5. Deployment Process

### Step 1: Pre-deployment Validation
Before pushing changes, run the validation script to check TypeScript and build configurations:
```bash
./scripts/validate-do-deployment.sh
```

### Step 2: Database Migrations & Seeding
Migrations must be applied to the production database. You can run these from a local machine with access to the production DB:
```bash
export POSTGRES_DB_URL="your-production-db-url"
./scripts/deploy/migrate.sh
```
*Note: This script will automatically run initial seeds if the database is empty.*

### Step 3: Trigger Deployment
Deployment is configured in `app.yaml` to trigger on push to the `main` branch:
```bash
git push origin main
```

To deploy manually via `doctl`:
```bash
doctl apps create --spec app.yaml
# OR to update an existing app:
doctl apps update <APP_ID> --spec app.yaml
```

## 6. Verification
Once deployment is complete, verify the health of the system:
```bash
./scripts/deploy/smoke-test.sh https://your-api.ondigitalocean.app https://your-web.ondigitalocean.app
```
This script checks:
- API and Web health endpoints.
- PDF generation capability.
- Database connectivity.

## 7. Operational Notes
- **Instance Size**: The API service requires at least **2GB RAM** (`professional-s`) to run Puppeteer for PDF generation.
- **Scaling**: If PDF generation becomes slow or times out, consider upgrading the API service to `professional-m`.
- **Logs**: Access logs via the DigitalOcean dashboard or `doctl apps logs <APP_ID>`.
