export interface QuitRequestData {
  requestedAt: string; unlocksAt: string; feeling: string;
  status: "pending" | "cancelled_by_user";
  cancelledAt: string | null;
  hoursRemaining: number; minutesRemaining: number; isUnlocked: boolean;
}
export interface ChallengeProgress { daysElapsed: number; daysRemaining: number; percentage: number; }
export interface ChallengeData {
  id: string; durationDays: number; reason: string;
  status: "active" | "cancelled" | "completed";
  startedAt: string; endsAt: string;
  cancelledAt: string | null; completedAt: string | null; createdAt: string;
  quitRequest: QuitRequestData | null;
  progress: ChallengeProgress;
}

export interface BlockedApp { name: string; exePath: string; }
export interface InstalledApp { name: string; exePath: string; }

export interface BlockerStatus {
  ok?: boolean;
  active: boolean;
  challengeId: string | null;
  blockReddit: boolean;
  blockTwitter: boolean;
  blockedApps: BlockedApp[];
  blockedUrls: string[];
}

export interface CreateChallengePayload {
  durationDays: number;
  reason: string;
  blockReddit?: boolean;
  blockTwitter?: boolean;
  blockedApps?: BlockedApp[];
  blockedUrls?: string[];
}

export interface AddToBlockerPayload {
  url?: string;
  app?: BlockedApp;
  blockReddit?: boolean;
  blockTwitter?: boolean;
}

interface QuitAPI {
  auth: {
    requestOtp: (email: string) => Promise<{ ok?: boolean; error?: string }>;
    verifyOtp: (email: string, code: string) => Promise<{ ok?: boolean; error?: string; user?: { id: string; email: string } }>;
    me: () => Promise<{ ok?: boolean; error?: string; user?: { id: string; email: string; createdAt: string; lastLoginAt: string | null } }>;
    logout: () => Promise<{ ok?: boolean }>;
  };
  challenge: {
    create: (payload: CreateChallengePayload) => Promise<{ ok?: boolean; error?: string; challenge?: ChallengeData; blockerActive?: boolean }>;
    active: () => Promise<{ ok?: boolean; error?: string; challenge: ChallengeData | null }>;
    cancel: (id: string) => Promise<{ ok?: boolean; error?: string; challenge?: ChallengeData }>;
    quitRequest: {
      create: (id: string, feeling: string) => Promise<{ ok?: boolean; error?: string; challenge?: ChallengeData }>;
      cancel: (id: string) => Promise<{ ok?: boolean; error?: string; challenge?: ChallengeData }>;
    };
    history: () => Promise<{ ok?: boolean; error?: string; challenges?: ChallengeData[] }>;
  };
  blocker: {
    status: () => Promise<BlockerStatus>;
    installedApps: () => Promise<{ ok?: boolean; apps: InstalledApp[] }>;
    add: (payload: AddToBlockerPayload) => Promise<{ ok?: boolean; error?: string }>;
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
    create: (payload: CreateChallengePayload) => getQuit().challenge.create(payload),
    active: () => getQuit().challenge.active(),
    cancel: (id: string) => getQuit().challenge.cancel(id),
    quitRequest: {
      create: (id: string, feeling: string) => getQuit().challenge.quitRequest.create(id, feeling),
      cancel: (id: string) => getQuit().challenge.quitRequest.cancel(id),
    },
    history: () => getQuit().challenge.history(),
  },
  blocker: {
    status: () => getQuit().blocker.status(),
    installedApps: () => getQuit().blocker.installedApps(),
    add: (payload: AddToBlockerPayload) => getQuit().blocker.add(payload),
  },
};
