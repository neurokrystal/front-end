import { sql } from 'drizzle-orm';
import { db } from '../connection';

const templates = [
  {
    id: 'user_registered',
    subject: 'Welcome to The Dimensional System',
    body_text: `Hi {{name}},

Welcome to The Dimensional System. Your account has been created and you're ready to begin your journey of psychological self-understanding.

The Dimensional System measures your psychological architecture across three core domains — Safety, Challenge, and Play — giving you a detailed picture of how you experience and express yourself across each.

When you're ready, log in and take your first assessment. It takes approximately 15 minutes and there are no right or wrong answers — just honest ones.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Welcome, {{name}}</h2>
  <p style="color: #475569; line-height: 1.6;">Your account has been created and you're ready to begin your journey of psychological self-understanding.</p>
  <p style="color: #475569; line-height: 1.6;">The Dimensional System measures your psychological architecture across three core domains — <strong style="color: #4A90D9;">Safety</strong>, <strong style="color: #F5A623;">Challenge</strong>, and <strong style="color: #7ED321;">Play</strong> — giving you a detailed picture of how you experience and express yourself across each.</p>
  <p style="color: #475569; line-height: 1.6;">When you're ready, take your first assessment. It takes approximately 15 minutes and there are no right or wrong answers — just honest ones.</p>
  <a href="{{loginUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Log In & Get Started</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'assessment_completed',
    subject: 'Your assessment is complete — your report is being prepared',
    body_text: `Hi {{name}},

You've completed your {{instrumentName}} assessment. Thank you for taking the time to respond thoughtfully.

Your responses are now being scored and your personalised report is being generated. This usually takes just a few moments.

You'll receive another email when your report is ready to view, or you can check your dashboard at any time.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Assessment Complete</h2>
  <p style="color: #475569; line-height: 1.6;">Hi {{name}}, you've completed your <strong>{{instrumentName}}</strong> assessment. Thank you for taking the time to respond thoughtfully.</p>
  <p style="color: #475569; line-height: 1.6;">Your responses are now being scored and your personalised report is being generated. This usually takes just a few moments.</p>
  <p style="color: #475569; line-height: 1.6;">You'll receive another email when your report is ready, or you can check your dashboard at any time.</p>
  <a href="{{dashboardUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Go to Dashboard</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'report_ready',
    subject: 'Your {{reportType}} report is ready to view',
    body_text: `Hi {{name}},

Your {{reportType}} report has been generated and is ready to view. This report provides a personalised analysis of your psychological architecture based on your assessment responses.

You can view it in your browser or download it as a PDF.

Take your time reading through it. There's no rush — the insights will be there whenever you're ready for them.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Your Report is Ready</h2>
  <p style="color: #475569; line-height: 1.6;">Hi {{name}}, your <strong>{{reportType}}</strong> report has been generated and is ready to view.</p>
  <p style="color: #475569; line-height: 1.6;">This report provides a personalised analysis of your psychological architecture based on your assessment responses. You can view it in your browser or download it as a PDF.</p>
  <p style="color: #475569; line-height: 1.6;">Take your time reading through it. There's no rush — the insights will be there whenever you're ready for them.</p>
  <a href="{{reportUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Your Report</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'share_granted',
    subject: 'Someone has shared their Dimensional profile with you',
    body_text: `Hi {{recipientName}},

{{subjectName}} has shared their Dimensional System report with you. This means they've chosen to let you see part of their psychological profile — a meaningful gesture of trust and openness.

You can view the shared report by logging into your account.

If you don't have an account yet, you can create one using this email address to access what's been shared with you.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">A Report Has Been Shared With You</h2>
  <p style="color: #475569; line-height: 1.6;"><strong>{{subjectName}}</strong> has shared their Dimensional System report with you. This means they've chosen to let you see part of their psychological profile — a meaningful gesture of trust and openness.</p>
  <p style="color: #475569; line-height: 1.6;">You can view the shared report by logging into your account.</p>
  <a href="{{loginUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Shared Report</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you don't have an account yet, you can create one using this email address to access what's been shared with you.</p>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'share_revoked',
    subject: 'A previously shared report is no longer available',
    body_text: `Hi there,

A report that was previously shared with you on The Dimensional System is no longer accessible. The person who shared it has chosen to revoke access.

This is a normal part of how the platform works — individuals always retain full control over who can see their data.

If you have any questions, please don't hesitate to reach out.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Shared Report Access Removed</h2>
  <p style="color: #475569; line-height: 1.6;">A report that was previously shared with you is no longer accessible. The person who shared it has chosen to revoke access.</p>
  <p style="color: #475569; line-height: 1.6;">This is a normal part of how the platform works — individuals always retain full control over who can see their data.</p>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'seat_invitation',
    subject: '{{orgName}} has given you access to The Dimensional System',
    body_text: `Hi {{recipientName}},

{{inviterName}} from {{orgName}} has given you access to The Dimensional System as part of their organisation's investment in personal development.

The Dimensional System is a psychological profiling tool that measures your architecture across Safety, Challenge, and Play. Your results are yours — they are private by default and only shared with others if you actively choose to share them.

Click below to create your account and get started.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">You're Invited</h2>
  <p style="color: #475569; line-height: 1.6;"><strong>{{inviterName}}</strong> from <strong>{{orgName}}</strong> has given you access to The Dimensional System as part of their organisation's investment in personal development.</p>
  <p style="color: #475569; line-height: 1.6;">The Dimensional System measures your psychological architecture across <strong style="color: #4A90D9;">Safety</strong>, <strong style="color: #F5A623;">Challenge</strong>, and <strong style="color: #7ED321;">Play</strong>. Your results are yours — they are <strong>private by default</strong> and only shared with others if you actively choose to share them.</p>
  <a href="{{signupUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Create Your Account</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'purchase_completed',
    subject: 'Purchase confirmation — {{productName}}',
    body_text: `Hi {{name}},

Thank you for your purchase.

Product: {{productName}}
Amount: {{amount}}
Date: {{date}}

You can access your purchase from your dashboard.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Purchase Confirmed</h2>
  <p style="color: #475569; line-height: 1.6;">Thank you for your purchase.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 4px 0; color: #475569;"><strong>Product:</strong> {{productName}}</p>
    <p style="margin: 4px 0; color: #475569;"><strong>Amount:</strong> {{amount}}</p>
    <p style="margin: 4px 0; color: #475569;"><strong>Date:</strong> {{date}}</p>
  </div>
  <a href="{{dashboardUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Go to Dashboard</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'cert_expiry_warning',
    subject: 'Your Dimensional System certification expires in {{daysRemaining}} days',
    body_text: `Hi {{name}},

Your Dimensional System practitioner certification is due to expire on {{expiresAt}}.

Once your certification lapses, your access to client data will be suspended and your clients will be notified. To maintain uninterrupted access, please renew before the expiry date.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Certification Expiring Soon</h2>
  <p style="color: #475569; line-height: 1.6;">Hi {{name}}, your practitioner certification is due to expire on <strong>{{expiresAt}}</strong> — that's {{daysRemaining}} days from now.</p>
  <p style="color: #475569; line-height: 1.6;">Once your certification lapses, your access to client data will be suspended and your clients will be notified. To maintain uninterrupted access, please renew before the expiry date.</p>
  <a href="{{renewUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Renew Certification</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'deletion_requested',
    subject: 'Your data deletion request has been received',
    body_text: `Hi {{name}},

We've received your request to delete your data from The Dimensional System. Your deletion is scheduled for {{scheduledFor}}.

Until that date, you can cancel this request at any time from your account settings. After the scheduled date, your data will be permanently and irreversibly deleted.

What will be deleted: your profile, assessment responses, scored profiles, all reports, all shares, and all related data.

What will be preserved: anonymised audit logs (required for compliance). These contain no personally identifiable information.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Deletion Request Received</h2>
  <p style="color: #475569; line-height: 1.6;">We've received your request to delete your data. Your deletion is scheduled for <strong>{{scheduledFor}}</strong>.</p>
  <p style="color: #475569; line-height: 1.6;">Until that date, you can cancel this request from your account settings. After the scheduled date, your data will be <strong>permanently and irreversibly deleted</strong>.</p>
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px; color: #991b1b; font-weight: 600; font-size: 14px;">What will be deleted:</p>
    <p style="margin: 0; color: #7f1d1d; font-size: 13px;">Your profile, assessment responses, scored profiles, all reports, all shares, and all related data.</p>
  </div>
  <a href="{{settingsUrl}}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Manage in Settings</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'deletion_completed',
    subject: 'Your data has been permanently deleted',
    body_text: `Your data has been permanently deleted from The Dimensional System.

All personal information, assessment responses, scored profiles, reports, and shares have been removed. Anonymised audit records have been retained for compliance purposes — these contain no personally identifiable information.

This action is irreversible. If you wish to use The Dimensional System in the future, you will need to create a new account.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Data Deleted</h2>
  <p style="color: #475569; line-height: 1.6;">Your data has been permanently deleted from The Dimensional System.</p>
  <p style="color: #475569; line-height: 1.6;">All personal information, assessment responses, scored profiles, reports, and shares have been removed. Anonymised audit records have been retained for compliance — these contain no personally identifiable information.</p>
  <p style="color: #475569; line-height: 1.6;">This action is irreversible. If you wish to use the platform in the future, you will need to create a new account.</p>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
  {
    id: 'programme_enrolled',
    subject: "You've been enrolled in {{programmeName}}",
    body_text: `Hi {{name}},

You've been enrolled in the {{programmeName}} development programme on The Dimensional System.

This programme is designed to support your growth in a structured, evidence-based way. You'll work through modules at your own pace, with reflection prompts and progress tracking along the way.

Log in to get started whenever you're ready.

Best,
The Dimensional System Team`,
    body_html: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Programme Enrolment</h2>
  <p style="color: #475569; line-height: 1.6;">Hi {{name}}, you've been enrolled in <strong>{{programmeName}}</strong>.</p>
  <p style="color: #475569; line-height: 1.6;">This programme is designed to support your growth in a structured, evidence-based way. You'll work through modules at your own pace, with reflection prompts and progress tracking along the way.</p>
  <a href="{{programmeUrl}}" style="display: inline-block; background: #4A90D9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Start the Programme</a>
  <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">— The Dimensional System Team</p>
</div>`,
  },
];

async function seedEmailTemplates() {
  console.log('Seeding email templates...');
  
  for (const t of templates) {
    await db.execute(sql`
      INSERT INTO email_templates (id, subject, body_text, body_html, updated_at)
      VALUES (${t.id}, ${t.subject}, ${t.body_text}, ${t.body_html}, NOW())
      ON CONFLICT (id) DO UPDATE SET 
        subject = EXCLUDED.subject,
        body_text = EXCLUDED.body_text,
        body_html = EXCLUDED.body_html,
        updated_at = NOW()
    `);
    console.log(`  ✓ ${t.id}`);
  }
  
  console.log(`\nSeeded ${templates.length} email templates.`);
}

seedEmailTemplates().then(() => process.exit(0)).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
