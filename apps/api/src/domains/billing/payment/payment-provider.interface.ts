// domains/billing/payment/payment-provider.interface.ts

export interface CreateCheckoutInput {
  purchaseId: string;
  buyerEmail: string;
  lineItems: Array<{
    name: string;
    description?: string;
    amountCents: number;
    quantity: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  checkoutUrl: string;
  externalSessionId: string;
}

export interface WebhookEvent {
  type: string;
  externalSessionId?: string;
  externalPaymentId?: string;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface IPaymentProvider {
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult>;
  parseWebhookEvent(payload: Buffer, signature: string): Promise<WebhookEvent>;
  getPaymentStatus(externalSessionId: string): Promise<'pending' | 'completed' | 'failed'>;
}
