import { FastifyInstance } from 'fastify';
import { INotificationService } from './notification.types';
import { IEmailTemplateRepository } from './email-template.repository';
import { requirePlatformAdmin } from '@/infrastructure/auth/auth-middleware';

export default async function notificationRoutes(fastify: FastifyInstance) {
  const { notificationService, emailTemplateRepository } = fastify.container;

  fastify.addHook('preHandler', requirePlatformAdmin);

  fastify.get('/admin/email-templates', {
    handler: async (request, reply) => {
      const templates = await emailTemplateRepository.findAll();
      return templates;
    }
  });

  fastify.get('/admin/email-templates/:id', {
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const template = await emailTemplateRepository.findById(id);
      if (!template) return reply.status(404).send({ code: 'NOT_FOUND' });
      return template;
    }
  });

  fastify.patch('/admin/email-templates/:id', {
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      await emailTemplateRepository.update(id, {
        subject: body.subject,
        body_text: body.body_text,
        body_html: body.body_html,
      });
      return { success: true };
    }
  });

  fastify.post('/admin/email-templates/test', {
    handler: async (request, reply) => {
      const body = request.body as any;
      const { emailService } = fastify.container;
      
      // Send direct test email with provided content
      await emailService.sendEmail({
        to: body.to,
        subject: body.subject,
        text: body.body_text,
        html: body.body_html,
      });

      return { success: true };
    }
  });

  fastify.post('/admin/email-templates/:id/test', {
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      
      // Send test email with sample data
      await notificationService.notify({
        type: id as any,
        email: body.testEmail || request.session!.user.email,
        name: 'Test User',
        ...body.sampleData
      });

      return { success: true };
    }
  });
}
