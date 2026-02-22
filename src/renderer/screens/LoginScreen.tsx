import React, { useState } from "react";
import { ipc } from "../lib/ipc";
import { Button, Input, ErrorMsg } from "../components/ui";

interface Props { onSuccess: (user: { id: string; email: string }) => void; }

export function LoginScreen({ onSuccess }: Props) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await ipc.auth.requestOtp(email.trim().toLowerCase());
    setLoading(false);
    if (res.error) setError(res.error); else setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await ipc.auth.verifyOtp(email.trim().toLowerCase(), code.trim());
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.ok && res.user) onSuccess(res.user);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--gray-50)" }}>
      <div className="drag-region" style={{ height: "28px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", maxWidth: "380px", width: "100%", margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: "20px", color: "var(--green)", marginBottom: "48px" }}>Quit</div>
        <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "6px" }}>{step === "email" ? "Acesso" : "Verificacao"}</p>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "32px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.1, marginBottom: "12px" }}>{step === "email" ? "Entrar" : "Codigo"}</h1>
        <p style={{ fontSize: "12px", color: "var(--gray-400)", lineHeight: "1.7", marginBottom: "32px" }}>
          {step === "email" ? "Introduz o teu email. Enviamos um codigo de 6 digitos." : <>Enviamos um codigo para <span style={{ color: "var(--green)" }}>{email}</span>. Expira em 10 minutos.</>}
        </p>
        {step === "email" ? (
          <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            <Input label="Email" id="email" type="email" placeholder="tu@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus required />
            <ErrorMsg message={error} />
            <Button type="submit" loading={loading} disabled={!email.trim()}>Enviar codigo</Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            <Input label="Codigo de 6 digitos" id="code" type="text" inputMode="numeric" placeholder="000000" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus
              style={{ fontSize: "22px", letterSpacing: "0.4em", textAlign: "center" }} />
            <ErrorMsg message={error} />
            <Button type="submit" loading={loading} disabled={code.length < 6}>Entrar</Button>
            <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }}
              style={{ background: "none", border: "none", fontSize: "11px", color: "var(--gray-400)", cursor: "pointer", padding: 0, textAlign: "left" }}>
              ← Mudar email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
