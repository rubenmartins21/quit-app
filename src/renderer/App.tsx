import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { CreateChallengeScreen } from "./screens/CreateChallengeScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { ChallengeData } from "./lib/ipc";

export type AppScreen = "dashboard" | "challenge" | "history";

export function App() {
  const { state, login, logout } = useAuth();
  const [screen, setScreen] = useState<AppScreen>("dashboard");

  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "unauthenticated") return <LoginScreen onSuccess={login} />;

  if (screen === "challenge") {
    return <CreateChallengeScreen onCreated={(_c: ChallengeData) => setScreen("dashboard")} onNavigate={setScreen} />;
  }

  if (screen === "history") {
    return <HistoryScreen onNavigate={setScreen} />;
  }

  return <DashboardScreen user={state.user} onLogout={logout} onNavigate={setScreen} />;
}
