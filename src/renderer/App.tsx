import { useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LoadingScreen } from "./screens/LoadingScreen";

export function App() {
  const { state, login, logout } = useAuth();
  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "unauthenticated") return <LoginScreen onSuccess={login} />;
  return <DashboardScreen user={state.user} onLogout={logout} />;
}
