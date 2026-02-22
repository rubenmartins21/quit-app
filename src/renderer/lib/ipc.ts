interface ChallengeProgress { daysElapsed: number; daysRemaining: number; percentage: number; }
export interface ChallengeData {
  id: string; durationDays: number; reason: string;
  status: "active" | "cancelled" | "completed";
  startedAt: string; endsAt: string;
  cancelledAt: string | null; completedAt: string | null; createdAt: string;
  progress: ChallengeProgress;
}

interface QuitAPI {
  auth: {
    requestOtp: (email: string) => Promise<{ ok?: boolean; error?: string }>;
    verifyOtp: (email: string, code: string) => Promise<{ ok?: boolean; error?: string; user?: { id: string; email: string } }>;
    me: () => Promise<{ ok?: boolean; error?: string; user?: { id: string; email: string; createdAt: string; lastLoginAt: string | null } }>;
    logout: () => Promise<{ ok?: boolean }>;
  };
  challenge: {
    create: (durationDays: number, reason: string) => Promise<{ ok?: boolean; error?: string; challenge?: ChallengeData }>;
    active: () => Promise<{ ok?: boolean; error?: string; challenge: ChallengeData | null }>;
    cancel: (id: string) => Promise<{ ok?: boolean; error?: string; challenge?: ChallengeData }>;
    history: () => Promise<{ ok?: boolean; error?: string; challenges?: ChallengeData[] }>;
  };
}

const getQuit = () => (window as unknown as { quit: QuitAPI }).quit;

export const ipc = {
  auth: {
    requestOtp: (email: string) => getQuit().auth.requestOtp(email),
    verifyOtp: (email: string, code: string) => getQuit().auth.verifyOtp(email, code),
    me: () => getQuit().auth.me(),
    logout: () => getQuit().auth.logout(),
  },
  challenge: {
    create: (durationDays: number, reason: string) => getQuit().challenge.create(durationDays, reason),
    active: () => getQuit().challenge.active(),
    cancel: (id: string) => getQuit().challenge.cancel(id),
    history: () => getQuit().challenge.history(),
  },
};
