/**
 * UninstallScreen — ecrã de fricção mostrado quando o app é lançado
 * com a flag --uninstall (via UninstallString override no registry).
 *
 * Fluxo:
 *   1. Pergunta o motivo da desinstalação
 *   2. Mostra mensagem contextual baseada no motivo
 *   3. Se confirmar → chama ipc.app.confirmUninstall() → Electron corre
 *      o uninstaller real e fecha
 *   4. Se cancelar → fecha a janela (app continua instalado)
 */

import { useState } from "react";

type Step = "reason" | "confirm";

const REASONS = [
  { id: "not_working",  label: "Não está a funcionar correctamente" },
  { id: "too_hard",     label: "O desafio é demasiado difícil" },
  { id: "reinstall",    label: "Vou reinstalar" },
  { id: "dont_need",    label: "Já não preciso" },
  { id: "other",        label: "Outro motivo" },
] as const;

type ReasonId = typeof REASONS[number]["id"];

const MESSAGES: Record<ReasonId, { title: string; body: string; cta: string }> = {
  not_working: {
    title: "Vamos tentar resolver",
    body: "Se há algo que não está a funcionar, podemos ajudar. Muitas vezes é uma configuração simples. Tens a certeza que queres desinstalar em vez de resolver o problema?",
    cta: "Desinstalar mesmo assim",
  },
  too_hard: {
    title: "A dificuldade faz parte",
    body: "Sentir que é difícil é exactamente o momento em que o desafio tem mais valor. A maioria das pessoas que desinstala neste momento arrepende-se passado pouco tempo. Queres mesmo desistir agora?",
    cta: "Sim, desinstalar",
  },
  reinstall: {
    title: "Sem problema",
    body: "Se vais reinstalar, o bloqueio será removido automaticamente. Podes reinstalar a qualquer momento e continuar o teu progresso.",
    cta: "Confirmar desinstalação",
  },
  dont_need: {
    title: "Tens a certeza?",
    body: "O Quit funciona em segundo plano e não interfere com o teu uso normal. Podes simplesmente fechar a janela e deixá-lo instalado para quando precisares.",
    cta: "Desinstalar mesmo assim",
  },
  other: {
    title: "Lamentamos ver-te partir",
    body: "Se houver alguma forma de melhorarmos, o teu feedback é valioso. Tens a certeza que queres desinstalar?",
    cta: "Confirmar desinstalação",
  },
};

export default function UninstallScreen() {
  const [step, setStep]         = useState<Step>("reason");
  const [reason, setReason]     = useState<ReasonId | null>(null);
  const [loading, setLoading]   = useState(false);

  const msg = reason ? MESSAGES[reason] : null;

  async function handleUninstall() {
    setLoading(true);
    await (window as any).quit?.app?.confirmUninstall?.();
    // O Electron fecha a janela e corre o uninstaller real — não volta aqui
  }

  function handleCancel() {
    (window as any).quit?.app?.cancelUninstall?.();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--gray-50, #fafaf9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      fontFamily: "var(--sans, system-ui)",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{
          fontFamily: "var(--serif, Georgia, serif)",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--gray-800, #1c1917)",
          marginBottom: 40,
          letterSpacing: "-0.5px",
        }}>
          Quit
        </div>

        {step === "reason" && (
          <>
            <h1 style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--gray-800, #1c1917)",
              margin: "0 0 8px",
              letterSpacing: "-0.3px",
            }}>
              Porque queres desinstalar?
            </h1>
            <p style={{
              fontSize: 13,
              color: "var(--gray-400, #a8a29e)",
              margin: "0 0 28px",
              lineHeight: 1.5,
            }}>
              A tua resposta ajuda-nos a melhorar.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
              {REASONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md, 8px)",
                    border: `1.5px solid ${reason === r.id ? "var(--gray-800, #1c1917)" : "var(--gray-200, #e7e5e4)"}`,
                    background: reason === r.id ? "var(--gray-800, #1c1917)" : "white",
                    color: reason === r.id ? "white" : "var(--gray-800, #1c1917)",
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "var(--sans, system-ui)",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1.5px solid var(--gray-200, #e7e5e4)",
                  background: "white",
                  color: "var(--gray-600, #57534e)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "var(--sans, system-ui)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => reason && setStep("confirm")}
                disabled={!reason}
                style={{
                  flex: 2,
                  padding: "11px 0",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "none",
                  background: reason ? "var(--gray-800, #1c1917)" : "var(--gray-200, #e7e5e4)",
                  color: reason ? "white" : "var(--gray-400, #a8a29e)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: reason ? "pointer" : "not-allowed",
                  fontFamily: "var(--sans, system-ui)",
                  transition: "all 0.15s ease",
                }}
              >
                Continuar →
              </button>
            </div>
          </>
        )}

        {step === "confirm" && msg && (
          <>
            <h1 style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--gray-800, #1c1917)",
              margin: "0 0 12px",
              letterSpacing: "-0.3px",
            }}>
              {msg.title}
            </h1>
            <p style={{
              fontSize: 14,
              color: "var(--gray-600, #57534e)",
              margin: "0 0 32px",
              lineHeight: 1.65,
            }}>
              {msg.body}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleCancel}
                style={{
                  flex: 2,
                  padding: "11px 0",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1.5px solid var(--gray-200, #e7e5e4)",
                  background: "white",
                  color: "var(--gray-800, #1c1917)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--sans, system-ui)",
                }}
              >
                Manter instalado
              </button>
              <button
                onClick={handleUninstall}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "none",
                  background: "transparent",
                  color: "var(--gray-400, #a8a29e)",
                  fontSize: 12,
                  fontWeight: 400,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--sans, system-ui)",
                  textDecoration: "underline",
                }}
              >
                {loading ? "A desinstalar..." : msg.cta}
              </button>
            </div>

            <button
              onClick={() => setStep("reason")}
              style={{
                marginTop: 16,
                background: "none",
                border: "none",
                color: "var(--gray-400, #a8a29e)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--sans, system-ui)",
                padding: 0,
              }}
            >
              ← Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
