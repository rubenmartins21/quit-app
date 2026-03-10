/**
 * LoginScreen.tsx — Quit design system
 * Localização: src/renderer/screens/LoginScreen.tsx
 */

import React, { useState, useRef, useEffect } from "react";
import { ipc } from "../lib/ipc";
import { useI18n } from "../lib/i18n";

interface Props {
  onSuccess: (user: { id: string; email: string }) => void;
}

export function LoginScreen({ onSuccess }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await ipc.auth.requestOtp(email.trim().toLowerCase());
    setLoading(false);
    if (res.error) setError(res.error);
    else {
      setStep("otp");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const code = otp.join("").trim();
    const res = await ipc.auth.verifyOtp(email.trim().toLowerCase(), code);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.ok && res.user) onSuccess(res.user);
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      inputRefs.current[i - 1]?.focus();
  }

  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every((d) => d)) {
      // auto-submit when all filled
      setLoading(true);
      ipc.auth
        .verifyOtp(email.trim().toLowerCase(), next.join(""))
        .then((res) => {
          setLoading(false);
          if (res.error) setError(res.error);
          else if (res.ok && res.user) onSuccess(res.user);
        });
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: "#F7F9F8",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        className="drag-region"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "28px",
          zIndex: 10,
        }}
      />

      {/* Left panel — brand */}
      <div
        style={{
          width: "42%",
          flexShrink: 0,
          background: "#1F3D2B",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "48px 44px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "20%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(107,143,122,.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-1px",
              lineHeight: 1,
              marginBottom: "16px",
            }}
          >
            Quit
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,.5)",
              lineHeight: 1.7,
              maxWidth: "220px",
            }}
          >
            {t.brand.motto}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 52px",
        }}
      >
        <div style={{ maxWidth: "340px" }}>
          {/* Step back */}
          {step === "otp" && (
            <button
              onClick={() => {
                setStep("email");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: "12px",
                color: "#6B6B6B",
                cursor: "pointer",
                marginBottom: "28px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ← {t.login.back}
            </button>
          )}

          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase" as const,
              color: "#6B8F7A",
              marginBottom: "6px",
            }}
          >
            {step === "email" ? t.login.login : t.login.otp}
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-.5px",
              color: "#1C1C1C",
              marginBottom: "6px",
            }}
          >
            {step === "email" ? t.login.title : t.login.verify}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#6B6B6B",
              lineHeight: 1.65,
              marginBottom: "28px",
            }}
          >
            {step === "email" ? (
              t.login.subtitle
            ) : (
              <>
                {t.login.otp}{" "}
                <strong style={{ color: "#1C1C1C" }}>{email}</strong>
              </>
            )}
          </div>

          {step === "email" ? (
            <form
              onSubmit={handleRequestOtp}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <div style={labelS}>{t.login.email}</div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@exemplo.com"
                  style={inputS}
                  autoFocus
                />
              </div>
              {error && <p style={errS}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{ ...btnS, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "…" : t.login.send}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleVerifyOtp}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <div style={labelS}>{t.login.otp}</div>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKey(i, e)}
                      style={{
                        width: "44px",
                        height: "52px",
                        textAlign: "center" as const,
                        fontSize: "20px",
                        fontWeight: 600,
                        border: `1.5px solid ${digit ? "#1F3D2B" : "#C8D8CE"}`,
                        borderRadius: "5px",
                        background: digit ? "#EBF2EE" : "#fff",
                        color: "#1F3D2B",
                        outline: "none",
                      }}
                    />
                  ))}
                </div>
              </div>
              {error && <p style={errS}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{ ...btnS, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "…" : t.login.verify}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleRequestOtp({
                    preventDefault: () => {},
                  } as React.FormEvent)
                }
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "12px",
                  color: "#6B8F7A",
                  cursor: "pointer",
                  textAlign: "left" as const,
                  padding: 0,
                }}
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

const labelS: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: ".1em",
  color: "#6B6B6B",
  marginBottom: "7px",
};
const inputS: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  border: "1.5px solid #C8D8CE",
  borderRadius: "5px",
  fontSize: "14px",
  color: "#1C1C1C",
  background: "#fff",
  outline: "none",
};
const btnS: React.CSSProperties = {
  padding: "11px 0",
  border: "none",
  borderRadius: "5px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: ".07em",
  textTransform: "uppercase",
  color: "#fff",
  background: "#1F3D2B",
  cursor: "pointer",
  width: "100%",
};
const errS: React.CSSProperties = {
  fontSize: "12px",
  color: "#C44536",
};
