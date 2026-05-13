// domains/billing/payment/mock-payment.provider.ts
import type { IPaymentProvider, CreateCheckoutInput, CheckoutResult, WebhookEvent } from './payment-provider.interface';

export class MockPaymentProvider implements IPaymentProvider {
  private sessions = new Map<string, { input: CreateCheckoutInput; status: 'pending' | 'completed' | 'failed' }>();

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.sessions.set(sessionId, { input, status: 'pending' });

    // In mock mode, return a URL that auto-completes the purchase
    return {
      checkoutUrl: `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}mock_session=${sessionId}`,
      externalSessionId: sessionId,
    };
  }

  async parseWebhookEvent(payload: Buffer, signature: string): Promise<WebhookEvent> {
    // Mock webhook — parse the body directly
    const body = JSON.parse(payload.toString());
    return {
      type: 'payment_completed',
      externalSessionId: body.sessionId,
      externalPaymentId: `mock_payment_${Date.now()}`,
      metadata: body.metadata,
    };
  }

  async getPaymentStatus(externalSessionId: string): Promise<'pending' | 'completed' | 'failed'> {
    return this.sessions.get(externalSessionId)?.status ?? 'pending';
  }

  // Dev-only: simulate payment completion
  simulatePaymentComplete(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.status = 'completed';
  }
}
