import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { CreateChallengeScreen } from "./screens/CreateChallengeScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { BlockerSyncScreen } from "./screens/BlockerSyncScreen";
import { ipc, ChallengeData } from "./lib/ipc";

export type AppScreen = "dashboard" | "challenge" | "history";

/**
 * Estado do bloqueador no arranque:
 *  - "checking"    → ainda a verificar (mostra LoadingScreen)
 *  - "needs_sync"  → bloqueador ativo mas sem desafio → mostra BlockerSyncScreen
 *  - "ok"          → normal, segue para o flow de auth/screens
 */
type BlockerBootState = "checking" | "needs_sync" | "ok";

export function App() {
  const { state, login, logout } = useAuth();
  const [screen, setScreen] = useState<AppScreen>("dashboard");
  const [blockerBoot, setBlockerBoot] = useState<BlockerBootState>("checking");

  useEffect(() => {
    // Verifica logo no arranque se o bloqueador precisa de ser sincronizado.
    // Fazemos isto antes de qualquer outra coisa para evitar o UAC aparecer
    // sem contexto mais tarde no flow (ex: ao carregar o dashboard).
    async function checkBlocker() {
      try {
        const [blockerRes, challengeRes] = await Promise.all([
          ipc.blocker.status(),
          ipc.challenge.active(),
        ]);

        const blockerActive = blockerRes.active ?? false;
        const hasActiveChallenge = !!challengeRes.challenge;

        if (blockerActive && !hasActiveChallenge) {
          // Bloqueador órfão — desafio terminou mas o bloqueio ficou ativo.
          // Mostra o ecrã de transição para preparar o utilizador para o UAC.
          setBlockerBoot("needs_sync");
        } else {
          setBlockerBoot("ok");
        }
      } catch {
        // Em caso de erro (ex: sem sessão ainda), segue normalmente.
        // O syncBlockerInBackground no main process vai tratar do resto.
        setBlockerBoot("ok");
      }
    }

    checkBlocker();
  }, []);

  // Ainda a verificar o estado do bloqueador
  if (blockerBoot === "checking") return <LoadingScreen />;

  // Bloqueador precisa de ser removido — mostra ecrã de transição primeiro
  if (blockerBoot === "needs_sync") {
    return (
      <BlockerSyncScreen
        onDone={() => setBlockerBoot("ok")}
      />
    );
  }

  // Flow normal
  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "unauthenticated") return <LoginScreen onSuccess={login} />;

  if (screen === "challenge") {
    return (
      <CreateChallengeScreen
        onCreated={(_c: ChallengeData) => setScreen("dashboard")}
        onNavigate={setScreen}
      />
    );
  }

  if (screen === "history") {
    return <HistoryScreen onNavigate={setScreen} />;
  }

  return (
    <DashboardScreen
      user={state.user}
      onLogout={logout}
      onNavigate={setScreen}
    />
  );
}
