/**
 * HistoryScreen.tsx — Quit design system
 * Localização: src/renderer/screens/HistoryScreen.tsx
 */

import React, { useEffect, useState } from "react";
import { ipc, ChallengeData } from "../lib/ipc";
import { Sidebar } from "../components/Sidebar";
import { AppScreen } from "../App";
import { CalendarView } from "../components/CalendarView";
import { useI18n } from "../lib/i18n";

interface Props { onNavigate: (screen: AppScreen) => void; }

type StatusKey = "completed" | "cancelled" | "active";

function formatDate(iso: string, lang: string) {
  const locale = lang === "pt" ? "pt-PT" : lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : lang === "it" ? "it-IT" : "en-GB";
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function frozenDays(c: ChallengeData): number {
  const start  = new Date(c.startedAt).getTime();
  const endIso = c.cancelledAt ?? c.completedAt ?? null;
  if (!endIso) return c.progress.daysElapsed;
  return Math.min(c.durationDays, Math.max(0, Math.floor((new Date(endIso).getTime() - start) / 86_400_000)));
}

function getBestStreak(cs: ChallengeData[]) { return cs.length === 0 ? 0 : Math.max(...cs.map(frozenDays)); }

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ challenge, isBest, onClose, lang }: { challenge: ChallengeData; isBest: boolean; onClose: () => void; lang: string }) {
  const { t } = useI18n();
  const status = challenge.status as StatusKey;
  const days   = frozenDays(challenge);

  const badgeColor = status === "completed" ? "#1F3D2B" : status === "cancelled" ? "#C44536" : "#6B6B6B";
  const badgeBg    = status === "completed" ? "#EBF2EE" : status === "cancelled" ? "#FDECEA" : "#F7F9F8";
  const badgeLabel = status === "completed" ? t.history.victory : status === "cancelled" ? t.history.relapse : t.history.active;

  const rows: { label: string; value: string }[] = [
    { label: t.history.start,    value: formatDate(challenge.startedAt, lang) },
    { label: t.history.duration, value: `${challenge.durationDays} ${t.common.days}` },
    { label: t.history.daysMaintained, value: `${days} ${t.common.days}` },
    ...(challenge.completedAt ? [{ label: t.history.completedOn, value: formatDate(challenge.completedAt, lang) }] : []),
    ...(challenge.cancelledAt ? [{ label: t.history.relapseOn,   value: formatDate(challenge.cancelledAt,  lang) }] : []),
    ...(!challenge.completedAt && !challenge.cancelledAt ? [{ label: t.history.expectedEnd, value: formatDate(challenge.endsAt, lang) }] : []),
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.25)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", border: "1px solid #E4EBE7", borderRadius: "10px",
        padding: "28px 32px", maxWidth: "420px", width: "90%",
        boxShadow: "0 8px 32px rgba(0,0,0,.1)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "22px", fontWeight: 700, color: "#1C1C1C" }}>{days}</span>
              <span style={{ fontSize: "13px", color: "#6B6B6B" }}>{t.history.detailDaysOf} {challenge.durationDays}</span>
              {isBest && <span style={{ fontSize: "13px" }}>🏆</span>}
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: badgeBg, color: badgeColor }}>{badgeLabel}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", color: "#6B6B6B", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Meta rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {rows.map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "#6B6B6B" }}>{r.label}</span>
              <span style={{ fontWeight: 500, color: "#1C1C1C" }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Reason */}
        {challenge.reason && (
          <div style={{ padding: "10px 12px", background: "#F7F9F8", borderLeft: "2px solid #C8D8CE", borderRadius: "0 5px 5px 0", marginBottom: "8px" }}>
            <div style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "#6B6B6B", marginBottom: "4px" }}>{t.history.reasonLabel}</div>
            <div style={{ fontSize: "12px", color: "#1C1C1C", fontStyle: "italic", lineHeight: 1.65 }}>"{challenge.reason}"</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function HistoryScreen({ onNavigate }: Props) {
  const { t, lang } = useI18n();
  const [challenges,  setChallenges]  = useState<ChallengeData[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState<"list" | "calendar">("list");
  const [detail,      setDetail]      = useState<ChallengeData | null>(null);

  useEffect(() => {
    ipc.challenge.history().then(r => { setChallenges(r.challenges ?? []); setLoading(false); });
  }, []);

  const best = getBestStreak(challenges);

  const statusLabel = (c: ChallengeData): string => {
    if (c.status === "completed") return t.history.victory;
    if (c.status === "cancelled") return t.history.relapse;
    return t.history.active;
  };

  const badgeStyle = (c: ChallengeData): React.CSSProperties => {
    if (c.status === "completed") return { background: "#EBF2EE", color: "#1F3D2B" };
    if (c.status === "cancelled") return { background: "#FDECEA", color: "#C44536" };
    return { background: "#F7F9F8", color: "#6B6B6B" };
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#F7F9F8", overflow: "hidden" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />
      <Sidebar active="history" onNavigate={onNavigate} />

      <main style={{ flex: 1, padding: "40px 44px 32px", overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "#6B8F7A", marginBottom: "6px" }}>
              {t.history.eyebrow}
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-.5px", color: "#1C1C1C" }}>
              {view === "calendar" ? t.history.calendarTitle : t.history.title}
            </div>
          </div>
          <button
            onClick={() => setView(v => v === "list" ? "calendar" : "list")}
            style={{ padding: "7px 14px", border: "1.5px solid #C8D8CE", borderRadius: "5px", fontSize: "11px", fontWeight: 600, letterSpacing: ".06em", color: "#6B6B6B", background: "transparent", cursor: "pointer", transition: "all .15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1F3D2B"; (e.currentTarget as HTMLElement).style.color = "#1F3D2B"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8D8CE"; (e.currentTarget as HTMLElement).style.color = "#6B6B6B"; }}
          >
            {view === "list" ? t.history.calendarBtn : t.history.listBtn}
          </button>
        </div>

        <div style={{ height: "1px", background: "#E4EBE7", marginBottom: "24px" }} />

        {loading ? (
          <p style={{ fontSize: "13px", color: "#6B6B6B" }}>{t.common.loading}</p>
        ) : view === "calendar" ? (
          <CalendarView challenges={challenges} bestStreak={best} />
        ) : challenges.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" as const }}>
            <p style={{ fontSize: "14px", color: "#6B6B6B" }}>{t.history.empty}</p>
            <button onClick={() => onNavigate("challenge")} style={{
              marginTop: "16px", padding: "9px 18px", border: "none", borderRadius: "5px",
              fontSize: "12px", fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase" as const,
              color: "#fff", background: "#1F3D2B", cursor: "pointer",
            }}>
              {t.create.btn}
            </button>
          </div>
        ) : (
          <>
            {/* Best streak */}
            {best > 0 && (
              <div style={{
                background: "#fff", border: "1.5px solid #1F3D2B", borderRadius: "8px",
                padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,.04)",
              }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "#6B8F7A", marginBottom: "5px" }}>
                    {t.history.bestStreak}
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "#1F3D2B", letterSpacing: "-1px", lineHeight: 1 }}>
                    {best} <span style={{ fontSize: "13px", fontWeight: 400, color: "#6B6B6B" }}>{t.common.days}</span>
                  </div>
                </div>
                <span style={{ fontSize: "24px" }}>🏆</span>
              </div>
            )}

            {/* Challenge list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {challenges.map(c => {
                const days = frozenDays(c);
                const b    = badgeStyle(c);
                return (
                  <div key={c.id} onClick={() => setDetail(c)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 0", borderBottom: "1px solid #E4EBE7", cursor: "pointer",
                    transition: "padding-left .1s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.paddingLeft = "4px"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.paddingLeft = "0"; }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1C1C1C" }}>
                          {days} / {c.durationDays} {t.common.days}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", ...b }}>
                          {statusLabel(c)}
                        </span>
                        {days === best && best > 0 && <span style={{ fontSize: "12px" }}>🏆</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6B6B6B" }}>
                        {formatDate(c.startedAt, lang)} → {formatDate(c.cancelledAt ?? c.completedAt ?? c.endsAt, lang)}
                      </div>
                    </div>
                    <span style={{ color: "#C8D8CE", fontSize: "14px" }}>›</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {detail && (
        <DetailPanel
          challenge={detail}
          isBest={frozenDays(detail) === best && best > 0}
          onClose={() => setDetail(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
