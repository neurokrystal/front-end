import pg from "pg";
import { env } from "../config.js";

const { Pool } = pg;

let connectionString = env.POSTGRES_DB_URL;

// Handle the new pg/Node 24 SSL defaults
if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat")) {
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString += `${separator}uselibpqcompat=true`;
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require") || env.NODE_ENV === "production" || env.APP_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDb = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      body_html TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      url TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      folder TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default password reset template if it doesn't exist
  const resetTemplate = await query("SELECT id FROM email_templates WHERE id = 'password-reset'");
  if (resetTemplate.rowCount === 0) {
    await query(`
      INSERT INTO email_templates (id, subject, body_text, body_html)
      VALUES (
        'password-reset',
        'Reset your password',
        'Click the link to reset your password: {{url}}',
        '<p>Click the link to reset your password: <a href="{{url}}">{{url}}</a></p>'
      )
    `);
  }
};
