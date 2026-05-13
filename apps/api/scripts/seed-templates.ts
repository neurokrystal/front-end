import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const templates = [
    {
      id: 'user_registered',
      subject: 'Welcome to The Dimensional System',
      body_text: 'Hello {{name}}, welcome to The Dimensional System!',
      body_html: '<h1>Hello {{name}}</h1><p>Welcome to The Dimensional System!</p>'
    },
    {
      id: 'assessment_completed',
      subject: 'Your assessment is complete',
      body_text: 'Hello {{name}}, your {{instrumentName}} assessment is complete.',
      body_html: '<h1>Hello {{name}}</h1><p>Your {{instrumentName}} assessment is complete.</p>'
    },
    {
      id: 'report_ready',
      subject: 'Your report is ready to view',
      body_text: 'Hello {{name}}, your {{reportType}} report is ready to view at {{reportUrl}}.',
      body_html: '<h1>Hello {{name}}</h1><p>Your {{reportType}} report is ready to view.</p><p><a href="{{reportUrl}}">View Report</a></p>'
    },
    {
      id: 'share_granted',
      subject: 'Someone shared their report with you',
      body_text: 'Hello {{name}}, {{subjectName}} has shared their {{resourceTypes}} with you.',
      body_html: '<h1>Hello {{name}}</h1><p>{{subjectName}} has shared their {{resourceTypes}} with you.</p>'
    },
    {
      id: 'share_revoked',
      subject: 'A shared report is no longer available',
      body_text: 'Hello {{name}}, a shared report from {{subjectDisplayName}} is no longer available.',
      body_html: '<h1>Hello {{name}}</h1><p>A shared report from {{subjectDisplayName}} is no longer available.</p>'
    },
    {
      id: 'seat_invitation',
      subject: "You've been invited to The Dimensional System",
      body_text: "Hello, you've been invited by {{inviterName}} to join {{orgName}}. Sign up here: {{signupUrl}}",
      body_html: "<h1>Hello</h1><p>You've been invited by {{inviterName}} to join {{orgName}}.</p><p><a href=\"{{signupUrl}}\">Sign Up</a></p>"
    },
    {
      id: 'purchase_completed',
      subject: 'Purchase confirmation',
      body_text: 'Hello {{name}}, your purchase of {{productName}} for {{amount}} on {{date}} was successful.',
      body_html: '<h1>Purchase Confirmation</h1><p>Hello {{name}}, your purchase of {{productName}} for {{amount}} on {{date}} was successful.</p>'
    },
    {
      id: 'cert_expiry_warning',
      subject: 'Your certification expires soon',
      body_text: 'Hello {{name}}, your certification expires in {{daysRemaining}} days on {{expiresAt}}. Renew here: {{renewUrl}}',
      body_html: '<h1>Certification Warning</h1><p>Hello {{name}}, your certification expires in {{daysRemaining}} days on {{expiresAt}}.</p><p><a href=\"{{renewUrl}}\">Renew Now</a></p>'
    },
    {
      id: 'cert_lapsed',
      subject: 'Your certification has lapsed',
      body_text: 'Hello {{coachName}}, your certification has lapsed. You have {{clientCount}} clients affected.',
      body_html: '<h1>Certification Lapsed</h1><p>Hello {{coachName}}, your certification has lapsed. You have {{clientCount}} clients affected.</p>'
    },
    {
      id: 'deletion_requested',
      subject: 'Data deletion request received',
      body_text: 'Hello {{name}}, your data deletion is scheduled for {{scheduledFor}}. Cancel here: {{cancelUrl}}',
      body_html: '<h1>Deletion Requested</h1><p>Hello {{name}}, your data deletion is scheduled for {{scheduledFor}}.</p><p><a href=\"{{cancelUrl}}\">Cancel Request</a></p>'
    },
    {
      id: 'deletion_completed',
      subject: 'Your data has been deleted',
      body_text: 'Your data has been deleted from The Dimensional System as requested.',
      body_html: '<h1>Data Deleted</h1><p>Your data has been deleted from The Dimensional System as requested.</p>'
    },
    {
      id: 'programme_enrolled',
      subject: "You've been enrolled in a programme",
      body_text: 'Hello {{name}}, you have been enrolled in {{programmeName}} starting on {{startDate}}.',
      body_html: '<h1>Programme Enrollment</h1><p>Hello {{name}}, you have been enrolled in {{programmeName}} starting on {{startDate}}.</p>'
    },
    {
      id: 'programme_completed',
      subject: "You've completed a programme",
      body_text: 'Hello {{name}}, congratulations on completing {{programmeName}}!',
      body_html: '<h1>Programme Completed</h1><p>Hello {{name}}, congratulations on completing {{programmeName}}!</p>'
    }
  ];

  const client = await pool.connect();
  try {
    for (const template of templates) {
      await client.query(`
        INSERT INTO email_templates (id, subject, body_text, body_html, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          subject = EXCLUDED.subject,
          body_text = EXCLUDED.body_text,
          body_html = EXCLUDED.body_html,
          updated_at = NOW()
      `, [template.id, template.subject, template.body_text, template.body_html]);
    }
    console.log('✅ Email templates seeded');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
