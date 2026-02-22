const BASE_URL = process.env.VITE_API_URL ?? "http://localhost:4000";
let currentToken: string | null = null;

export function setToken(token: string | null): void { currentToken = token; }

async function request<T>(method: string, endpoint: string, body?: unknown, auth = false): Promise<{ data?: T; error?: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) return { error: (json.error as string) ?? "Erro desconhecido" };
    return { data: json as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sem ligacao ao servidor" };
  }
}

export const requestOtp = (email: string) => request<{ message: string }>("POST", "/auth/request-otp", { email });
export const verifyOtp = (email: string, code: string, deviceId: string, platform: string) =>
  request<{ token: string; user: { id: string; email: string } }>("POST", "/auth/verify-otp", { email, code, deviceId, platform });
export const getMe = () => request<{ id: string; email: string; createdAt: string; lastLoginAt: string | null }>("GET", "/me", undefined, true);
