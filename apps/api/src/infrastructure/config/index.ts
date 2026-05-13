import { apiEnvSchema, PLATFORM_CONSTANTS } from '@dimensional/shared';
import dotenv from 'dotenv';

dotenv.config();

export const env = apiEnvSchema.parse(process.env);

export { PLATFORM_CONSTANTS };
