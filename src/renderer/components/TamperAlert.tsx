/**
 * TamperAlert — banner persistente mostrado quando o watchdog detecta
 * que as camadas de bloqueio foram removidas com desafio activo.
 *
 * Escuta o evento IPC "blocker:watchdog" e muda de estado conforme:
 *   tamper-detected  → aviso amarelo "bloqueio foi removido, a reapplicar..."
 *   tamper-reapplied → sucesso verde (desaparece após 4s)
 *   tamper-failed    → erro vermelho persistente
 */

import { useEffect, useState } from "react";

type WatchdogEvent = "tamper-detected" | "tamper-reapplied" | "tamper-failed";
type AlertState = "idle" | WatchdogEvent;

export default function TamperAlert() {
  const [state, setState] = useState<AlertState>("idle");

  useEffect(() => {
    const handler = (_: unknown, payload: { event: WatchdogEvent }) => {
      setState(payload.event);

      // Após reapplicação com sucesso, esconde após 4s
      if (payload.event === "tamper-reapplied") {
        setTimeout(() => setState("idle"), 4000);
      }
    };

    window.ipc?.on("blocker:watchdog", handler);
    return () => {
      window.ipc?.off("blocker:watchdog", handler);
    };
  }, []);

  if (state === "idle") return null;

  const config = {
    "tamper-detected": {
      bg: "var(--yellow-muted, #fef3c7)",
      border: "var(--yellow, #f59e0b)",
      color: "#92400e",
      icon: "⚠️",
      title: "Bloqueio foi removido",
      body: "Foi detectada uma alteração nas defesas. A reapplicar automaticamente — um pedido de permissão pode aparecer.",
      spinner: true,
    },
    "tamper-reapplied": {
      bg: "var(--green-muted, #d1fae5)",
      border: "var(--green, #10b981)",
      color: "#065f46",
      icon: "🔒",
      title: "Bloqueio restaurado",
      body: "As camadas de bloqueio foram reapplicadas com sucesso.",
      spinner: false,
    },
    "tamper-failed": {
      bg: "var(--red-muted, #fee2e2)",
      border: "var(--red, #ef4444)",
      color: "#991b1b",
      icon: "🚨",
      title: "Não foi possível restaurar o bloqueio",
      body: "O pedido de permissão foi recusado ou ocorreu um erro. O desafio continua activo — tenta fechar e reabrir o Quit.",
      spinner: false,
    },
  } as const;

  const c = config[state as WatchdogEvent];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(480px, calc(100vw - 48px))",
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: "var(--radius-md, 10px)",
        padding: "14px 18px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        animation: "slideUp 0.25s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Ícone */}
      <span style={{ fontSize: 18, lineHeight: 1.4, flexShrink: 0 }}>
        {c.spinner ? (
          <span
            style={{
              display: "inline-block",
              width: 18,
              height: 18,
              border: `2.5px solid ${c.border}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              verticalAlign: "middle",
            }}
          />
        ) : (
          c.icon
        )}
      </span>

      {/* Texto */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--sans, system-ui)",
            fontWeight: 600,
            fontSize: 13,
            color: c.color,
            marginBottom: 3,
          }}
        >
          {c.title}
        </div>
        <div
          style={{
            fontFamily: "var(--sans, system-ui)",
            fontSize: 12,
            color: c.color,
            opacity: 0.85,
            lineHeight: 1.5,
          }}
        >
          {c.body}
        </div>
      </div>
    </div>
  );
}
