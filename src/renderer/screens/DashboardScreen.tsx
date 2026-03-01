import React, { useEffect, useState } from "react";
import { ipc, ChallengeData, BlockerStatus } from "../lib/ipc";
import { Button } from "../components/ui";
import { Sidebar } from "../components/Sidebar";
import { QuitFlowScreen } from "./QuitFlowScreen";
import { AddBlockedUrlCard } from "../components/AddBlockedUrlCard";
import { AppScreen } from "../App";

interface Props {
  user: { id: string; email: string };
  onLogout: () => Promise<void>;
  onNavigate: (screen: AppScreen) => void;
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div
      style={{
        height: "3px",
        background: "var(--gray-200)",
        borderRadius: "99px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(percentage, 100)}%`,
          background: "var(--green)",
          borderRadius: "99px",
          transition: "width 0.6s ease",
        }}
      />
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
  const [challenge, setChallenge] = useState<ChallengeData | null | undefined>(
    undefined,
  );
  const [blockerStatus, setBlockerStatus] = useState<BlockerStatus | null>(
    null,
  );
  const [showQuitFlow, setShowQuitFlow] = useState(false);
  const [cancellingQuit, setCancellingQuit] = useState(false);

  const blockerActive = blockerStatus?.active ?? false;

  useEffect(() => {
    ipc.challenge.active().then((res) => setChallenge(res.challenge ?? null));
    ipc.blocker.status().then((res) => setBlockerStatus(res));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await onLogout();
  }

  async function handleCancelQuitRequest() {
    if (!challenge) return;
    setCancellingQuit(true);
    const res = await ipc.challenge.quitRequest.cancel(challenge.id);
    if (res.ok && res.challenge) setChallenge(res.challenge);
    setCancellingQuit(false);
  }

  function refreshBlockerStatus() {
    ipc.blocker.status().then((res) => setBlockerStatus(res));
  }

  const todayMsg = dailyMessages[new Date().getDay() % dailyMessages.length];
  const qr = challenge?.quitRequest;
  const hasPendingQuit = qr?.status === "pending";

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: "var(--white)",
        overflow: "hidden",
      }}
    >
      <div
        className="drag-region"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "28px",
          zIndex: 10,
        }}
      />

      <Sidebar active="dashboard" onNavigate={onNavigate} />

      {showQuitFlow && challenge && (
        <QuitFlowScreen
          challenge={challenge}
          onDone={(updated) => {
            setChallenge(updated);
            setShowQuitFlow(false);
          }}
          onBack={() => setShowQuitFlow(false)}
        />
      )}

      <main
        style={{
          flex: 1,
          padding: "52px 56px 40px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <p style={eyebrow}>
          {challenge
            ? hasPendingQuit
              ? "Período de reflexão"
              : "Desafio ativo"
            : "Sessão ativa"}
        </p>

        {challenge ? (
          <>
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontSize: "56px",
                fontWeight: 400,
                lineHeight: 1,
                marginBottom: "4px",
                color: hasPendingQuit ? "var(--gray-400)" : "var(--gray-800)",
                transition: "color 0.3s",
              }}
            >
              {challenge.progress.daysElapsed}
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--gray-400)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              dias consecutivos
            </p>
            <p
              style={{
                fontSize: "13px",
                color: hasPendingQuit ? "var(--gray-400)" : "var(--green)",
                marginBottom: "28px",
              }}
            >
              {hasPendingQuit
                ? `Desistência registada. Desbloqueio em ${qr!.hoursRemaining}h.`
                : todayMsg}
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontSize: "32px",
                color: "var(--gray-800)",
                fontWeight: 400,
                lineHeight: 1.1,
                marginBottom: "4px",
              }}
            >
              Bem-vindo.
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--gray-400)",
                marginBottom: "28px",
              }}
            >
              {user.email}
            </p>
          </>
        )}

        <div
          style={{
            height: "1px",
            background: "var(--gray-200)",
            marginBottom: "28px",
          }}
        />

        {challenge === undefined ? (
          <div style={card}>
            <p style={{ fontSize: "12px", color: "var(--gray-400)" }}>
              A carregar...
            </p>
          </div>
        ) : challenge ? (
          <>
            {hasPendingQuit && (
              <div style={quitBanner}>
                <div>
                  <p style={quitBannerLabel}>Desistência pendente</p>
                  <p style={quitBannerText}>
                    Desbloqueio em{" "}
                    <strong>
                      {qr!.hoursRemaining > 0
                        ? `${qr!.hoursRemaining}h`
                        : `${qr!.minutesRemaining} min`}
                    </strong>
                    . Se mudares de ideias, podes cancelar.
                  </p>
                </div>
                <button
                  onClick={handleCancelQuitRequest}
                  disabled={cancellingQuit}
                  style={cancelQuitBtn}
                >
                  {cancellingQuit ? "..." : "Cancelar desistência"}
                </button>
              </div>
            )}

            <div style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <p style={fieldLabel}>Progresso</p>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--gray-800)",
                      marginTop: "2px",
                    }}
                  >
                    {challenge.progress.daysElapsed} / {challenge.durationDays}{" "}
                    dias
                  </p>
                </div>
                <span style={badge}>
                  {challenge.progress.daysRemaining} dia
                  {challenge.progress.daysRemaining !== 1 ? "s" : ""} restante
                  {challenge.progress.daysRemaining !== 1 ? "s" : ""}
                </span>
              </div>

              <ProgressBar percentage={challenge.progress.percentage} />

              <div
                style={{
                  marginTop: "20px",
                  padding: "14px 16px",
                  background: "var(--gray-50)",
                  borderRadius: "var(--radius-sm)",
                  borderLeft: "2px solid var(--gray-200)",
                }}
              >
                <p style={{ ...fieldLabel, marginBottom: "6px" }}>
                  O teu motivo
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--gray-600)",
                    lineHeight: "1.6",
                    fontStyle: "italic",
                  }}
                >
                  "{challenge.reason}"
                </p>
              </div>

              {!hasPendingQuit && (
                <div style={{ marginTop: "20px" }}>
                  <button onClick={() => setShowQuitFlow(true)} style={quitBtn}>
                    Tentar desistir
                  </button>
                </div>
              )}
            </div>

            {/* Bloqueios activos — só aparece quando bloqueador está activo */}
            {blockerActive && blockerStatus && (
              <div style={{ marginTop: "12px" }}>
                <AddBlockedUrlCard
                  blockerStatus={blockerStatus}
                  onUpdated={refreshBlockerStatus}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{ ...card, borderStyle: "dashed" }}>
            <p style={fieldLabel}>Sem desafio ativo</p>
            <p
              style={{
                fontSize: "12px",
                color: "var(--gray-400)",
                lineHeight: "1.6",
                margin: "6px 0 20px",
              }}
            >
              Cria um desafio para começar.
            </p>
            <div style={{ maxWidth: "200px" }}>
              <Button onClick={() => onNavigate("challenge")}>
                Criar desafio
              </Button>
            </div>
          </div>
        )}

        {/* Adult Filter status — quando não há desafio activo */}
        {!blockerActive && (
          <div style={{ ...card, marginTop: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={fieldLabel}>Adult Filter</p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--gray-600)",
                    marginTop: "2px",
                  }}
                >
                  Inativo
                </p>
              </div>
              <span
                style={{
                  ...badge,
                  color: "var(--gray-400)",
                  background: "var(--gray-200)",
                }}
              >
                OFF
              </span>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ maxWidth: "220px" }}>
          <Button variant="ghost" loading={loggingOut} onClick={handleLogout}>
            Terminar sessão
          </Button>
        </div>
      </main>
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--gray-400)",
  marginBottom: "6px",
};
const card: React.CSSProperties = {
  padding: "20px 24px",
  border: "1px solid var(--gray-200)",
  borderRadius: "var(--radius-md)",
  background: "var(--gray-50)",
};
const fieldLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--gray-400)",
};
const badge: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--gray-400)",
  background: "var(--gray-200)",
  padding: "4px 10px",
  borderRadius: "99px",
  flexShrink: 0,
};
const quitBtn: React.CSSProperties = {
  padding: "7px 14px",
  border: "1px solid var(--gray-200)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--mono)",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--gray-600)",
  background: "transparent",
  cursor: "pointer",
};
const cancelQuitBtn: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid var(--green)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--mono)",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--green)",
  background: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};
const quitBanner: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px 20px",
  background: "#fdf8f0",
  border: "1px solid #e8d5a3",
  borderRadius: "var(--radius-md)",
  marginBottom: "12px",
};
const quitBannerLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#9a7a30",
  marginBottom: "4px",
};
const quitBannerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b5520",
  lineHeight: "1.5",
};
