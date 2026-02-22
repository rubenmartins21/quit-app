import React, { useEffect, useState } from "react";
import { ipc, ChallengeData } from "../lib/ipc";
import { Button, Input, ErrorMsg } from "../components/ui";
import { Sidebar } from "../components/Sidebar";
import { AppScreen } from "../App";

interface Props {
  onCreated: (challenge: ChallengeData) => void;
  onNavigate: (screen: AppScreen) => void;
}

const PRESET_DAYS = [7, 30, 90];

export function CreateChallengeScreen({ onCreated, onNavigate }: Props) {
  const [hasActive, setHasActive] = useState<boolean | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(30);
  const [customDays, setCustomDays] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if user already has active challenge
  useEffect(() => {
    ipc.challenge.active().then(res => {
      setHasActive(!!res.challenge);
    });
  }, []);

  const effectiveDays = useCustom ? parseInt(customDays, 10) : selectedDays;

  function handlePreset(days: number) {
    setSelectedDays(days);
    setUseCustom(false);
    setCustomDays("");
    setError("");
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, "");
    setCustomDays(val);
    setUseCustom(true);
    setSelectedDays(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!effectiveDays || isNaN(effectiveDays)) { setError("Escolhe uma duração."); return; }
    if (effectiveDays < 7) { setError("Mínimo de 7 dias."); return; }
    if (reason.trim().length < 10) { setError("Escreve pelo menos 10 caracteres no motivo."); return; }
    setLoading(true);
    const res = await ipc.challenge.create(effectiveDays, reason.trim());
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.ok && res.challenge) onCreated(res.challenge);
  }

  const canSubmit = !!effectiveDays && effectiveDays >= 7 && reason.trim().length >= 10;

  // Still loading
  if (hasActive === null) {
    return (
      <div style={{ height: "100vh", display: "flex", background: "var(--white)" }}>
        <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />
        <Sidebar active="challenge" onNavigate={onNavigate} />
        <main style={mainStyle}>
          <p style={{ fontSize: "12px", color: "var(--gray-400)" }}>A carregar...</p>
        </main>
      </div>
    );
  }

  // Already has active challenge — redirect message
  if (hasActive) {
    return (
      <div style={{ height: "100vh", display: "flex", background: "var(--white)" }}>
        <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />
        <Sidebar active="challenge" onNavigate={onNavigate} />
        <main style={mainStyle}>
          <p style={eyebrow}>Desafio</p>
          <h1 style={headline}>Já tens um desafio ativo.</h1>
          <p style={subtext}>
            Só é possível ter um desafio de cada vez.<br />
            Cancela o desafio atual no Estado se quiseres começar um novo.
          </p>
          <div style={{ maxWidth: "220px", marginTop: "8px" }}>
            <Button onClick={() => onNavigate("dashboard")}>Ver estado atual</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--white)", overflow: "hidden" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />
      <Sidebar active="challenge" onNavigate={onNavigate} />
      <main style={mainStyle}>
        <p style={eyebrow}>Novo desafio</p>
        <h1 style={headline}>Comprometer.</h1>
        <p style={subtext}>Define a duração e o teu motivo. Não há volta atrás fácil.</p>
        <div style={{ height: "1px", background: "var(--gray-200)", marginBottom: "32px" }} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "480px" }}>
          {/* Duração */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={fieldLabel}>Duração</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {PRESET_DAYS.map(d => (
                <button key={d} type="button" onClick={() => handlePreset(d)} style={{
                  padding: "9px 18px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--mono)", fontSize: "12px", background: "transparent", cursor: "pointer",
                  color: selectedDays === d && !useCustom ? "var(--green)" : "var(--gray-600)",
                  borderColor: selectedDays === d && !useCustom ? "var(--green)" : "var(--gray-200)",
                  background: selectedDays === d && !useCustom ? "var(--green-subtle)" : "transparent",
                } as React.CSSProperties}>
                  {d} dias
                </button>
              ))}
            </div>
            <Input
              id="custom-days" type="text" inputMode="numeric"
              placeholder="Personalizado (mín. 7 dias)"
              value={customDays} onChange={handleCustomChange}
              style={{ borderColor: useCustom ? "var(--green)" : "var(--gray-200)" }}
            />
            {useCustom && customDays && parseInt(customDays) < 7 && (
              <p style={{ fontSize: "11px", color: "var(--red-muted)" }}>Mínimo de 7 dias.</p>
            )}
          </div>

          {/* Motivo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={fieldLabel}>Estou a fazer isto porque…</label>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Escreve o teu motivo. Vais rever isto se tentares desistir."
              rows={4} maxLength={500}
              style={{ padding: "12px 14px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: "12px", color: "var(--gray-800)", background: "var(--white)", outline: "none", resize: "none", width: "100%", lineHeight: "1.6", transition: "border-color 0.15s" }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--green)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--gray-200)"}
            />
            <p style={{ fontSize: "10px", color: "var(--gray-400)", textAlign: "right" }}>{reason.length}/500</p>
          </div>

          <ErrorMsg message={error} />

          {/* Preview */}
          {effectiveDays && effectiveDays >= 7 && (
            <div style={{ padding: "14px 18px", background: "var(--green-subtle)", borderLeft: "2px solid var(--green)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--green)", marginBottom: "4px" }}>Resumo</p>
              <p style={{ fontSize: "12px", color: "var(--green)" }}>
                {effectiveDays} dias — termina a{" "}
                {new Date(Date.now() + effectiveDays * 86400000).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          )}

          <div style={{ maxWidth: "260px" }}>
            <Button type="submit" loading={loading} disabled={!canSubmit}>Iniciar desafio</Button>
          </div>
        </form>
      </main>
    </div>
  );
}

const mainStyle: React.CSSProperties = { flex: 1, padding: "52px 56px 40px", display: "flex", flexDirection: "column", overflowY: "auto" };
const eyebrow: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "6px" };
const headline: React.CSSProperties = { fontFamily: "var(--serif)", fontSize: "32px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.1, marginBottom: "8px" };
const subtext: React.CSSProperties = { fontSize: "12px", color: "var(--gray-400)", lineHeight: "1.7", marginBottom: "28px" };
const fieldLabel: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gray-400)" };
