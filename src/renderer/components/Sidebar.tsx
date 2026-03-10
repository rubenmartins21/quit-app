/**
 * Sidebar.tsx — Quit design system
 * Localização: src/renderer/components/Sidebar.tsx
 *
 * onLogout vem do LogoutContext (App.tsx) — não precisa de prop.
 * Nomes de línguas traduzidos via LANG_OPTIONS_TRANSLATED(lang).
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

  return (
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
        <LogoutButton label={t.common.logout} onLogout={onLogout} />
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,.18)", letterSpacing: ".04em", padding: "2px 4px 0" }}>v1.0.0</div>
      </div>
    </aside>
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

// ── LangPicker ────────────────────────────────────────────────────────────────

function LangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = LANG_OPTIONS_TRANSLATED(lang);   // traduzidos para a língua activa
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
          background: "rgba(20,50,34,.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,.12)", borderRadius: "5px",
          overflow: "hidden", zIndex: 200, boxShadow: "0 -4px 24px rgba(0,0,0,.3)",
        }}>
          {options.map(o => {
            const sel = o.value === lang;
            return (
              <div key={o.value} onClick={() => { setLang(o.value); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "9px 11px", cursor: "pointer",
                background: sel ? "rgba(255,255,255,.1)" : "transparent", transition: "background .12s",
              }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)"; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: "13px", lineHeight: 1 }}>{o.flag}</span>
                <span style={{ flex: 1, fontSize: "11px", fontWeight: 500, letterSpacing: ".04em", color: sel ? "#fff" : "rgba(255,255,255,.55)" }}>{o.label}</span>
                {sel && <span style={{ fontSize: "9px", color: "rgba(255,255,255,.45)" }}>✓</span>}
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
    <button onClick={handle} disabled={loading} style={{
      width: "100%", display: "flex", alignItems: "center", gap: "8px",
      padding: "7px 11px", borderRadius: "5px",
      border: "1px solid rgba(255,255,255,.1)", background: "transparent",
      cursor: loading ? "default" : "pointer", opacity: loading ? .6 : 1, transition: "background .15s",
    }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="16 17 21 12 16 7" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="21" y1="12" x2="9" y2="12" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,.4)", letterSpacing: ".04em" }}>
        {loading ? "…" : label}
      </span>
    </button>
  );
}
