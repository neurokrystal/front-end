import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { DomainError } from './domain-error';
import { ZodError } from 'zod';

const errorHandler: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
  fastify.setErrorHandler((error: Error, _request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.error(error);
    
    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    if (error instanceof ZodError || error.name === 'ZodError' || error.constructor.name === 'ZodError') {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: (error as any).errors || [],
      });
    }

    // Default error
    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  done();
};

export const errorHandlerPlugin = fp(errorHandler);
