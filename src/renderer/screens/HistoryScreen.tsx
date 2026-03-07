import React, { useEffect, useState } from "react";
import { ipc, ChallengeData } from "../lib/ipc";
import { Sidebar } from "../components/Sidebar";
import { AppScreen } from "../App";
import { CalendarView } from "../components/CalendarView";

interface Props {
  onNavigate: (screen: AppScreen) => void;
}

type StatusKey = "completed" | "cancelled" | "active";

const STATUS_LABEL: Record<StatusKey, string> = {
  completed: "Completado",
  cancelled: "Recaída",
  active: "Ativo",
};

const STATUS_COLOR: Record<StatusKey, string> = {
  completed: "var(--green)",
  cancelled: "var(--red-muted)",
  active: "var(--gray-400)",
};

const STATUS_BG: Record<StatusKey, string> = {
  completed: "var(--green-subtle)",
  cancelled: "#fdf0f0",
  active: "var(--gray-100)",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Best streak helpers ────────────────────────────────────────────────────────

/**
 * Returns the true days elapsed, frozen at the moment the challenge ended.
 * The backend's daysElapsed is calculated from `now - startedAt`, so a
 * challenge cancelled on day 1 that started 8 days ago incorrectly shows 8.
 * We recalculate using cancelledAt / completedAt as the end boundary.
 */
function frozenDays(c: ChallengeData): number {
  const start = new Date(c.startedAt).getTime();
  const endIso = c.cancelledAt ?? c.completedAt ?? null;
  // Active challenges: use live elapsed from backend
  if (!endIso) return c.progress.daysElapsed;
  const end = new Date(endIso).getTime();
  return Math.min(
    c.durationDays,
    Math.max(0, Math.floor((end - start) / 86_400_000)),
  );
}

function getBestStreak(challenges: ChallengeData[]): number {
  if (challenges.length === 0) return 0;
  return Math.max(...challenges.map(c => frozenDays(c)));
}

function isBestStreak(challenge: ChallengeData, best: number): boolean {
  return best > 0 && frozenDays(challenge) === best;
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  challenge,
  isBest,
  onClose,
}: {
  challenge: ChallengeData;
  isBest: boolean;
  onClose: () => void;
}) {
  const status  = challenge.status as StatusKey;

  return (
    <div style={panelStyles.overlay} onClick={onClose}>
      <div style={panelStyles.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={panelStyles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              ...panelStyles.badge,
              color: STATUS_COLOR[status],
              background: STATUS_BG[status],
            }}>
              {STATUS_LABEL[status]}
            </span>
            {isBest && (
              <span style={panelStyles.bestBadge}>
                melhor streak
              </span>
            )}
          </div>
          <button onClick={onClose} style={panelStyles.closeBtn}>✕</button>
        </div>

        {/* Big number */}
        <div style={panelStyles.bigNum}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{
              ...panelStyles.bigNumValue,
              color: isBest ? "var(--green)" : "var(--gray-800)",
            }}>
              {frozenDays(challenge)}
            </span>
            {isBest && (
              <span style={{ fontSize: "20px", lineHeight: 1 }}>🏆</span>
            )}
          </div>
          <span style={panelStyles.bigNumLabel}>
            dias completados de {challenge.durationDays}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: "3px",
          background: "var(--gray-200)",
          borderRadius: "99px",
          overflow: "hidden",
          marginBottom: "28px",
        }}>
          <div style={{
            height: "100%",
            width: `${Math.min(challenge.progress.percentage, 100)}%`,
            background: isBest ? "var(--green)" : STATUS_COLOR[status],
            borderRadius: "99px",
          }} />
        </div>

        {/* Details */}
        <div style={panelStyles.details}>
          <DetailRow label="Início"           value={formatDate(challenge.startedAt)} />
          <DetailRow label="Fim previsto"      value={formatDate(challenge.endsAt)} />
          {challenge.completedAt && (
            <DetailRow label="Completado em" value={formatDate(challenge.completedAt)} highlight="green" />
          )}
          {challenge.cancelledAt && (
            <DetailRow label="Recaída em" value={formatDate(challenge.cancelledAt)} highlight="red" />
          )}
          <DetailRow label="Duração definida" value={`${challenge.durationDays} dias`} />
          <DetailRow label="Dias aguentou"    value={`${frozenDays(challenge)} dias`} />
        </div>

        <div style={panelStyles.divider} />

        {/* Reason */}
        <div>
          <p style={panelStyles.sectionLabel}>Motivo</p>
          <p style={panelStyles.reasonText}>"{challenge.reason}"</p>
        </div>

        {/* Quit request info if cancelled */}
        {challenge.status === "cancelled" && challenge.quitRequest && (
          <>
            <div style={panelStyles.divider} />
            <div>
              <p style={panelStyles.sectionLabel}>O que sentias</p>
              <p style={panelStyles.reasonText}>"{challenge.quitRequest.feeling}"</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }: {
  label: string;
  value: string;
  highlight?: "green" | "red";
}) {
  const valueColor = highlight === "green"
    ? "var(--green)"
    : highlight === "red"
      ? "var(--red-muted)"
      : "var(--gray-800)";
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid var(--gray-200)",
    }}>
      <span style={{ fontSize: "11px", color: "var(--gray-400)", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: "12px", color: valueColor }}>{value}</span>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function HistoryScreen({ onNavigate }: Props) {
  const [challenges, setChallenges] = useState<ChallengeData[] | null>(null);
  const [selected, setSelected]     = useState<ChallengeData | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    ipc.challenge.history().then(res => {
      const past = (res.challenges ?? []).filter(c => c.status !== "active");
      setChallenges(past);
    });
  }, []);

  const best = challenges ? getBestStreak(challenges) : 0;
  const bestChallenge = challenges?.find(c => isBestStreak(c, best)) ?? null;

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--white)", overflow: "hidden" }}>
      <div className="drag-region" style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10,
      }} />

      <Sidebar active="history" onNavigate={onNavigate} />

      {selected && (
        <DetailPanel
          challenge={selected}
          isBest={isBestStreak(selected, best)}
          onClose={() => setSelected(null)}
        />
      )}

      {showCalendar && challenges && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 150,
            background: "rgba(0,0,0,0.08)",
            backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowCalendar(false)}
        >
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--gray-200)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.12)",
              padding: "32px 36px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "4px" }}>
                  Histórico visual
                </p>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--gray-800)", fontWeight: 400 }}>
                  Calendário de actividade
                </h2>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                style={{
                  background: "none", border: "none",
                  color: "var(--gray-400)", cursor: "pointer",
                  fontSize: "16px", padding: "4px 8px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <CalendarView challenges={challenges} bestStreak={best} />
          </div>
        </div>
      )}

      <main style={{
        flex: 1, padding: "52px 56px 40px",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <p style={eyebrow}>Histórico</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0" }}>
          <h1 style={headline}>Desafios anteriores.</h1>
          {challenges && challenges.length > 0 && (
            <button
              onClick={() => setShowCalendar(true)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px",
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--mono)",
                fontSize: "10px", letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--gray-600)", background: "transparent",
                cursor: "pointer", flexShrink: 0,
                marginBottom: "4px",
              }}
            >
              <span style={{ fontSize: "13px", lineHeight: 1 }}>📅</span>
              Calendário
            </button>
          )}
        </div>

        <div style={{ height: "1px", background: "var(--gray-200)", margin: "24px 0 32px" }} />

        {challenges === null ? (
          <p style={{ fontSize: "12px", color: "var(--gray-400)" }}>A carregar...</p>
        ) : challenges.length === 0 ? (
          <div style={{ padding: "40px 0" }}>
            <p style={{ fontSize: "12px", color: "var(--gray-400)", lineHeight: "1.8" }}>
              Ainda não tens desafios concluídos.<br />
              Completa o teu primeiro desafio para o veres aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Best streak summary card */}
            {best > 0 && (
              <div
                style={{ ...bestCard, cursor: bestChallenge ? "pointer" : "default" }}
                onClick={() => bestChallenge && setSelected(bestChallenge)}
              >
                <div>
                  <p style={bestCardLabel}>Melhor streak</p>
                  <p style={bestCardDays}>
                    {best} dia{best !== 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>🏆</span>
                  {bestChallenge && (
                    <span style={{ fontSize: "12px", color: "var(--green)", opacity: 0.6 }}>→</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", maxWidth: "560px" }}>
              {challenges.map((c, i) => (
                <ChallengeRow
                  key={c.id}
                  challenge={c}
                  isBest={isBestStreak(c, best)}
                  isLast={i === challenges.length - 1}
                  onClick={() => setSelected(c)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function ChallengeRow({
  challenge,
  isBest,
  isLast,
  onClick,
}: {
  challenge: ChallengeData;
  isBest: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const status  = challenge.status as StatusKey;
  const endDate = challenge.completedAt ?? challenge.cancelledAt ?? challenge.endsAt;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 0",
        borderBottom: isLast ? "none" : "1px solid var(--gray-200)",
        cursor: "pointer",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: isBest ? "var(--green)" : "var(--gray-800)", fontWeight: isBest ? 500 : 400 }}>
            {frozenDays(challenge)} / {challenge.durationDays} dias
          </span>
          <span style={{
            fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase",
            color: STATUS_COLOR[status], background: STATUS_BG[status],
            padding: "2px 8px", borderRadius: "99px",
          }}>
            {STATUS_LABEL[status]}
          </span>
          {isBest && (
            <span style={{ fontSize: "13px", lineHeight: 1 }} title="Melhor streak">🏆</span>
          )}
        </div>
        <span style={{ fontSize: "11px", color: "var(--gray-400)" }}>
          {formatDate(challenge.startedAt)} → {formatDate(endDate)}
        </span>
      </div>
      <span style={{ fontSize: "12px", color: "var(--gray-400)" }}>→</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const eyebrow: React.CSSProperties = {
  fontSize: "10px", letterSpacing: "0.2em",
  textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "6px",
};
const headline: React.CSSProperties = {
  fontFamily: "var(--serif)", fontSize: "32px",
  color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.1,
};

// Best streak summary card (above the list)
const bestCard: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "16px 20px",
  background: "var(--green-subtle)",
  border: "1px solid var(--green)",
  borderRadius: "var(--radius-md)",
  marginBottom: "24px",
  maxWidth: "560px",
};
const bestCardLabel: React.CSSProperties = {
  fontSize: "10px", letterSpacing: "0.18em",
  textTransform: "uppercase", color: "var(--green)",
  marginBottom: "4px",
};
const bestCardDays: React.CSSProperties = {
  fontFamily: "var(--serif)", fontSize: "28px",
  color: "var(--green)", lineHeight: 1,
};

const panelStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.08)",
    display: "flex", justifyContent: "flex-end",
  },
  panel: {
    width: "360px", height: "100%",
    background: "var(--white)",
    borderLeft: "1px solid var(--gray-200)",
    padding: "48px 32px 40px",
    overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "0",
    boxShadow: "-8px 0 32px rgba(0,0,0,0.06)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "28px",
  },
  badge: {
    fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase",
    padding: "4px 10px", borderRadius: "99px",
  },
  bestBadge: {
    fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase",
    padding: "4px 10px", borderRadius: "99px",
    color: "var(--green)", background: "var(--green-subtle)",
    border: "1px solid var(--green)",
  },
  closeBtn: {
    background: "none", border: "none", fontSize: "14px",
    color: "var(--gray-400)", cursor: "pointer", padding: "4px",
  },
  bigNum: {
    display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px",
  },
  bigNumValue: {
    fontFamily: "var(--serif)", fontSize: "48px",
    lineHeight: 1,
  },
  bigNumLabel: {
    fontSize: "11px", color: "var(--gray-400)", letterSpacing: "0.05em",
  },
  details: { marginBottom: "24px" },
  divider: { height: "1px", background: "var(--gray-200)", margin: "24px 0" },
  sectionLabel: {
    fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
    color: "var(--gray-400)", marginBottom: "10px",
  },
  reasonText: {
    fontSize: "12px", color: "var(--gray-600)", lineHeight: "1.7", fontStyle: "italic",
  },
};
