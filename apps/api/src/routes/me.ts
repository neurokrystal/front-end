import { FastifyInstance } from "fastify";
import { auth } from "../auth.js";

export async function meRoutes(fastify: FastifyInstance) {
  fastify.get("/api/me", async (request, reply) => {
    // Better Auth Fastify integration usually involves converting the request
    // or using a plugin. For now, we'll use the session verification from the auth object.
    const session = await auth.api.getSession({
        headers: new Headers(request.headers as Record<string, string>)
    });

    if (!session) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    return { user: session.user };
  });
}
