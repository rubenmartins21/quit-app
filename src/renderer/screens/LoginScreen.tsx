/**
 * LoginScreen.tsx — Quit design system
 * Localização: src/renderer/screens/LoginScreen.tsx
 */

import React, { useState, useRef, useEffect } from "react";
import { ipc } from "../lib/ipc";
import { useI18n, LANG_OPTIONS_TRANSLATED, Lang } from "../lib/i18n";

interface Props { onSuccess: (user: { id: string; email: string }) => void; }

export function LoginScreen({ onSuccess }: Props) {
  const { t, lang, setLang } = useI18n();
  const [step,    setStep]    = useState<"email" | "otp">("email");
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await ipc.auth.requestOtp(email.trim().toLowerCase());
    setLoading(false);
    if (res.error) setError(res.error);
    else { setStep("otp"); setTimeout(() => inputRefs.current[0]?.focus(), 50); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const code = otp.join("").trim();
    const res  = await ipc.auth.verifyOtp(email.trim().toLowerCase(), code);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.ok && res.user) onSuccess(res.user);
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""] as string[];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    setTimeout(() => inputRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
    if (pasted.length === 6) {
      setLoading(true);
      ipc.auth.verifyOtp(email.trim().toLowerCase(), pasted).then(res => {
        setLoading(false);
        if (res.error) setError(res.error);
        else if (res.ok && res.user) onSuccess(res.user);
      });
    }
  }

  function handleOtpChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // Browser autofill or paste via onChange can deliver multiple chars
    if (val.length > 1) {
      const digits = val.replace(/\D/g, "").slice(0, 6);
      if (!digits) return;
      const next = ["", "", "", "", "", ""] as string[];
      for (let j = 0; j < digits.length; j++) next[j] = digits[j];
      setOtp(next);
      setTimeout(() => inputRefs.current[Math.min(digits.length, 5)]?.focus(), 0);
      if (digits.length === 6) {
        setLoading(true);
        ipc.auth.verifyOtp(email.trim().toLowerCase(), digits).then(res => {
          setLoading(false);
          if (res.error) setError(res.error);
          else if (res.ok && res.user) onSuccess(res.user);
        });
      }
      return;
    }
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...otp]; next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every(d => d)) {
      setLoading(true);
      ipc.auth.verifyOtp(email.trim().toLowerCase(), next.join("")).then(res => {
        setLoading(false);
        if (res.error) setError(res.error);
        else if (res.ok && res.user) onSuccess(res.user);
      });
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "#F7F9F8", overflow: "hidden", position: "relative" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />

      {/* Left panel */}
      <div style={{
        width: "42%", flexShrink: 0, background: "#1F3D2B",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "48px 44px", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "30%", left: "20%",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(107,143,122,.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#fff", letterSpacing: "-1px", lineHeight: 1, marginBottom: "16px" }}>Quit</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: "220px" }}>{t.brand.motto}</div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 52px", position: "relative" }}>

        {/* Lang picker top right */}
        <div style={{ position: "absolute", top: "20px", right: "20px" }} className="no-drag">
          <LoginLangPicker lang={lang} setLang={setLang} />
        </div>

        <div style={{ maxWidth: "340px" }}>
          {step === "otp" && (
            <button onClick={() => { setStep("email"); setOtp(["","","","","",""]); setError(""); }}
              style={{ background: "none", border: "none", fontSize: "12px", color: "#6B6B6B", cursor: "pointer", marginBottom: "28px", padding: 0 }}
            >
              ← {t.login.back}
            </button>
          )}

          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "#6B8F7A", marginBottom: "6px" }}>
            {step === "email" ? t.login.email : t.login.otp}
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-.5px", color: "#1C1C1C", marginBottom: "6px" }}>
            {step === "email" ? t.login.title : t.login.verify}
          </div>
          <div style={{ fontSize: "13px", color: "#6B6B6B", lineHeight: 1.65, marginBottom: "28px" }}>
            {step === "email" ? t.login.subtitle : (
              <>{t.login.otp} <strong style={{ color: "#1C1C1C" }}>{email}</strong></>
            )}
          </div>

          {step === "email" ? (
            <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={labelS}>{t.login.email}</div>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@exemplo.com" style={inputS} autoFocus />
              </div>
              {error && <p style={errS}>{error}</p>}
              <button type="submit" disabled={loading} style={{ ...btnS, opacity: loading ? .7 : 1 }}>
                {loading ? "…" : t.login.send}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div style={labelS}>{t.login.otp}</div>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text" inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={e => handleOtpChange(i, e)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      onPaste={handleOtpPaste}
                      style={{
                        width: "44px", height: "52px", textAlign: "center" as const,
                        fontSize: "20px", fontWeight: 600,
                        border: `1.5px solid ${digit ? "#1F3D2B" : "#C8D8CE"}`,
                        borderRadius: "5px",
                        background: digit ? "#EBF2EE" : "#fff",
                        color: "#1F3D2B", outline: "none",
                        userSelect: "text" as const,
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && <p style={errS}>{error}</p>}
              <button type="submit" disabled={loading} style={{ ...btnS, opacity: loading ? .7 : 1 }}>
                {loading ? "…" : t.login.verify}
              </button>
              <button type="button"
                onClick={() => handleRequestOtp({ preventDefault: () => {} } as React.FormEvent)}
                style={{ background: "none", border: "none", fontSize: "12px", color: "#6B8F7A", cursor: "pointer", textAlign: "left" as const, padding: 0 }}
              >
                {t.login.resend}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LoginLangPicker ───────────────────────────────────────────────────────────

function LoginLangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
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
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "5px 10px", borderRadius: "5px",
        background: "transparent", border: "1px solid #C8D8CE",
        cursor: "pointer", transition: "border-color .15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1F3D2B"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = "#C8D8CE"; }}
      >
        <span style={{ fontSize: "13px", lineHeight: 1 }}>{current.flag}</span>
        <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B6B", letterSpacing: ".04em" }}>{current.label}</span>
        <span style={{ fontSize: "7px", color: "#6B6B6B", opacity: .6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0,
          background: "#fff", border: "1px solid #E4EBE7",
          borderRadius: "5px", overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,.08)",
          minWidth: "150px", zIndex: 200,
        }}>
          {options.map(o => {
            const sel = o.value === lang;
            return (
              <div key={o.value} onClick={() => { setLang(o.value); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "9px 12px", cursor: "pointer",
                background: sel ? "#EBF2EE" : "transparent", transition: "background .12s",
              }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "#F7F9F8"; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: "13px", lineHeight: 1 }}>{o.flag}</span>
                <span style={{ flex: 1, fontSize: "11px", fontWeight: 500, color: sel ? "#1F3D2B" : "#6B6B6B" }}>{o.label}</span>
                {sel && <span style={{ fontSize: "9px", color: "#1F3D2B" }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelS: React.CSSProperties = {
  fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B6B6B", marginBottom: "7px",
};
const inputS: React.CSSProperties = {
  width: "100%", padding: "10px 13px",
  border: "1.5px solid #C8D8CE", borderRadius: "5px",
  fontSize: "14px", color: "#1C1C1C", background: "#fff", outline: "none",
};
const btnS: React.CSSProperties = {
  padding: "11px 0", border: "none", borderRadius: "5px",
  fontSize: "12px", fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase",
  color: "#fff", background: "#1F3D2B", cursor: "pointer", width: "100%",
};
const errS: React.CSSProperties = { fontSize: "12px", color: "#C44536" };
