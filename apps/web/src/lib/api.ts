import { env } from "../config";

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
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
