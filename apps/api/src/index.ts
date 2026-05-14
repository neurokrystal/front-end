import fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { env } from "@/infrastructure/config";
import { auth } from "@/infrastructure/auth/better-auth";
import { createContainer } from "./container";
import { containerPlugin } from "./shared/plugins/container.plugin";
import { errorHandlerPlugin } from "./shared/errors/error-handler";
import { securityHeaders } from "./infrastructure/security/headers";

const server = fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

// Guarded compilers to avoid zod cross-instance/runtime crashes when no schema is provided
// or when non-Zod schemas are passed. This ensures routes without schemas (or with manual
// validation) do not trigger validator/serializer failures.
server.setValidatorCompiler(({ schema }) => {
  const anySchema = schema as any;
  // If no schema or not a Zod schema, accept the input as-is
  if (!anySchema || typeof anySchema.safeParse !== "function") {
    return (data: any) => ({ value: data });
  }
  // Zod-backed validation using safeParse
  return (data: any) => {
    const result = anySchema.safeParse(data);
    if (result.success) return { value: result.data } as any;
    return { error: result.error } as any;
  };
});

server.setSerializerCompiler(() => {
  // Simple JSON stringify serializer that works regardless of schema type
  return (data: any) => JSON.stringify(data);
});

const container = createContainer();

await server.register(containerPlugin, { container });
await server.register(errorHandlerPlugin);
await server.register(securityHeaders);

// Disable global rate limiting in non-production to avoid hindering local/dev work.
if (env.NODE_ENV === 'production') {
  await server.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });
}

await server.register(cors, {
  origin: env.NODE_ENV === 'production' ? env.CORS_ORIGIN.split(',') : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await server.register(multipart);

// Auth & Rate Limiting scope
server.register(async (authApp) => {
  // Remove aggressive per-auth rate limit. Rely on global (production-only) limiter above
  // or add fine-grained limits per-route if needed in the future.

  // Better Auth handler
  authApp.all("/auth/*", async (request, reply) => {
    return handleAuth(request, reply);
  });

  // Support /api/auth/* for local development where /api prefix isn't trimmed
  authApp.all("/api/auth/*", async (request, reply) => {
    return handleAuth(request, reply);
  });

  async function handleAuth(request: any, reply: any) {
    const protocol = request.protocol;
    const host = request.headers.host || request.hostname;
    const url = `${protocol}://${host}${request.url}`;

    const response = await auth.handler(
      new Request(url, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body: request.method !== "GET" && request.method !== "HEAD" ? JSON.stringify(request.body) : undefined,
      })
    );
    
    // Forward status
    reply.status(response.status);
    
    // Forward headers
    response.headers.forEach((value: string, key: string) => {
      reply.header(key, value);
    });
    
    // Forward body
    const body = await response.arrayBuffer();
    return reply.send(Buffer.from(body));
  }
});

import userRoutes from './domains/user/user.routes';
import organizationRoutes from './domains/organization/organization.routes';
import instrumentRoutes from './domains/instrument/instrument.routes';
import runRoutes from './domains/instrument/features/run/run.routes';
import reportRoutes from './domains/report/report.routes';
import templateRoutes from './domains/report/features/template/template.routes';
import cmsRoutes from './domains/report/features/cms/cms.routes';
import sharingRoutes from './domains/sharing/sharing.routes';
import notificationRoutes from './domains/notification/notification.routes';
import billingRoutes from './domains/billing/billing.routes';
import commercialRoutes from './domains/commercial/commercial.routes';
import programmeRoutes from './domains/programme/programme.routes';
import auditRoutes from './domains/audit/audit.routes';
import adminRoutes from './domains/admin/admin.routes';
import healthRoutes from './domains/health/health.routes';

// ... existing code ...

// Register domain routes
await server.register(userRoutes, { prefix: '/api/v1/users' });
await server.register(organizationRoutes, { prefix: '/api/v1/organizations' });
await server.register(instrumentRoutes, { prefix: '/api/v1/instruments' });
await server.register(runRoutes, { prefix: '/api/v1' });
await server.register(reportRoutes, { prefix: '/api/v1/reports' });
await server.register(templateRoutes, { prefix: '/api/v1/admin/templates' });
await server.register(cmsRoutes, { prefix: '/api/v1/admin/cms' });
await server.register(sharingRoutes, { prefix: '/api/v1/sharing' });
await server.register(notificationRoutes, { prefix: '/api/v1' });
await server.register(billingRoutes, { prefix: '/api/v1/billing' });
await server.register(commercialRoutes, { prefix: '/api/v1/commercial' });
await server.register(programmeRoutes, { prefix: '/api/v1/programmes' });
await server.register(auditRoutes, { prefix: '/api/v1/admin/audit' });
await server.register(adminRoutes, { prefix: '/api/v1/admin' });
await server.register(healthRoutes);

const start = async () => {
  try {
    await server.listen({ 
        port: env.PORT, 
        host: "0.0.0.0" 
    });
    console.log(`Server listening on 0.0.0.0:${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
