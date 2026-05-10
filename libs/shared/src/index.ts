export * from './config.js';

export const SHARED_CONSTANT = "Hello from shared package";

export function formatGreeting(name: string): string {
  return `Hello, ${name}!`;
}
