import { env } from "../config";
import type { 
  StartRunInput, 
  RunStatusOutput, 
  RunDetailOutput,
  InstrumentOutput, 
  ShareGrantOutput, 
  GrantShareInput,
  AccessibleResource,
  ReportOutput
} from "@dimensional/shared";

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json', 
        ...options?.headers 
      },
      ...options,
    });
    
    if (!res.ok) {
      // If the user session has expired, redirect to login on the client.
      if (res.status === 401 && typeof window !== 'undefined') {
        try {
          // Use a hard navigation to ensure all state is reset.
          window.location.assign('/login');
        } catch {}
      }

      const error = await res.json().catch(() => ({ message: 'Request failed', code: 'UNKNOWN' }));
      throw new ApiError(res.status, error.code, error.message);
    }
    
    // Check if response is empty (e.g. 204 No Content)
    if (res.status === 204) return {} as T;
    
    return res.json();
  }

  // Instruments & Runs
  instruments = {
    get: (slug: string) => this.request<InstrumentOutput>(`/api/v1/instruments/${slug}`),
    startRun: (slug: string) => this.request<RunStatusOutput>(`/api/v1/instruments/${slug}/runs`, { method: 'POST' }),
    submitResponses: (runId: string, responses: { itemId: string; responseValue: number }[]) =>
      this.request<{ success: boolean }>(`/api/v1/runs/${runId}/responses`, { method: 'POST', body: JSON.stringify({ responses }) }),
    completeRun: (runId: string) =>
      this.request<{ success: boolean; profileId: string }>(`/api/v1/runs/${runId}/complete`, { method: 'POST' }),
    getRunStatus: (runId: string) => this.request<RunStatusOutput>(`/api/v1/runs/${runId}`),
    getRunDetail: (runId: string) => this.request<RunDetailOutput>(`/api/v1/runs/${runId}/detail`),
  };

  // Reports
  reports = {
    list: () => this.request<ReportOutput[]>('/api/v1/reports'),
    get: (reportId: string) => this.request<ReportOutput>(`/api/v1/reports/${reportId}`),
    // downloadPdf: (reportId: string) => this.request<Blob>(`/api/v1/reports/${reportId}/pdf`),
  };

  // Sharing
  sharing = {
    getMyShares: () => this.request<ShareGrantOutput[]>('/api/v1/sharing/my-shares'),
    getSharedWithMe: () => this.request<AccessibleResource[]>('/api/v1/sharing/shared-with-me'),
    grant: (input: GrantShareInput) =>
      this.request<ShareGrantOutput>('/api/v1/sharing/grants', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    revoke: (grantId: string) =>
      this.request(`/api/v1/sharing/grants/${grantId}`, { method: 'DELETE' }),
    getGrant: (grantId: string) =>
      this.request<ShareGrantOutput>(`/api/v1/sharing/grants/${grantId}`),
  };

  // Generic methods
  get = <T>(path: string) => this.request<T>(path, { method: 'GET' });
  post = <T>(path: string, body: any) => this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  put = <T>(path: string, body: any) => this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  patch = <T>(path: string, body: any) => this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  delete = <T>(path: string) => this.request<T>(path, { method: 'DELETE' });

  // Commercial / Reseller
  commercial = {
    getReferralCodes: () => this.request<any[]>('/api/v1/commercial/referral-codes'),
    createReferralCode: (code?: string) => 
      this.request<any>('/api/v1/commercial/referral-codes', { method: 'POST', body: JSON.stringify({ code }) }),
    getAttributions: () => this.request<any[]>('/api/v1/commercial/attributions'),
  };

  // Billing
  billing = {
    checkoutIndividual: (referralCode?: string) => 
      this.request<any>('/api/v1/billing/checkout/individual', { method: 'POST', body: JSON.stringify({ referralCode }) }),
    checkoutOrgSeats: (organizationId: string, referralCode?: string) =>
      this.request<any>('/api/v1/billing/checkout/org-seats', { method: 'POST', body: JSON.stringify({ organizationId, referralCode }) }),
  };
}

export const api = new ApiClient(env.NEXT_PUBLIC_API_URL!);

// For backward compatibility or simple use cases
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${env.NEXT_PUBLIC_API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Redirect to login on client when session has expired
    if (response.status === 401 && typeof window !== 'undefined') {
      try {
        window.location.assign('/login');
      } catch {}
    }

    // Try to surface server-provided error details
    let message = response.statusText || 'Request failed';
    try {
      const data = await response.json();
      if (data && typeof data.message === 'string') {
        message = data.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {}
    }
    throw new Error(`API error: ${message}`);
  }

  return response.json();
}
