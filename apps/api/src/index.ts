import fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env } from "./config.js";
import { auth } from "./auth.js";
import { healthRoutes } from "./routes/health.js";
import { helloRoutes } from "./routes/hello.js";
import { meRoutes } from "./routes/me.js";
import { adminRoutes } from "./routes/admin.js";
import { initDb } from "./lib/db.js";

const server = fastify({
  logger: true,
});

await server.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await server.register(multipart);

// Better Auth handler
server.all("/api/auth/*", async (request, reply) => {
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
  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });
  
  // Forward body
  const body = await response.arrayBuffer();
  return reply.send(Buffer.from(body));
});

// Register routes
await server.register(healthRoutes);
await server.register(helloRoutes);
await server.register(meRoutes);
await server.register(adminRoutes);

const start = async () => {
  try {
    await initDb();
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
