import React, { useState, useEffect, useRef } from "react";
import { ipc, ChallengeData } from "../lib/ipc";
import { Button, ErrorMsg } from "../components/ui";

interface Props {
  challenge: ChallengeData;
  onDone: (updated: ChallengeData) => void;
  onBack: () => void;
}

type Step = 1 | 2 | 3 | 4;

const DELAY_SECONDS = 15;

// Texts shown instead of mascot
const STEP_VOICES: Record<Step, string> = {
  1: `Tens a certeza? Fizeste ${0} dias. Este momento vai passar.`,
  2: "Escreve o que estás a sentir agora mesmo. Não há resposta certa.",
  3: "Isto foi o que disseste quando começaste.",
  4: "Registámos a tua decisão. O desbloqueio ocorre em 24 horas. Podes cancelar a qualquer momento.",
};

function StepDots({ current }: { current: Step }) {
  return (
    <div style={{ display: "flex", gap: "6px", marginBottom: "32px" }}>
      {([1, 2, 3, 4] as Step[]).map(s => (
        <div key={s} style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: s < current ? "var(--green-light)" : s === current ? "var(--green)" : "var(--gray-200)",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

export function QuitFlowScreen({ challenge, onDone, onBack }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [countdown, setCountdown] = useState(DELAY_SECONDS);
  const [feeling, setFeeling] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 1 countdown
  useEffect(() => {
    if (step !== 1) return;
    setCountdown(DELAY_SECONDS);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [step]);

  async function handleFinalConfirm() {
    setError("");
    setLoading(true);
    const res = await ipc.challenge.quitRequest.create(challenge.id, feeling.trim());
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.ok && res.challenge) onDone(res.challenge);
  }

  const voiceText = STEP_VOICES[step].replace("${0}", String(challenge.progress.daysElapsed));

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>

        {/* Step dots */}
        <StepDots current={step} />

        {/* Voice text (replaces mascot) */}
        <div style={styles.voiceBox}>
          <p style={styles.voiceText}>{voiceText}</p>
        </div>

        {/* ── STEP 1: Countdown ── */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Espera {DELAY_SECONDS} segundos.</h2>
            <p style={styles.stepSub}>
              Não estamos a bloquear nada. Apenas a criar fricção.<br />
              Se ainda quiseres continuar ao fim do tempo, podes.
            </p>
            <div style={styles.countdownWrap}>
              <span style={{ ...styles.countdownNum, opacity: countdown === 0 ? 0.3 : 1 }}>
                {countdown}
              </span>
              <span style={styles.countdownLabel}>segundos</span>
            </div>
            <div style={styles.btnRow}>
              <button onClick={onBack} style={styles.ghostBtn}>← Voltar ao desafio</button>
              <button
                onClick={() => setStep(2)}
                disabled={countdown > 0}
                style={{ ...styles.nextBtn, opacity: countdown > 0 ? 0.3 : 1, cursor: countdown > 0 ? "not-allowed" : "pointer" }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Escrita consciente ── */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>O que sentes agora mesmo?</h2>
            <p style={styles.stepSub}>Escreve. Não há resposta certa. Ninguém vai ler isto.</p>
            <textarea
              value={feeling}
              onChange={e => setFeeling(e.target.value)}
              placeholder="Descreve o que estás a sentir..."
              rows={4}
              maxLength={1000}
              autoFocus
              style={styles.textarea}
              onFocus={e => e.currentTarget.style.borderColor = "var(--green)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--gray-200)"}
            />
            <p style={{ fontSize: "10px", color: "var(--gray-400)", textAlign: "right", marginBottom: "20px" }}>{feeling.length}/1000</p>
            <div style={styles.btnRow}>
              <button onClick={() => setStep(1)} style={styles.ghostBtn}>← Voltar</button>
              <button
                onClick={() => setStep(3)}
                disabled={feeling.trim().length < 5}
                style={{ ...styles.nextBtn, opacity: feeling.trim().length < 5 ? 0.3 : 1, cursor: feeling.trim().length < 5 ? "not-allowed" : "pointer" }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confronto racional ── */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>O teu motivo original.</h2>
            <p style={styles.stepSub}>Isto foi o que escreveste quando criaste este desafio.</p>
            <div style={styles.reasonBox}>
              <p style={styles.reasonText}>"{challenge.reason}"</p>
            </div>
            <p style={{ fontSize: "12px", color: "var(--gray-400)", lineHeight: "1.7", marginBottom: "24px" }}>
              Ainda assim queres desistir?
            </p>
            <div style={styles.btnRow}>
              <button onClick={() => setStep(2)} style={styles.ghostBtn}>← Voltar</button>
              <button onClick={() => setStep(4)} style={styles.nextBtn}>Sim, quero desistir →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirmação final ── */}
        {step === 4 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Última confirmação.</h2>
            <p style={styles.stepSub}>
              O bloqueio mantém-se ativo durante 24 horas.<br />
              Podes cancelar a desistência a qualquer momento nesse período.
            </p>
            <div style={styles.warningBox}>
              <p style={styles.warningLabel}>O que acontece agora</p>
              <p style={styles.warningText}>
                — Desistência registada<br />
                — Desbloqueio em 24 horas<br />
                — Podes cancelar antes das 24h<br />
                — Após 24h: recaída registada, streak perdido
              </p>
            </div>
            <ErrorMsg message={error} />
            <div style={styles.btnRow}>
              <button onClick={() => setStep(3)} style={styles.ghostBtn}>← Voltar</button>
              <Button
                variant="danger"
                loading={loading}
                style={{ width: "auto", padding: "10px 20px" }}
                onClick={handleFinalConfirm}
              >
                Confirmar desistência
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(26,61,43,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100,
    backdropFilter: "blur(2px)",
  },
  panel: {
    background: "var(--white)",
    borderRadius: "var(--radius-lg)",
    padding: "40px 48px",
    width: "560px",
    maxWidth: "90vw",
    boxShadow: "0 8px 48px rgba(0,0,0,0.12)",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  voiceBox: {
    background: "var(--gray-50)",
    borderLeft: "2px solid var(--gray-200)",
    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
    padding: "12px 16px",
    marginBottom: "28px",
  },
  voiceText: { fontSize: "12px", color: "var(--gray-600)", lineHeight: "1.7", fontStyle: "italic" },
  stepContent: { display: "flex", flexDirection: "column" },
  stepTitle: { fontFamily: "var(--serif)", fontSize: "24px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.2, marginBottom: "8px" },
  stepSub: { fontSize: "12px", color: "var(--gray-400)", lineHeight: "1.7", marginBottom: "24px" },
  countdownWrap: { display: "flex", flexDirection: "column", alignItems: "center", margin: "8px 0 32px" },
  countdownNum: { fontFamily: "var(--serif)", fontSize: "64px", color: "var(--green)", lineHeight: 1, transition: "opacity 0.3s" },
  countdownLabel: { fontSize: "10px", color: "var(--gray-400)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "4px" },
  textarea: {
    padding: "12px 14px", border: "1px solid var(--gray-200)",
    borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)",
    fontSize: "12px", color: "var(--gray-800)", background: "var(--white)",
    outline: "none", resize: "none", width: "100%", lineHeight: "1.6",
    transition: "border-color 0.15s", marginBottom: "8px",
  },
  reasonBox: {
    background: "var(--green-subtle)", borderLeft: "2px solid var(--green)",
    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
    padding: "16px 18px", marginBottom: "20px",
  },
  reasonText: { fontSize: "13px", color: "var(--green)", lineHeight: "1.7", fontStyle: "italic" },
  warningBox: {
    background: "var(--gray-50)", border: "1px solid var(--gray-200)",
    borderRadius: "var(--radius-sm)", padding: "16px 18px", marginBottom: "20px",
  },
  warningLabel: { fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "10px" },
  warningText: { fontSize: "12px", color: "var(--gray-600)", lineHeight: "2" },
  btnRow: { display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between" },
  ghostBtn: {
    padding: "9px 16px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)",
    fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.08em",
    color: "var(--gray-600)", background: "transparent", cursor: "pointer",
  },
  nextBtn: {
    padding: "9px 16px", border: "1px solid var(--green)", borderRadius: "var(--radius-sm)",
    fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.08em",
    color: "var(--green)", background: "transparent", cursor: "pointer", transition: "opacity 0.2s",
  },
};
