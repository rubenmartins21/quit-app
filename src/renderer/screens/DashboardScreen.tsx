/**
 * DashboardScreen.tsx — Quit design system
 * Localização: src/renderer/screens/DashboardScreen.tsx
 */

import React, { useEffect, useState, useRef } from "react";
import { ipc, ChallengeData, BlockerStatus } from "../lib/ipc";
import { Sidebar } from "../components/Sidebar";
import { QuitFlowScreen } from "./QuitFlowScreen";
import { AddBlockedUrlCard } from "../components/AddBlockedUrlCard";
import { AppScreen } from "../App";
import { useI18n } from "../lib/i18n";

interface Props {
  user: { id: string; email: string };
  onNavigate: (screen: AppScreen) => void;
}

// ── Live elapsed timer ────────────────────────────────────────────────────────

interface Elapsed { lessThanOneDay: boolean; days: number; hours: number; minutes: number; seconds: number; }
function computeElapsed(startedAt: string): Elapsed {
  const total = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return {
    lessThanOneDay: total < 86400,
    days:    Math.floor(total / 86400),
    hours:   Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
function pad(n: number) { return String(n).padStart(2, "0"); }

function useLiveElapsed(startedAt?: string): Elapsed | null {
  const [e, setE] = useState<Elapsed | null>(startedAt ? computeElapsed(startedAt) : null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!startedAt) { setE(null); return; }
    function tick() {
      const next = computeElapsed(startedAt!);
      setE(next);
      tRef.current = setTimeout(tick, next.lessThanOneDay ? 1000 : 60_000);
    }
    tick();
    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [startedAt]);
  return e;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DashboardScreen({ user, onNavigate }: Props) {
  const { t } = useI18n();
  const [challenge,      setChallenge]      = useState<ChallengeData | null | undefined>(undefined);
  const [blockerStatus,  setBlockerStatus]  = useState<BlockerStatus | null>(null);
  const [showQuitFlow,   setShowQuitFlow]   = useState(false);
  const [cancellingQuit, setCancellingQuit] = useState(false);

  const elapsed        = useLiveElapsed(challenge?.startedAt);
  const blockerActive  = blockerStatus?.active ?? false;
  const qr             = challenge?.quitRequest;
  const hasPendingQuit = qr?.status === "pending";

  useEffect(() => {
    ipc.challenge.active().then(r => setChallenge(r.challenge ?? null));
    ipc.blocker.status().then(setBlockerStatus);
  }, []);

  async function handleCancelQuit() {
    if (!challenge) return;
    setCancellingQuit(true);
    const r = await ipc.challenge.quitRequest.cancel(challenge.id);
    if (r.ok && r.challenge) setChallenge(r.challenge);
    setCancellingQuit(false);
  }

  // Streak display
  function renderStreak() {
    if (!challenge || !elapsed) {
      if (challenge) return (
        <>
          <div style={S.bigNum}>—</div>
          <div style={S.bigSub}>{t.common.loading}</div>
        </>
      );
      return (
        <>
          <div style={{ ...S.bigNum, fontSize: "36px" }}>—</div>
          <div style={S.bigSub}>{user.email}</div>
        </>
      );
    }
    if (elapsed.lessThanOneDay) {
      const ts = elapsed.hours > 0
        ? `${elapsed.hours}:${pad(elapsed.minutes)}:${pad(elapsed.seconds)}`
        : `${elapsed.minutes}:${pad(elapsed.seconds)}`;
      return (
        <>
          <div style={{ ...S.bigNum, fontSize: "64px" }}>{ts}</div>
          <div style={S.bigSub}>{elapsed.hours > 0 ? "h · min · s" : "min · s"}</div>
        </>
      );
    }
    return (
      <>
        <div style={{ ...S.bigNum, opacity: hasPendingQuit ? .4 : 1 }}>{elapsed.days}</div>
        <div style={S.bigSub}>{t.dash.streakLabel}</div>
      </>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "#F7F9F8", overflow: "hidden" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />

      <Sidebar active="dashboard" onNavigate={onNavigate} />

      {showQuitFlow && challenge && (
        <QuitFlowScreen
          challenge={challenge}
          onDone={u => { setChallenge(u); setShowQuitFlow(false); }}
          onBack={() => setShowQuitFlow(false)}
        />
      )}

      <main style={{ flex: 1, padding: "40px 44px 32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div>
          <div style={S.eyebrow}>{t.dash.eyebrow}</div>
          {renderStreak()}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#E4EBE7" }} />

        {/* Content */}
        {challenge === undefined ? (
          <Card><p style={{ fontSize: "13px", color: "#6B6B6B" }}>{t.common.loading}</p></Card>
        ) : challenge ? (
          <>
            {/* Pending quit banner */}
            {hasPendingQuit && (
              <div style={S.quitBanner}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "#C44536", marginBottom: "4px" }}>
                    {t.quit.title}
                  </div>
                  <div style={{ fontSize: "13px", color: "#1C1C1C", lineHeight: 1.6 }}>
                    {t.common.loading} {qr!.hoursRemaining > 0 ? `${qr!.hoursRemaining}h` : `${qr!.minutesRemaining} min`}
                  </div>
                </div>
                <button onClick={handleCancelQuit} disabled={cancellingQuit} style={S.cancelBtn}>
                  {cancellingQuit ? "…" : t.quit.cancel}
                </button>
              </div>
            )}

            {/* Progress card */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <div style={S.cardLabel}>{t.dash.progress}</div>
                  <div style={S.cardVal}>
                    {challenge.progress.daysElapsed}
                    <span style={{ fontSize: "14px", fontWeight: 400, color: "#6B6B6B" }}> / {challenge.durationDays} {t.common.days}</span>
                  </div>
                </div>
                <span style={S.badge}>{t.dash.daysLeft(challenge.progress.daysRemaining)}</span>
              </div>
              <div style={{ height: "3px", background: "#E4EBE7", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(challenge.progress.percentage, 100)}%`, background: "#1F3D2B", borderRadius: "99px", transition: "width .8s ease" }} />
              </div>
            </Card>

            {/* Reason card */}
            <Card>
              <div style={S.cardLabel}>{t.dash.reasonLabel}</div>
              <div style={{ fontSize: "13px", color: "#444", lineHeight: 1.7, fontStyle: "italic", paddingLeft: "12px", borderLeft: "2px solid #C8D8CE", marginTop: "8px" }}>
                "{challenge.reason}"
              </div>
              <div style={{ fontSize: "11px", color: "#6B6B6B", marginTop: "10px" }}>
                {t.dash.started(new Date(challenge.startedAt).toLocaleDateString())}
                {" · "}{challenge.durationDays} {t.common.days}
              </div>
            </Card>

            {/* Actions */}
            {!hasPendingQuit && (
              <div>
                <button style={S.btnQuit} onClick={() => setShowQuitFlow(true)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C44536"; (e.currentTarget as HTMLElement).style.color = "#C44536"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8D8CE"; (e.currentTarget as HTMLElement).style.color = "#6B6B6B"; }}
                >
                  {t.dash.btnQuit}
                </button>
              </div>
            )}

            {/* Blocker status */}
            {blockerActive && blockerStatus && (
              <div>
                <AddBlockedUrlCard blockerStatus={blockerStatus} onUpdated={() => ipc.blocker.status().then(setBlockerStatus)} />
              </div>
            )}
          </>
        ) : (
          /* No active challenge */
          <Card dashed>
            <div style={S.cardLabel}>{t.dash.noChallenge}</div>
            <p style={{ fontSize: "13px", color: "#6B6B6B", lineHeight: 1.7, margin: "8px 0 20px" }}>
              {t.dash.noChallengeDesc}
            </p>
            <button style={S.btnPrimary} onClick={() => onNavigate("challenge")}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#173222"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1F3D2B"; }}
            >
              {t.create.btn}
            </button>
          </Card>
        )}

        {/* Blocker inactive notice */}
        {!blockerActive && challenge && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={S.cardLabel}>{t.dash.blockerName}</div>
              <span style={{ ...S.badge, background: "#FFF3E0", color: "#E65100" }}>OFF</span>
            </div>
          </Card>
        )}

        <div style={{ flex: 1 }} />

        {/* Blocker active bar */}
        {blockerActive && (
          <div style={S.blockerBar}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={S.dot} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#1C1C1C" }}>{t.dash.blockerName}</div>
                <div style={{ fontSize: "11px", color: "#6B6B6B", marginTop: "1px" }}>
                  {t.dash.blockerSub(
                    (blockerStatus?.blockedUrls?.length ?? 0) +
                    (blockerStatus?.blockReddit  ? 1 : 0) +
                    (blockerStatus?.blockTwitter ? 1 : 0)
                  )}
                </div>
              </div>
            </div>
            <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "#1F3D2B", background: "#EBF2EE", border: "1px solid #C8D8CE", padding: "4px 12px", borderRadius: "99px" }}>
              {t.dash.blockerActive}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ children, dashed }: { children: React.ReactNode; dashed?: boolean }) {
  return (
    <div style={{
      background: "#fff",
      border: `1.5px ${dashed ? "dashed" : "solid"} #E4EBE7`,
      borderRadius: "8px",
      padding: "18px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,.04)",
    }}>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  eyebrow: {
    fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
    color: "#6B8F7A", marginBottom: "8px",
  },
  bigNum: {
    fontSize: "96px", fontWeight: 700, letterSpacing: "-4px", color: "#1C1C1C", lineHeight: 1,
    animation: "fadeUp .4s ease both",
  },
  bigSub: {
    fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em",
    color: "#6B6B6B", marginTop: "6px",
    animation: "fadeUp .4s ease .06s both",
  },
  cardLabel: {
    fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B6B6B", marginBottom: "6px",
  },
  cardVal: {
    fontSize: "22px", fontWeight: 700, color: "#1C1C1C",
  },
  badge: {
    fontSize: "10px", fontWeight: 600, padding: "4px 10px",
    borderRadius: "99px", background: "#EBF2EE", color: "#1F3D2B",
    whiteSpace: "nowrap",
  },
  quitBanner: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px",
    padding: "16px 18px",
    background: "#FDECEA", border: "1px solid #f5c5c0", borderRadius: "8px",
  },
  cancelBtn: {
    padding: "7px 14px", border: "1px solid #f5c5c0", borderRadius: "5px",
    fontSize: "11px", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase",
    color: "#C44536", background: "transparent", cursor: "pointer", flexShrink: 0,
    transition: "all .15s",
  },
  btnQuit: {
    padding: "8px 16px",
    border: "1.5px solid #C8D8CE", borderRadius: "5px",
    fontSize: "11px", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase",
    color: "#6B6B6B", background: "transparent", cursor: "pointer",
    transition: "all .15s",
  },
  btnPrimary: {
    padding: "10px 20px",
    border: "none", borderRadius: "5px",
    fontSize: "12px", fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase",
    color: "#fff", background: "#1F3D2B", cursor: "pointer",
    transition: "background .15s",
  },
  blockerBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 0", borderTop: "1px solid #E4EBE7",
  },
  dot: {
    width: "7px", height: "7px", borderRadius: "50%",
    background: "#1F3D2B", boxShadow: "0 0 0 3px rgba(31,61,43,.15)",
    flexShrink: 0,
    animation: "pulse 2.5s ease-in-out infinite",
  },
};
