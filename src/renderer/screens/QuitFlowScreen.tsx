/**
 * QuitFlowScreen.tsx — Quit design system
 * Localização: src/renderer/screens/QuitFlowScreen.tsx
 *
 * Fluxo de abandono em 4 passos com fricção deliberada.
 * Todos os textos via useI18n().
 */

import React, { useState, useEffect, useRef } from "react";
import { ipc, ChallengeData } from "../lib/ipc";
import { useI18n } from "../lib/i18n";

interface Props {
  challenge: ChallengeData;
  onDone: (updated: ChallengeData) => void;
  onBack: () => void;
}

type Step = 1 | 2 | 3 | 4;
const DELAY_SECONDS = 15;

// ── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "32px", alignItems: "center" }}>
      {([1, 2, 3, 4] as Step[]).map(s => (
        <div key={s} style={{
          width: s === current ? "24px" : "8px",
          height: "2px",
          borderRadius: "99px",
          background: s <= current ? "#1F3D2B" : "#C8D8CE",
          transition: "all .35s ease",
          opacity: s < current ? .5 : 1,
        }} />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function QuitFlowScreen({ challenge, onDone, onBack }: Props) {
  const { t } = useI18n();
  const [step,       setStep]       = useState<Step>(1);
  const [countdown,  setCountdown]  = useState(DELAY_SECONDS);
  const [feeling,    setFeeling]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const daysElapsed = challenge.progress.daysElapsed;

  // Countdown on step 1
  useEffect(() => {
    if (step !== 1) return;
    setCountdown(DELAY_SECONDS);
    timer.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [step]);

  async function handleConfirm() {
    setSubmitting(true); setError("");
    const res = await ipc.challenge.quit(challenge.id, feeling.trim() || undefined);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    if (res.ok && res.challenge) { setStep(4); }
  }

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(28,28,28,.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 400, padding: "24px",
  };
  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "12px",
    border: "1px solid #E4EBE7",
    padding: "36px 40px", maxWidth: "460px", width: "100%",
    boxShadow: "0 12px 48px rgba(0,0,0,.12)",
    animation: "fadeUp .25s ease both",
  };
  const eyebrow: React.CSSProperties = {
    fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
    color: "#6B8F7A", marginBottom: "6px",
  };
  const headline: React.CSSProperties = {
    fontSize: "22px", fontWeight: 700, letterSpacing: "-.4px", color: "#1C1C1C", marginBottom: "12px",
  };
  const body: React.CSSProperties = {
    fontSize: "14px", color: "#6B6B6B", lineHeight: 1.7, marginBottom: "24px",
  };

  return (
    <div style={overlay} onClick={step !== 4 ? onBack : undefined}>
      <div style={card} onClick={e => e.stopPropagation()}>

        <StepDots current={step} />

        {/* ── Step 1: Confirmation ── */}
        {step === 1 && (
          <>
            <div style={eyebrow}>{t.quit.title}</div>
            <div style={headline}>{t.dash.btnQuit}</div>
            <div style={body}>
              {`${daysElapsed} ${t.common.days}`}. {t.quit.cancel}.
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
              <button onClick={onBack} style={btnGhost}>{t.quit.cancel}</button>
              <button
                onClick={() => setStep(2)}
                disabled={countdown > 0}
                style={{ ...btnDanger, opacity: countdown > 0 ? .5 : 1, cursor: countdown > 0 ? "not-allowed" : "pointer" }}
              >
                {countdown > 0 ? `${t.quit.confirm} (${countdown}s)` : t.quit.confirm}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Feeling ── */}
        {step === 2 && (
          <>
            <div style={eyebrow}>Passo 2</div>
            <div style={headline}>{t.history.feelingLabel}</div>
            <div style={body}>Escreve o que estás a sentir agora. Não há resposta certa.</div>
            <textarea
              rows={4}
              value={feeling}
              onChange={e => setFeeling(e.target.value)}
              placeholder="Escreve aqui…"
              style={{
                width: "100%", padding: "10px 12px",
                border: "1.5px solid #C8D8CE", borderRadius: "5px",
                fontSize: "13px", lineHeight: 1.65, fontFamily: "Inter, sans-serif",
                color: "#1C1C1C", background: "#F7F9F8",
                outline: "none", resize: "vertical" as const, marginBottom: "20px",
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setStep(1)} style={btnGhost}>← Voltar</button>
              <button onClick={() => setStep(3)} style={btnDanger}>{t.quit.confirm} →</button>
            </div>
          </>
        )}

        {/* ── Step 3: Show original reason ── */}
        {step === 3 && (
          <>
            <div style={eyebrow}>Passo 3</div>
            <div style={headline}>{t.dash.reasonLabel}</div>
            <div style={body}>Isto foi o que escreveste quando começaste.</div>
            <div style={{ padding: "14px 16px", background: "#EBF2EE", borderLeft: "2px solid #1F3D2B", borderRadius: "0 5px 5px 0", marginBottom: "24px" }}>
              <div style={{ fontSize: "13px", color: "#1F3D2B", fontStyle: "italic", lineHeight: 1.7 }}>
                "{challenge.reason}"
              </div>
            </div>
            {error && <p style={{ fontSize: "12px", color: "#C44536", marginBottom: "12px" }}>{error}</p>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setStep(2)} style={btnGhost}>← Voltar</button>
              <button onClick={handleConfirm} disabled={submitting} style={{ ...btnDanger, opacity: submitting ? .7 : 1 }}>
                {submitting ? "…" : t.quit.confirm}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Done ── */}
        {step === 4 && (
          <>
            <div style={eyebrow}>Registado</div>
            <div style={headline}>Abandon registado.</div>
            <div style={body}>O desbloqueio ocorre em 24 horas. Podes cancelar em qualquer altura.</div>
            <button onClick={onBack} style={btnPrimary}>Voltar ao estado</button>
          </>
        )}
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "9px 18px", border: "1.5px solid #C8D8CE", borderRadius: "5px",
  fontSize: "12px", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase",
  color: "#6B6B6B", background: "transparent", cursor: "pointer", transition: "all .15s",
};
const btnDanger: React.CSSProperties = {
  padding: "9px 18px", border: "1.5px solid #f5c5c0", borderRadius: "5px",
  fontSize: "12px", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase",
  color: "#C44536", background: "#FDECEA", cursor: "pointer", transition: "all .15s",
};
const btnPrimary: React.CSSProperties = {
  padding: "10px 22px", border: "none", borderRadius: "5px",
  fontSize: "12px", fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase",
  color: "#fff", background: "#1F3D2B", cursor: "pointer",
};
