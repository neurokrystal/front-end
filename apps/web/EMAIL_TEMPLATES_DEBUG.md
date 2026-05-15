### Email Templates — Debug Notes

- Network request from page `/admin/email-templates`:
  - Request: `GET /api/v1/admin/email-templates`
  - Expected status: `200 OK` with an array of templates. If not an admin, `401/403` is likely because routes are protected by `requirePlatformAdmin`.
  - How to verify:
    1. Open DevTools → Network.
    2. Reload the page.
    3. Select the `GET /api/v1/admin/email-templates` call and check Status and Response.

- Why this is the correct path:
  - `apps/api/src/index.ts` registers notification routes with a prefix:
    - `await server.register(notificationRoutes, { prefix: '/api/v1' });`
  - `apps/api/src/domains/notification/notification.routes.ts` defines endpoints like `fastify.get('/admin/email-templates', ...)`.
  - Combined, the full URL is: `/api/v1/admin/email-templates`.

- Table definition in use:
  - File: `apps/api/src/domains/notification/email-template.schema.ts`
  - Table: `email_templates`
  - Columns: `id (text, PK)`, `subject (text)`, `locale (text, default 'en')`, `body_text (text)`, `body_html (text)`, `created_at (timestamptz, default now)`, `updated_at (timestamptz, default now)`.

- Seed data (upsert-safe):
  - Script path: `apps/api/scripts/seed-templates.ts`
  - NPM script: `pnpm --filter api seed:email-templates`
  - Behavior: `INSERT ... ON CONFLICT (id) DO UPDATE` for 10+ templates; safe to re-run.

- Changes made to fix blank page:
  - `apps/web/src/app/admin/email-templates/page.tsx`
    - Added error handling: network errors now render a red alert with the error message.
    - Added empty state: when zero templates are returned, the page shows a friendly message with a Mail icon and instructions to seed data.
    - The fetch path remains `"/api/v1/admin/email-templates"` (correct for current API routing).

- If you want to quickly check DB state from the API project (requires `POSTGRES_DB_URL`):
  - List relevant tables:
    ```bash
    node -e "const { Pool } = require('pg'); const pool = new (require('pg').Pool)({ connectionString: process.env.POSTGRES_DB_URL }); pool.query('SELECT table_name FROM information_schema.tables WHERE table_name LIKE \'%email%\' OR table_name LIKE \'%template%\' ORDER BY table_name').then(r => console.log('Tables:', r.rows)).then(() => pool.end());"
    ```
  - Show sample templates:
    ```bash
    node -e "const { Pool } = require('pg'); const pool = new (require('pg').Pool)({ connectionString: process.env.POSTGRES_DB_URL }); pool.query('SELECT id, subject, updated_at FROM email_templates LIMIT 10').then(r => console.log('Templates:', r.rows)).catch(e => console.log('Error:', e.message)).then(() => pool.end());"
    ```

- Verification checklist after seeding and logging in as a Platform Admin:
  - `/admin/email-templates` shows all template cards (9+).
  - Each card displays: ID, Subject, Last updated.
  - Clicking "Edit Template" navigates to `/admin/email-templates/[id]` and loads subject/body_text/body_html.
  - If API fails (e.g., unauthorized), an error message is shown (not a blank page).
  - If table is empty, a clear empty state is shown (not a blank page).
