import { apiEnvSchema } from '@dimensional/shared';
import dotenv from 'dotenv';

dotenv.config();

export const env = apiEnvSchema.parse(process.env);
