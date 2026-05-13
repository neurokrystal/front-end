import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { AppContainer } from '@/container';

const containerPluginCallback: FastifyPluginCallback<{ container: AppContainer }> = (
  fastify: FastifyInstance,
  options,
  done
) => {
  fastify.decorate('container', options.container);
  done();
};

export const containerPlugin = fp(containerPluginCallback);
