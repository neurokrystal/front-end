import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { emailTemplates } from './notification.schema';

describe('Category 10: Notification System', () => {
  const container = getTestContainer();
  const { notificationService, emailService } = container;

  beforeEach(async () => {
    await cleanTestData();
    
    // Seed templates
    await db.insert(emailTemplates).values([
      {
        id: 'assessment_completed',
        subject: 'Assessment Complete',
        body_text: 'Hi {{name}}, you finished!',
        body_html: '<p>Hi {{name}}, you finished!</p>',
      },
      {
        id: 'report_ready',
        subject: 'Report Ready',
        body_text: 'View here: {{report_url}}',
        body_html: '<p>View here: {{report_url}}</p>',
      }
    ]);
  });

  describe('Event Processing', () => {
    it('10.1 assessment_completed event → correct email template resolved', async () => {
      const user = await createTestUser({ name: 'Alice' });
      const spy = vi.spyOn(emailService, 'sendEmail');
      
      await notificationService.notify({ type: 'assessment_completed', userId: user.id, metadata: { name: 'Alice' } });
      
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        to: user.email,
        subject: 'Assessment Complete',
        html: expect.stringContaining('Hi Alice, you finished!'),
      }));
    });

    it('10.2 report_ready event → correct template with report URL', async () => {
      const user = await createTestUser();
      const spy = vi.spyOn(emailService, 'sendEmail');
      
      await notificationService.notify({ type: 'report_ready', userId: user.id, reportId: '123', reportType: 'base', metadata: { report_url: 'http://app.com/r/123' } });
      
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('http://app.com/r/123'),
      }));
    });

    it('10.9 Variable resolution: {{name}} in template → replaced with actual name', async () => {
        const user = await createTestUser({ name: 'Bob' });
        const spy = vi.spyOn(emailService, 'sendEmail');
        
        await notificationService.notify({ type: 'assessment_completed', userId: user.id, metadata: { name: 'Bob' } });
        
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
          html: expect.stringContaining('Hi Bob'),
        }));
    });

    it('10.8 Email template not found → handled gracefully', async () => {
        const user = await createTestUser();
        // Should not throw
        await expect(notificationService.notify({ type: 'unknown_event' as any, userId: user.id })).resolves.not.toThrow();
    });
  });
});
