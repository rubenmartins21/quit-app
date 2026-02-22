import { useState, useCallback, useEffect } from "react";
import { ipc } from "../lib/ipc";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: { id: string; email: string } };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    ipc.auth.me()
      .then(res => {
        if (res.ok && res.user) setState({ status: "authenticated", user: res.user });
        else setState({ status: "unauthenticated" });
      })
      .catch(() => setState({ status: "unauthenticated" }));
  }, []);

  const login = useCallback((user: { id: string; email: string }) => {
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    await ipc.auth.logout();
    setState({ status: "unauthenticated" });
  }, []);

  return { state, login, logout };
}
