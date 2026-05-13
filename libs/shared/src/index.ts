export * from './config';
export * from './enums';
export * from './dto';
export * from './scoring-config.schema';
export * from './report-template.schema';

export const SHARED_CONSTANT = "Hello from shared package";

export function formatGreeting(name: string): string {
  return `Hello, ${name}!`;
}
