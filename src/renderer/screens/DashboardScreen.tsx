import React, { useEffect, useState } from "react";
import { ipc, ChallengeData } from "../lib/ipc";
import { Button } from "../components/ui";
import { Sidebar } from "../components/Sidebar";
import { AppScreen } from "../App";

interface Props {
  user: { id: string; email: string };
  onLogout: () => Promise<void>;
  onNavigate: (screen: AppScreen) => void;
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div style={{ height: "3px", background: "var(--gray-200)", borderRadius: "99px", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(percentage, 100)}%`,
        background: "var(--green)", borderRadius: "99px", transition: "width 0.6s ease"
      }} />
    </div>
  );
}

const dailyMessages = [
  "Impulsos são temporários.",
  "Hoje estás no controlo.",
  "O progresso é acumulativo.",
  "Cada dia conta.",
  "Sem atalhos.",
];

export function DashboardScreen({ user, onLogout, onNavigate }: Props) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeData | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    ipc.challenge.active().then(res => setChallenge(res.challenge ?? null));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await onLogout();
  }

  async function handleCancel() {
    if (!challenge) return;
    if (!cancelConfirm) { setCancelConfirm(true); return; }
    setCancelling(true);
    await ipc.challenge.cancel(challenge.id);
    setChallenge(null);
    setCancelling(false);
    setCancelConfirm(false);
  }

  const todayMsg = dailyMessages[new Date().getDay() % dailyMessages.length];

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--white)", overflow: "hidden" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />

      <Sidebar active="dashboard" onNavigate={onNavigate} />

      <main style={{ flex: 1, padding: "52px 56px 40px", display: "flex", flexDirection: "column", overflowY: "auto" }}>

        <p style={eyebrow}>{challenge ? "Desafio ativo" : "Sessão ativa"}</p>

        {challenge ? (
          <>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "56px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1, marginBottom: "4px" }}>
              {challenge.progress.daysElapsed}
            </h1>
            <p style={{ fontSize: "12px", color: "var(--gray-400)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
              dias consecutivos
            </p>
            <p style={{ fontSize: "13px", color: "var(--green)", marginBottom: "28px" }}>{todayMsg}</p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "32px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.1, marginBottom: "4px" }}>
              Bem-vindo.
            </h1>
            <p style={{ fontSize: "12px", color: "var(--gray-400)", marginBottom: "28px" }}>{user.email}</p>
          </>
        )}

        <div style={{ height: "1px", background: "var(--gray-200)", marginBottom: "28px" }} />

        {/* Challenge card */}
        {challenge === undefined ? (
          <div style={card}><p style={{ fontSize: "12px", color: "var(--gray-400)" }}>A carregar...</p></div>
        ) : challenge ? (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <p style={fieldLabel}>Progresso</p>
                <p style={{ fontSize: "14px", color: "var(--gray-800)", marginTop: "2px" }}>
                  {challenge.progress.daysElapsed} / {challenge.durationDays} dias
                </p>
              </div>
              <span style={badge}>
                {challenge.progress.daysRemaining} dia{challenge.progress.daysRemaining !== 1 ? "s" : ""} restante{challenge.progress.daysRemaining !== 1 ? "s" : ""}
              </span>
            </div>

            <ProgressBar percentage={challenge.progress.percentage} />

            <div style={{ marginTop: "20px", padding: "14px 16px", background: "var(--gray-50)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid var(--gray-200)" }}>
              <p style={{ ...fieldLabel, marginBottom: "6px" }}>O teu motivo</p>
              <p style={{ fontSize: "12px", color: "var(--gray-600)", lineHeight: "1.6", fontStyle: "italic" }}>"{challenge.reason}"</p>
            </div>

            <div style={{ marginTop: "20px" }}>
              {cancelConfirm ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <p style={{ fontSize: "11px", color: "var(--gray-400)", flex: 1 }}>
                    Tens a certeza? Perdes {challenge.progress.daysElapsed} dia(s) de progresso.
                  </p>
                  <button onClick={() => setCancelConfirm(false)} style={ghostBtn}>Não</button>
                  <button onClick={handleCancel} disabled={cancelling} style={dangerBtn}>
                    {cancelling ? "..." : "Sim, cancelar"}
                  </button>
                </div>
              ) : (
                <button onClick={handleCancel} style={ghostBtn}>Cancelar desafio</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ ...card, borderStyle: "dashed" }}>
            <p style={fieldLabel}>Sem desafio ativo</p>
            <p style={{ fontSize: "12px", color: "var(--gray-400)", lineHeight: "1.6", margin: "6px 0 20px" }}>
              Cria um desafio para começar a controlar os teus hábitos digitais.
            </p>
            <div style={{ maxWidth: "200px" }}>
              <Button onClick={() => onNavigate("challenge")}>Criar desafio</Button>
            </div>
          </div>
        )}

        {/* Adult Filter placeholder */}
        <div style={{ ...card, marginTop: "12px", opacity: 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={fieldLabel}>Adult Filter</p>
              <p style={{ fontSize: "13px", color: "var(--gray-600)", marginTop: "2px" }}>Bloqueio DNS + hosts file</p>
            </div>
            <span style={badge}>Em breve</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ maxWidth: "220px" }}>
          <Button variant="ghost" loading={loggingOut} onClick={handleLogout}>Terminar sessão</Button>
        </div>
      </main>
    </div>
  );
}

const eyebrow: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "6px" };
const card: React.CSSProperties = { padding: "20px 24px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "var(--gray-50)" };
const fieldLabel: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gray-400)" };
const badge: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gray-400)", background: "var(--gray-200)", padding: "4px 10px", borderRadius: "99px", flexShrink: 0 };
const ghostBtn: React.CSSProperties = { padding: "7px 14px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gray-600)", background: "transparent", cursor: "pointer" };
const dangerBtn: React.CSSProperties = { ...ghostBtn, borderColor: "var(--red-muted)", color: "var(--red-muted)" };
