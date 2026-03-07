/**
 * BlockerSyncScreen — ecrã de transição mostrado no arranque do app
 * quando o bloqueador está ativo mas não há desafio ativo (ou o desafio
 * já terminou). Explica ao utilizador o que vai acontecer ANTES de o
 * UAC/osascript/pkexec aparecer, para que a janela de permissão faça sentido.
 *
 * Fluxo:
 *   App abre → App.tsx deteta blocker ativo + sem desafio → mostra este ecrã
 *   → utilizador clica "Remover bloqueio" → IPC deactivateBlocker → UAC
 *   → volta ao dashboard normal
 */

import React, { useState } from "react";
import { ipc } from "../lib/ipc";

interface Props {
  onDone: () => void;
}

type State = "idle" | "loading" | "error";

export function BlockerSyncScreen({ onDone }: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDeactivate() {
    setState("loading");
    setErrorMsg("");

    // Esta chamada vai disparar o UAC / osascript / pkexec
    // O utilizador já está preparado porque viu este ecrã primeiro
    const res = await ipc.blocker.deactivate();

    if (res.ok) {
      onDone();
    } else {
      setState("error");
      setErrorMsg(res.error ?? "Não foi possível remover o bloqueio.");
    }
  }

  return (
    <div style={styles.root}>
      {/* Drag region para a titlebar */}
      <div className="drag-region" style={styles.dragRegion} />

      <div style={styles.content}>

        {/* Ícone / indicador */}
        <div style={styles.iconWrap}>
          <div style={styles.iconDot} />
        </div>

        {/* Eyebrow */}
        <p style={styles.eyebrow}>Bloqueio activo</p>

        {/* Título */}
        <h1 style={styles.headline}>
          O teu desafio terminou.
        </h1>

        {/* Explicação */}
        <p style={styles.body}>
          O bloqueio do sistema continua ativo da sessão anterior.
          Para usar o computador normalmente, é necessário removê-lo.
        </p>

        {/* Info box — explica o UAC */}
        <div style={styles.infoBox}>
          <p style={styles.infoLabel}>O que vai acontecer</p>
          <p style={styles.infoText}>
            O sistema vai pedir permissões de administrador para remover
            as entradas do ficheiro hosts, restaurar o DNS e desativar
            o proxy. É seguro — faz parte do funcionamento normal do Quit.
          </p>
        </div>

        {/* Aviso de comportamento offline */}
        <div style={styles.warningBox}>
          <p style={styles.warningText}>
            <span style={{ color: "var(--gray-800)", fontWeight: 500 }}>Nota: </span>
            O bloqueio só é removido automaticamente quando o Quit está aberto.
            Se fechares o app com um desafio activo, o bloqueio mantém-se até
            voltares a abrir o Quit.
          </p>
        </div>

        {/* Erro */}
        {state === "error" && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{errorMsg}</p>
            <p style={{ fontSize: "11px", color: "var(--red-muted)", marginTop: "4px", opacity: 0.8 }}>
              Tenta novamente. Se o problema persistir, usa o script de reset manual.
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleDeactivate}
          disabled={state === "loading"}
          style={{
            ...styles.btn,
            opacity: state === "loading" ? 0.6 : 1,
            cursor: state === "loading" ? "not-allowed" : "pointer",
          }}
        >
          {state === "loading" ? (
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={styles.spinner} />
              A aguardar permissão…
            </span>
          ) : state === "error" ? (
            "Tentar novamente"
          ) : (
            "Remover bloqueio"
          )}
        </button>

        {state === "loading" && (
          <p style={styles.loadingHint}>
            Uma janela de permissão de sistema deve ter aparecido.
            Aceita para continuar.
          </p>
        )}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--white)",
    overflow: "hidden",
  },
  dragRegion: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "28px",
    zIndex: 10,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "400px",
    width: "100%",
    padding: "0 32px",
  },
  iconWrap: {
    marginBottom: "28px",
  },
  iconDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "var(--green)",
    opacity: 0.6,
  },
  eyebrow: {
    fontSize: "10px",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: "var(--gray-400)",
    marginBottom: "6px",
  },
  headline: {
    fontFamily: "var(--serif)",
    fontSize: "28px",
    color: "var(--gray-800)",
    fontWeight: 400,
    lineHeight: 1.15,
    marginBottom: "12px",
  },
  body: {
    fontSize: "12px",
    color: "var(--gray-400)",
    lineHeight: "1.7",
    marginBottom: "24px",
  },
  infoBox: {
    background: "var(--gray-50)",
    border: "1px solid var(--gray-200)",
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    marginBottom: "12px",
  },
  infoLabel: {
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    color: "var(--gray-400)",
    marginBottom: "6px",
  },
  infoText: {
    fontSize: "11px",
    color: "var(--gray-600)",
    lineHeight: "1.65",
  },
  warningBox: {
    borderLeft: "2px solid var(--gray-200)",
    paddingLeft: "14px",
    marginBottom: "28px",
  },
  warningText: {
    fontSize: "11px",
    color: "var(--gray-400)",
    lineHeight: "1.7",
  },
  errorBox: {
    background: "#fdf0f0",
    border: "1px solid var(--red-muted)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginBottom: "16px",
  },
  errorText: {
    fontSize: "11px",
    color: "var(--red-muted)",
    lineHeight: "1.5",
  },
  btn: {
    padding: "12px 24px",
    background: "var(--green)",
    color: "var(--white)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontFamily: "var(--mono)",
    fontSize: "11px",
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    width: "100%",
    transition: "opacity 0.15s",
  },
  loadingHint: {
    fontSize: "11px",
    color: "var(--gray-400)",
    textAlign: "center" as const,
    marginTop: "12px",
    lineHeight: "1.6",
  },
  spinner: {
    display: "inline-block",
    width: "12px",
    height: "12px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};
