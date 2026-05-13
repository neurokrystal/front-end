import { AppContainer } from '@/container';
import { AccessDecision } from '@/domains/sharing/access-evaluator.service';

declare module 'fastify' {
  interface FastifyInstance {
    container: AppContainer;
  }

  interface FastifyRequest {
    session: {
      user: any;
      session: any;
    } | null;
    accessDecision?: AccessDecision;
  }
}
