/**
 * App.tsx
 * Localização: src/renderer/App.tsx
 *
 * onLogout é passado a todos os ecrãs para que o Sidebar possa usá-lo.
 */

import { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { CreateChallengeScreen } from "./screens/CreateChallengeScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { BlockerSyncScreen } from "./screens/BlockerSyncScreen";
import UninstallScreen from "./screens/UninstallScreen";
import TamperAlert from "./components/TamperAlert";
import { I18nProvider } from "./lib/i18n";
import { ipc, ChallengeData } from "./lib/ipc";

const IS_UNINSTALL = new URLSearchParams(window.location.search).get("screen") === "uninstall";

export type AppScreen = "dashboard" | "challenge" | "history";

type BlockerBootState = "checking" | "needs_sync" | "ok";

// ── LogoutContext — so Sidebar can call logout without prop drilling ───────────
interface LogoutCtx { onLogout: () => Promise<void>; }
const LogoutContext = createContext<LogoutCtx>({ onLogout: async () => {} });
export function useLogout() { return useContext(LogoutContext); }

export function App() {
  if (IS_UNINSTALL) return <UninstallScreen />;
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

function AppInner() {
  const { state, login, logout } = useAuth();
  const [screen,      setScreen]      = useState<AppScreen>("dashboard");
  const [blockerBoot, setBlockerBoot] = useState<BlockerBootState>("checking");

  useEffect(() => {
    async function check() {
      try {
        const [br, cr] = await Promise.all([ipc.blocker.status(), ipc.challenge.active()]);
        if ((br.active ?? false) && !cr.challenge) setBlockerBoot("needs_sync");
        else setBlockerBoot("ok");
      } catch { setBlockerBoot("ok"); }
    }
    check();
  }, []);

  if (blockerBoot === "checking") return <LoadingScreen />;
  if (blockerBoot === "needs_sync") return <BlockerSyncScreen onDone={() => setBlockerBoot("ok")} />;
  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "unauthenticated") return <LoginScreen onSuccess={login} />;

  return (
    <LogoutContext.Provider value={{ onLogout: logout }}>
      {screen === "challenge" ? (
        <CreateChallengeScreen
          onCreated={(_c: ChallengeData) => setScreen("dashboard")}
          onNavigate={setScreen}
        />
      ) : screen === "history" ? (
        <HistoryScreen onNavigate={setScreen} />
      ) : (
        <>
          <DashboardScreen
            user={state.user}
            onNavigate={setScreen}
          />
          <TamperAlert />
        </>
      )}
    </LogoutContext.Provider>
  );
}
