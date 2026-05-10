import { FastifyInstance } from "fastify";
import { SHARED_CONSTANT } from "@dimensional/shared";

export async function helloRoutes(fastify: FastifyInstance) {
  fastify.get("/hello", async () => {
    return { message: "Hello from Fastify!", shared: SHARED_CONSTANT };
  });
}
