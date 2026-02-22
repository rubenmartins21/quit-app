/**
 * apiClient — runs exclusively in the main process.
 * Renderer never calls the backend directly.
 */

const BASE_URL = process.env.VITE_API_URL ?? "http://localhost:4000";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

let currentToken: string | null = null;

export function setToken(token: string | null): void {
  currentToken = token;
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  requiresAuth = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requiresAuth && currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) return { error: (json.error as string) ?? "Erro desconhecido" };
    return { data: json as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sem ligacao ao servidor" };
  }
}

// AUTH
export async function requestOtp(email: string) {
  return request<{ message: string }>("POST", "/auth/request-otp", { email });
}
export async function verifyOtp(email: string, code: string, deviceId: string, platform: string) {
  return request<{ token: string; user: { id: string; email: string } }>(
    "POST", "/auth/verify-otp", { email, code, deviceId, platform }
  );
}

// USER
export interface MeResponse { id: string; email: string; createdAt: string; lastLoginAt: string | null; }
export async function getMe() {
  return request<MeResponse>("GET", "/me", undefined, true);
}

// CHALLENGES
export interface ChallengeProgress { daysElapsed: number; daysRemaining: number; percentage: number; }
export interface ChallengeData {
  id: string; durationDays: number; reason: string;
  status: "active" | "cancelled" | "completed";
  startedAt: string; endsAt: string;
  cancelledAt: string | null; completedAt: string | null; createdAt: string;
  progress: ChallengeProgress;
}
export async function createChallenge(durationDays: number, reason: string) {
  return request<ChallengeData>("POST", "/challenges", { durationDays, reason }, true);
}
export async function getActiveChallenge() {
  return request<{ challenge: ChallengeData | null }>("GET", "/challenges/active", undefined, true);
}
export async function cancelChallenge(id: string) {
  return request<ChallengeData>("PATCH", `/challenges/${id}/cancel`, undefined, true);
}
export async function getChallengeHistory() {
  return request<{ challenges: ChallengeData[] }>("GET", "/challenges", undefined, true);
}
