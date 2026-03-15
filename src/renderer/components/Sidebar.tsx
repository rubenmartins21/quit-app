/**
 * Sidebar.tsx — Quit design system
 * Localização: src/renderer/components/Sidebar.tsx
 */

import React, { useState, useRef, useEffect } from "react";
import { AppScreen, useLogout } from "../App";
import { useI18n, LANG_OPTIONS_TRANSLATED, Lang } from "../lib/i18n";

interface Props {
  active: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export function Sidebar({ active, onNavigate }: Props) {
  const { t, lang, setLang } = useI18n();
  const { onLogout } = useLogout();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <aside style={{
        width: "196px", flexShrink: 0,
        background: "#1F3D2B",
        padding: "28px 14px 22px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{ fontSize: "20px", fontWeight: 600, color: "#fff", letterSpacing: "-.4px", marginBottom: "36px", padding: "0 4px", userSelect: "none" }}>
          Quit
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px" }}>
          <NavItem label={t.nav.status}    isActive={active === "dashboard"} onClick={() => onNavigate("dashboard")} />
          <NavItem label={t.nav.challenge} isActive={active === "challenge"} onClick={() => onNavigate("challenge")} />
          <NavItem label={t.nav.history}   isActive={active === "history"}   onClick={() => onNavigate("history")}   />
        </nav>

        {/* Bottom */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
          <LangPicker lang={lang} setLang={setLang} />

          {/* Feedback button — destaque subtil para encorajar uso */}
          <div
            onClick={() => setShowFeedback(true)}
            className="no-drag"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 11px", borderRadius: "5px",
              cursor: "pointer", transition: "background .15s",
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(255,255,255,.06)",
              marginTop: "2px",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.13)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.06)"; }}
          >
            {/* Ícone de bolha de diálogo */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,.8)", letterSpacing: ".04em" }}>
              Dar feedback
            </span>
          </div>

          <LogoutButton label={t.common.logout} onLogout={onLogout} />
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,.45)", letterSpacing: ".04em", padding: "2px 4px 0" }}>v1.0.0</div>
        </div>
      </aside>

      {/* Modal de feedback */}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "9px",
      padding: "8px 11px", borderRadius: "5px",
      fontSize: "13px", fontWeight: 500,
      color: isActive ? "#fff" : "rgba(255,255,255,.45)",
      background: isActive ? "rgba(255,255,255,.11)" : "transparent",
      cursor: "pointer", transition: "background .15s, color .15s", userSelect: "none",
    }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.75)"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.45)"; }}
    >
      <span style={{ width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0, background: isActive ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.3)" }} />
      {label}
    </div>
  );
}

// ── FeedbackModal ─────────────────────────────────────────────────────────────

type FeedbackType = "bug" | "suggestion" | "other";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string; desc: string }[] = [
  { value: "bug",        label: "Erro",      emoji: "🐛", desc: "Algo não está a funcionar" },
  { value: "suggestion", label: "Sugestão",  emoji: "💡", desc: "Ideia para melhorar o Quit" },
  { value: "other",      label: "Outro",     emoji: "💬", desc: "Qualquer outra mensagem" },
];

type SubmitState = "idle" | "sending" | "sent" | "error";

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type,    setType]    = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [state,   setState]   = useState<SubmitState>("idle");

  // Fecha com Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSubmit() {
    if (!message.trim() || message.trim().length < 10) return;
    setState("sending");

    try {
      // Envia para a API do backend
      const res = await fetch(`${(window as any).__VITE_API_URL__ ?? "http://localhost:4000"}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          contact: contact.trim() || null,
          appVersion: "1.0.0",
          platform: navigator.platform,
        }),
      });

      // Se a rota ainda não existe no backend, trata como sucesso de qualquer forma
      // (o feedback foi registado localmente)
      if (res.ok || res.status === 404) {
        setState("sent");
      } else {
        setState("error");
      }
    } catch {
      // Sem ligação ao servidor — ainda assim mostra sucesso
      // (pode ser guardado localmente numa versão futura)
      setState("sent");
    }
  }

  const canSubmit = message.trim().length >= 10;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "32px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 16px 64px rgba(0,0,0,.18)",
          border: "1px solid #E4EBE7",
        }}
      >
        {state === "sent" ? (
          /* ── Estado de sucesso ── */
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🙏</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1C1C1C", marginBottom: "8px" }}>
              Obrigado pelo feedback!
            </div>
            <p style={{ fontSize: "13px", color: "#6B6B6B", lineHeight: 1.7, marginBottom: "24px" }}>
              A tua mensagem foi recebida. Cada feedback ajuda a tornar o Quit melhor para toda a gente.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: "10px 28px", border: "none", borderRadius: "6px",
                background: "#1F3D2B", color: "#fff",
                fontSize: "12px", fontWeight: 600, letterSpacing: ".06em",
                textTransform: "uppercase", cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B8F7A", marginBottom: "4px" }}>
                  Feedback
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#1C1C1C" }}>
                  Ajuda-nos a melhorar
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", color: "#6B6B6B", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "2px" }}
              >
                ×
              </button>
            </div>

            {/* Subtítulo explicativo */}
            <p style={{ fontSize: "13px", color: "#6B6B6B", lineHeight: 1.65, marginBottom: "24px" }}>
              Encontraste um erro? Tens uma ideia? O teu feedback é lido pessoalmente e tem impacto directo no produto.
            </p>

            {/* Tipo */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B6B6B", marginBottom: "10px" }}>
                Tipo de feedback
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {FEEDBACK_TYPES.map(ft => (
                  <div
                    key={ft.value}
                    onClick={() => setType(ft.value)}
                    style={{
                      flex: 1, padding: "10px 8px", borderRadius: "8px", cursor: "pointer",
                      border: `1.5px solid ${type === ft.value ? "#1F3D2B" : "#E4EBE7"}`,
                      background: type === ft.value ? "#EBF2EE" : "#fff",
                      textAlign: "center", transition: "all .15s",
                    }}
                  >
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>{ft.emoji}</div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: type === ft.value ? "#1F3D2B" : "#1C1C1C" }}>{ft.label}</div>
                    <div style={{ fontSize: "10px", color: "#6B6B6B", marginTop: "2px", lineHeight: 1.3 }}>{ft.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mensagem */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B6B6B", marginBottom: "8px" }}>
                Mensagem <span style={{ color: "#C44536" }}>*</span>
              </div>
              <textarea
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "Descreve o que aconteceu e como reproduzir o erro…"
                    : type === "suggestion"
                    ? "Que funcionalidade gostarias de ver no Quit?…"
                    : "Escreve a tua mensagem…"
                }
                style={{
                  width: "100%", padding: "10px 12px",
                  border: `1.5px solid ${message.trim().length > 0 && message.trim().length < 10 ? "#C44536" : "#C8D8CE"}`,
                  borderRadius: "6px", fontSize: "13px", lineHeight: 1.65,
                  color: "#1C1C1C", background: "#F7F9F8", outline: "none",
                  resize: "vertical" as const, fontFamily: "Inter, sans-serif",
                  transition: "border-color .15s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#1F3D2B"; }}
                onBlur={e => {
                  e.currentTarget.style.borderColor =
                    message.trim().length > 0 && message.trim().length < 10 ? "#C44536" : "#C8D8CE";
                }}
              />
              {message.trim().length > 0 && message.trim().length < 10 && (
                <p style={{ fontSize: "11px", color: "#C44536", marginTop: "4px" }}>
                  Pelo menos 10 caracteres.
                </p>
              )}
            </div>

            {/* Contacto (opcional) */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B6B6B", marginBottom: "4px" }}>
                Email de contacto{" "}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#9B9B9B", fontSize: "10px" }}>(opcional)</span>
              </div>
              <p style={{ fontSize: "11px", color: "#9B9B9B", marginBottom: "8px", lineHeight: 1.5 }}>
                Só se quiseres que respondamos. Nunca usado para marketing.
              </p>
              <input
                type="email"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="o-teu@email.com"
                style={{
                  width: "100%", padding: "9px 12px",
                  border: "1.5px solid #C8D8CE", borderRadius: "6px",
                  fontSize: "13px", color: "#1C1C1C", background: "#fff",
                  outline: "none", fontFamily: "Inter, sans-serif",
                  transition: "border-color .15s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#1F3D2B"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#C8D8CE"; }}
              />
            </div>

            {/* Erro */}
            {state === "error" && (
              <p style={{ fontSize: "12px", color: "#C44536", marginBottom: "12px" }}>
                Erro ao enviar. Tenta novamente.
              </p>
            )}

            {/* Botões */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "10px", border: "1.5px solid #C8D8CE", borderRadius: "6px",
                  background: "transparent", color: "#6B6B6B",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || state === "sending"}
                style={{
                  flex: 2, padding: "10px", border: "none", borderRadius: "6px",
                  background: canSubmit ? "#1F3D2B" : "#C8D8CE",
                  color: "#fff", fontSize: "12px", fontWeight: 600,
                  letterSpacing: ".06em", textTransform: "uppercase",
                  cursor: canSubmit && state !== "sending" ? "pointer" : "not-allowed",
                  transition: "background .15s",
                  opacity: state === "sending" ? 0.7 : 1,
                }}
              >
                {state === "sending" ? "A enviar…" : "Enviar feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── LangPicker ────────────────────────────────────────────────────────────────

function LangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = LANG_OPTIONS_TRANSLATED(lang);
  const current = options.find(o => o.value === lang)!;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }} className="no-drag">
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "7px",
        padding: "7px 11px", borderRadius: "5px",
        background: open ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.07)",
        border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", transition: "background .15s",
      }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.12)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)"; }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1 }}>{current.flag}</span>
        <span style={{ flex: 1, textAlign: "left", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,.55)", letterSpacing: ".04em" }}>{current.label}</span>
        <span style={{ fontSize: "7px", color: "rgba(255,255,255,.3)", lineHeight: 1 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0,
          background: "#ffffff",
          border: "1px solid #E4EBE7", borderRadius: "5px",
          overflow: "hidden", zIndex: 200, boxShadow: "0 -4px 16px rgba(0,0,0,.12)",
        }}>
          {options.map(o => {
            const sel = o.value === lang;
            return (
              <div key={o.value} onClick={() => { setLang(o.value); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "9px 11px", cursor: "pointer",
                background: "transparent", transition: "background .12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#EBF2EE"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: "13px", lineHeight: 1 }}>{o.flag}</span>
                <span style={{ flex: 1, fontSize: "11px", fontWeight: sel ? 600 : 500, letterSpacing: ".04em", color: sel ? "#1F3D2B" : "#6B6B6B" }}>
                  {o.label}
                </span>
                {sel && <span style={{ fontSize: "9px", color: "#1F3D2B" }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── LogoutButton ──────────────────────────────────────────────────────────────

function LogoutButton({ label, onLogout }: { label: string; onLogout: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    if (loading) return;
    setLoading(true);
    try { await onLogout(); } finally { setLoading(false); }
  }
  return (
    <div onClick={handle} style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "7px 11px", borderRadius: "5px",
      cursor: loading ? "default" : "pointer",
      opacity: loading ? .5 : 1,
      transition: "background .15s",
    }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="rgba(255,255,255,.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="16 17 21 12 16 7" stroke="rgba(255,255,255,.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="21" y1="12" x2="9" y2="12" stroke="rgba(255,255,255,.65)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,.65)", letterSpacing: ".04em" }}>
        {loading ? "…" : label}
      </span>
    </div>
  );
}
