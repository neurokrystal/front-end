export interface IStripeService {
  createCheckoutSession(params: {
    purchaseId: string;
    amountCents: number;
    currency: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string }>;
  
  verifyWebhook(payload: string, signature: string): Promise<any>;
}

export class MockStripeService implements IStripeService {
  async createCheckoutSession(params: {
    purchaseId: string;
    amountCents: number;
    currency: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return {
      id: `mock_session_${params.purchaseId}`,
      url: `${params.successUrl}?session_id=mock_session_${params.purchaseId}`,
    };
  }

  async verifyWebhook(payload: string, signature: string) {
    return { 
      type: 'checkout.session.completed', 
      data: { 
        object: { 
          id: 'mock_session_id',
          metadata: { purchaseId: 'mock' } 
        } 
      } 
    };
  }
}
