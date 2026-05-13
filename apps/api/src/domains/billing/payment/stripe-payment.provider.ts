// domains/billing/payment/stripe-payment.provider.ts
import Stripe from 'stripe';
import type { IPaymentProvider, CreateCheckoutInput, CheckoutResult, WebhookEvent } from './payment-provider.interface';

export class StripePaymentProvider implements IPaymentProvider {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.buyerEmail,
      line_items: input.lineItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.amountCents,
        },
        quantity: item.quantity,
      })),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        purchaseId: input.purchaseId,
        ...input.metadata,
      },
    });

    return {
      checkoutUrl: session.url!,
      externalSessionId: session.id,
    };
  }

  async parseWebhookEvent(payload: Buffer, signature: string): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: 'payment_completed',
        externalSessionId: session.id,
        externalPaymentId: session.payment_intent as string,
        metadata: session.metadata as Record<string, string>,
      };
    }

    return { type: event.type };
  }

  async getPaymentStatus(externalSessionId: string): Promise<'pending' | 'completed' | 'failed'> {
    const session = await this.stripe.checkout.sessions.retrieve(externalSessionId);
    switch (session.payment_status) {
      case 'paid': return 'completed';
      case 'unpaid': return 'pending';
      default: return 'failed';
    }
  }
}
