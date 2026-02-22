interface QuitAPI {
  auth: {
    requestOtp: (email: string) => Promise<{ ok?: boolean; error?: string }>;
    verifyOtp: (email: string, code: string) => Promise<{ ok?: boolean; error?: string; user?: { id: string; email: string } }>;
    me: () => Promise<{ ok?: boolean; error?: string; user?: { id: string; email: string; createdAt: string; lastLoginAt: string | null } }>;
    logout: () => Promise<{ ok?: boolean }>;
  };
}

const getQuit = () => (window as any).quit as QuitAPI;
export const ipc = {
  auth: {
    requestOtp: (email: string) => getQuit().auth.requestOtp(email),
    verifyOtp: (email: string, code: string) => getQuit().auth.verifyOtp(email, code),
    me: () => getQuit().auth.me(),
    logout: () => getQuit().auth.logout()
  }
};
