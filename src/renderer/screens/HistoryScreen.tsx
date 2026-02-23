import React, { useEffect, useState } from "react";
import { ipc, ChallengeData } from "../lib/ipc";
import { Sidebar } from "../components/Sidebar";
import { AppScreen } from "../App";

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
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}

function DetailPanel({ challenge, onClose }: { challenge: ChallengeData; onClose: () => void }) {
  const status = challenge.status as StatusKey;
  const endDate = challenge.completedAt ?? challenge.cancelledAt ?? challenge.endsAt;

  return (
    <div style={panelStyles.overlay} onClick={onClose}>
      <div style={panelStyles.panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={panelStyles.header}>
          <div>
            <span style={{ ...panelStyles.badge, color: STATUS_COLOR[status], background: STATUS_BG[status] }}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <button onClick={onClose} style={panelStyles.closeBtn}>✕</button>
        </div>

        {/* Big number */}
        <div style={panelStyles.bigNum}>
          <span style={panelStyles.bigNumValue}>{challenge.progress.daysElapsed}</span>
          <span style={panelStyles.bigNumLabel}>dias completados de {challenge.durationDays}</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: "3px", background: "var(--gray-200)", borderRadius: "99px", overflow: "hidden", marginBottom: "28px" }}>
          <div style={{ height: "100%", width: `${Math.min(challenge.progress.percentage, 100)}%`, background: STATUS_COLOR[status], borderRadius: "99px" }} />
        </div>

        {/* Details */}
        <div style={panelStyles.details}>
          <DetailRow label="Início" value={formatDate(challenge.startedAt)} />
          <DetailRow label="Fim" value={formatDate(endDate)} />
          <DetailRow label="Duração definida" value={`${challenge.durationDays} dias`} />
          <DetailRow label="Dias aguentou" value={`${challenge.progress.daysElapsed} dias`} />
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--gray-200)" }}>
      <span style={{ fontSize: "11px", color: "var(--gray-400)", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: "12px", color: "var(--gray-800)" }}>{value}</span>
    </div>
  );
}

export function HistoryScreen({ onNavigate }: Props) {
  const [challenges, setChallenges] = useState<ChallengeData[] | null>(null);
  const [selected, setSelected] = useState<ChallengeData | null>(null);

  useEffect(() => {
    ipc.challenge.history().then(res => {
      // Filter out active challenges — history is only past ones
      const past = (res.challenges ?? []).filter(c => c.status !== "active");
      setChallenges(past);
    });
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--white)", overflow: "hidden" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />

      <Sidebar active="history" onNavigate={onNavigate} />

      {selected && <DetailPanel challenge={selected} onClose={() => setSelected(null)} />}

      <main style={{ flex: 1, padding: "52px 56px 40px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <p style={eyebrow}>Histórico</p>
        <h1 style={headline}>Desafios anteriores.</h1>

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
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "560px" }}>
            {challenges.map((c, i) => (
              <ChallengeRow
                key={c.id}
                challenge={c}
                isLast={i === challenges.length - 1}
                onClick={() => setSelected(c)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ChallengeRow({ challenge, isLast, onClick }: {
  challenge: ChallengeData; isLast: boolean; onClick: () => void;
}) {
  const status = challenge.status as StatusKey;
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", color: "var(--gray-800)" }}>
            {challenge.progress.daysElapsed} / {challenge.durationDays} dias
          </span>
          <span style={{
            fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase",
            color: STATUS_COLOR[status], background: STATUS_BG[status],
            padding: "2px 8px", borderRadius: "99px",
          }}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "var(--gray-400)" }}>
          {formatDate(challenge.startedAt)} → {formatDate(endDate)}
        </span>
      </div>
      <span style={{ fontSize: "12px", color: "var(--gray-400)" }}>→</span>
    </div>
  );
}

const eyebrow: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "6px" };
const headline: React.CSSProperties = { fontFamily: "var(--serif)", fontSize: "32px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.1 };

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
  closeBtn: {
    background: "none", border: "none", fontSize: "14px",
    color: "var(--gray-400)", cursor: "pointer", padding: "4px",
  },
  bigNum: {
    display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px",
  },
  bigNumValue: {
    fontFamily: "var(--serif)", fontSize: "48px", color: "var(--gray-800)",
    lineHeight: 1,
  },
  bigNumLabel: {
    fontSize: "11px", color: "var(--gray-400)",
    letterSpacing: "0.05em",
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
