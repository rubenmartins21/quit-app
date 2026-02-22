import React from "react";
import { Button } from "../components/ui";

interface Props { user: { id: string; email: string }; onLogout: () => Promise<void>; }

function NavItem({ label, active, muted }: { label: string; active?: boolean; muted?: boolean }) {
  return (
    <div style={{ padding: "9px 12px", borderRadius: "var(--radius-sm)", fontSize: "12px", letterSpacing: "0.04em",
      color: active ? "var(--white)" : muted ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)",
      background: active ? "rgba(255,255,255,0.1)" : "transparent", cursor: muted ? "default" : "pointer" }}>
      {label}
    </div>
  );
}

export function DashboardScreen({ user, onLogout }: Props) {
  const [loggingOut, setLoggingOut] = React.useState(false);
  async function handleLogout() { setLoggingOut(true); await onLogout(); setLoggingOut(false); }

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--white)", overflow: "hidden" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />
      <aside style={{ width: "200px", flexShrink: 0, background: "var(--green)", padding: "52px 20px 28px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--white)", marginBottom: "40px" }}>Quit</div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <NavItem label="Estado" active />
          <NavItem label="Desafio" muted />
          <NavItem label="Historico" muted />
        </nav>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>v1.0.0</div>
      </aside>
      <main style={{ flex: 1, padding: "52px 56px 40px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "6px" }}>Sessao ativa</p>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "32px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.1, marginBottom: "4px" }}>Bem-vindo.</h1>
        <p style={{ fontSize: "12px", color: "var(--gray-400)", marginBottom: "32px" }}>{user.email}</p>
        <div style={{ height: "1px", background: "var(--gray-200)", marginBottom: "32px" }} />
        <div style={{ padding: "20px 24px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "var(--gray-50)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gray-400)" }}>Adult Filter</p>
            <p style={{ fontSize: "14px", color: "var(--gray-800)" }}>Inativo — em breve</p>
            <p style={{ fontSize: "11px", color: "var(--gray-400)", lineHeight: "1.5", marginTop: "4px", maxWidth: "320px" }}>Bloqueio via DNS + hosts file sera ativado na proxima fase.</p>
          </div>
          <span style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gray-400)", background: "var(--gray-200)", padding: "4px 10px", borderRadius: "99px", flexShrink: 0 }}>Em breve</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ maxWidth: "220px" }}>
          <Button variant="ghost" loading={loggingOut} onClick={handleLogout}>Terminar sessao</Button>
        </div>
      </main>
    </div>
  );
}
