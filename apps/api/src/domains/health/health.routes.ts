// apps/api/src/domains/health/health.routes.ts
import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', { schema: { hide: true } }, async (request, reply) => {
    // Check database connectivity
    try {
      await request.server.container.db.execute('SELECT 1');
    } catch (err) {
      return reply.status(503).send({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: process.env.COMMIT_SHA || 'unknown',
    };
  });

  // Puppeteer-specific health check
  fastify.get('/health/pdf', { schema: { hide: true } }, async (request, reply) => {
    try {
      const pdfGenerator = request.server.container.pdfGenerator;
      const testHtml = '<html><body><h1>Health Check</h1></body></html>';
      const buffer = await pdfGenerator.generateFromHtml(testHtml, {
        pageWidth: 210,
        pageHeight: 297,
        printBackground: false,
        displayHeaderFooter: false,
      });

      if (buffer.length === 0) {
        return reply.status(503).send({
          status: 'unhealthy',
          pdf: 'empty buffer',
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: 'healthy',
        pdf: 'operational',
        bufferSize: buffer.length,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return reply.status(503).send({
        status: 'unhealthy',
        pdf: 'failed',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
