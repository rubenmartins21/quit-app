import React, { useEffect, useState, useCallback } from "react";
import { ipc, ChallengeData, InstalledApp, BlockedApp } from "../lib/ipc";
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

  // Blocker preferences
  const [blockReddit, setBlockReddit] = useState(false);
  const [blockTwitter, setBlockTwitter] = useState(false);
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");

  // App picker
  const [installedApps, setInstalledApps] = useState<InstalledApp[] | null>(null);
  const [appSearch, setAppSearch] = useState("");
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    ipc.challenge.active().then((res) => setHasActive(!!res.challenge));
  }, []);

  async function handleLoadApps() {
    if (installedApps !== null) { setShowAppPicker(true); return; }
    setLoadingApps(true);
    const res = await ipc.blocker.installedApps();
    setInstalledApps(res.apps ?? []);
    setLoadingApps(false);
    setShowAppPicker(true);
  }

  function toggleApp(app: InstalledApp) {
    setBlockedApps(prev => {
      const exists = prev.find(a => a.exePath === app.exePath);
      if (exists) return prev.filter(a => a.exePath !== app.exePath);
      return [...prev, { name: app.name, exePath: app.exePath }];
    });
  }

  function addCustomUrl() {
    const url = urlInput.trim();
    if (!url || customUrls.includes(url)) return;
    setCustomUrls(prev => [...prev, url]);
    setUrlInput("");
  }

  function removeUrl(url: string) {
    setCustomUrls(prev => prev.filter(u => u !== url));
  }

  const effectiveDays = useCustom ? parseInt(customDays, 10) : selectedDays;
  const filteredApps = (installedApps ?? []).filter(a =>
    a.name.toLowerCase().includes(appSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!effectiveDays || isNaN(effectiveDays)) { setError("Escolhe uma duração."); return; }
    if (effectiveDays < 7) { setError("Mínimo de 7 dias."); return; }
    if (reason.trim().length < 10) { setError("Escreve pelo menos 10 caracteres no motivo."); return; }

    setLoading(true);
    const res = await ipc.challenge.create({
      durationDays: effectiveDays,
      reason: reason.trim(),
      blockReddit,
      blockTwitter,
      blockedApps,
      blockedUrls: customUrls,
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.ok && res.challenge) onCreated(res.challenge);
  }

  const canSubmit = !!effectiveDays && effectiveDays >= 7 && reason.trim().length >= 10;

  if (hasActive === null) {
    return (
      <div style={{ height: "100vh", display: "flex", background: "var(--white)" }}>
        <div className="drag-region" style={dragRegion} />
        <Sidebar active="challenge" onNavigate={onNavigate} />
        <main style={mainStyle}><p style={{ fontSize: "12px", color: "var(--gray-400)" }}>A carregar...</p></main>
      </div>
    );
  }

  if (hasActive) {
    return (
      <div style={{ height: "100vh", display: "flex", background: "var(--white)" }}>
        <div className="drag-region" style={dragRegion} />
        <Sidebar active="challenge" onNavigate={onNavigate} />
        <main style={mainStyle}>
          <p style={eyebrow}>Desafio</p>
          <h1 style={headline}>Já tens um desafio ativo.</h1>
          <p style={subtext}>Só é possível ter um desafio de cada vez.<br />Cancela o desafio atual no Estado se quiseres começar um novo.</p>
          <div style={{ maxWidth: "220px", marginTop: "8px" }}>
            <Button onClick={() => onNavigate("dashboard")}>Ver estado atual</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--white)", overflow: "hidden" }}>
      <div className="drag-region" style={dragRegion} />
      <Sidebar active="challenge" onNavigate={onNavigate} />
      <main style={mainStyle}>
        <p style={eyebrow}>Novo desafio</p>
        <h1 style={headline}>Comprometer.</h1>
        <p style={subtext}>Define a duração e o teu motivo. Não há volta atrás fácil.</p>
        <div style={divider} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "520px" }}>

          {/* ── Duração ── */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>Duração</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {PRESET_DAYS.map((d) => (
                <button key={d} type="button" onClick={() => { setSelectedDays(d); setUseCustom(false); setCustomDays(""); setError(""); }}
                  style={{ ...presetBtn, color: selectedDays === d && !useCustom ? "var(--green)" : "var(--gray-600)", borderColor: selectedDays === d && !useCustom ? "var(--green)" : "var(--gray-200)", background: selectedDays === d && !useCustom ? "var(--green-subtle)" : "transparent" }}>
                  {d} dias
                </button>
              ))}
            </div>
            <Input id="custom-days" type="text" inputMode="numeric" placeholder="Personalizado (mín. 7 dias)" value={customDays}
              onChange={e => { const v = e.target.value.replace(/\D/g, ""); setCustomDays(v); setUseCustom(true); setSelectedDays(null); setError(""); }}
              style={{ borderColor: useCustom ? "var(--green)" : "var(--gray-200)" }} />
            {useCustom && customDays && parseInt(customDays) < 7 && (
              <p style={{ fontSize: "11px", color: "var(--red-muted)" }}>Mínimo de 7 dias.</p>
            )}
          </div>

          {/* ── Motivo ── */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>Estou a fazer isto porque…</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Escreve o teu motivo. Vais rever isto se tentares desistir."
              rows={4} maxLength={500}
              style={textareaStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--green)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--gray-200)"} />
            <p style={{ fontSize: "10px", color: "var(--gray-400)", textAlign: "right" }}>{reason.length}/500</p>
          </div>

          {/* ── Bloqueios ── */}
          <div style={fieldGroup}>
            <label style={fieldLabel}>O que bloquear durante o desafio</label>
            <p style={{ fontSize: "11px", color: "var(--gray-400)", marginBottom: "12px", lineHeight: "1.6" }}>
              Estes bloqueios são aplicados ao sistema inteiro — browser, apps, tudo. Só são removidos quando o desafio terminar.
            </p>

            {/* Reddit + Twitter toggles */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <ToggleRow
                label="Reddit"
                description="reddit.com e todos os CDNs (v.redd.it, etc.)"
                checked={blockReddit}
                onChange={setBlockReddit}
              />
              <ToggleRow
                label="Twitter / X"
                description="twitter.com, x.com e app de desktop"
                checked={blockTwitter}
                onChange={setBlockTwitter}
              />
            </div>

            {/* Apps instaladas */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--gray-600)" }}>Apps instaladas</span>
                <button type="button" onClick={handleLoadApps} disabled={loadingApps}
                  style={{ ...smallBtn, opacity: loadingApps ? 0.5 : 1 }}>
                  {loadingApps ? "A carregar..." : "Seleccionar apps"}
                </button>
              </div>

              {blockedApps.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {blockedApps.map(app => (
                    <AppTag key={app.exePath} name={app.name} onRemove={() => setBlockedApps(p => p.filter(a => a.exePath !== app.exePath))} />
                  ))}
                </div>
              )}
            </div>

            {/* URLs custom */}
            <div>
              <span style={{ fontSize: "11px", color: "var(--gray-600)", display: "block", marginBottom: "8px" }}>URLs / domínios adicionais</span>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="ex: instagram.com"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomUrl(); } }}
                  style={{ ...urlInputStyle }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--green)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--gray-200)"}
                />
                <button type="button" onClick={addCustomUrl} style={addBtn}>+</button>
              </div>
              {customUrls.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {customUrls.map(url => (
                    <AppTag key={url} name={url} onRemove={() => removeUrl(url)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {effectiveDays && effectiveDays >= 7 && (
            <div style={{ padding: "14px 18px", background: "var(--green-subtle)", borderLeft: "2px solid var(--green)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--green)", marginBottom: "4px" }}>Resumo</p>
              <p style={{ fontSize: "12px", color: "var(--green)", marginBottom: "4px" }}>
                {effectiveDays} dias — termina a {new Date(Date.now() + effectiveDays * 86400000).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              {(blockReddit || blockTwitter || blockedApps.length > 0 || customUrls.length > 0) && (
                <p style={{ fontSize: "11px", color: "var(--green)", opacity: 0.8 }}>
                  Bloqueios: {[
                    blockReddit && "Reddit",
                    blockTwitter && "Twitter",
                    blockedApps.length > 0 && `${blockedApps.length} app${blockedApps.length > 1 ? "s" : ""}`,
                    customUrls.length > 0 && `${customUrls.length} URL${customUrls.length > 1 ? "s" : ""}`,
                  ].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          )}

          <ErrorMsg message={error} />
          <div style={{ maxWidth: "260px" }}>
            <Button type="submit" loading={loading} disabled={!canSubmit}>Iniciar desafio</Button>
          </div>
        </form>
      </main>

      {/* App Picker Modal */}
      {showAppPicker && (
        <div style={modalOverlay} onClick={() => setShowAppPicker(false)}>
          <div style={modalPanel} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ ...fieldLabel, fontSize: "11px" }}>Apps instaladas</p>
              <button onClick={() => setShowAppPicker(false)} style={{ background: "none", border: "none", color: "var(--gray-400)", cursor: "pointer", fontSize: "14px" }}>✕</button>
            </div>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={appSearch}
              onChange={e => setAppSearch(e.target.value)}
              style={{ ...urlInputStyle, marginBottom: "12px", width: "100%" }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--green)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--gray-200)"}
              autoFocus
            />
            <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
              {filteredApps.length === 0 && (
                <p style={{ fontSize: "12px", color: "var(--gray-400)", padding: "12px 0" }}>Nenhuma app encontrada.</p>
              )}
              {filteredApps.map(app => {
                const isSelected = blockedApps.some(a => a.exePath === app.exePath);
                return (
                  <div key={app.exePath} onClick={() => toggleApp(app)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "var(--radius-sm)", cursor: "pointer", background: isSelected ? "var(--green-subtle)" : "transparent", transition: "background 0.1s" }}>
                    <span style={{ fontSize: "12px", color: isSelected ? "var(--green)" : "var(--gray-800)" }}>{app.name}</span>
                    {isSelected && <span style={{ fontSize: "10px", color: "var(--green)" }}>✓</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowAppPicker(false)} style={{ ...smallBtn, borderColor: "var(--green)", color: "var(--green)" }}>
                Confirmar ({blockedApps.length} seleccionadas)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: `1px solid ${checked ? "var(--green)" : "var(--gray-200)"}`, borderRadius: "var(--radius-sm)", cursor: "pointer", background: checked ? "var(--green-subtle)" : "transparent", transition: "all 0.15s" }}>
      <div>
        <p style={{ fontSize: "12px", color: checked ? "var(--green)" : "var(--gray-800)", fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: "10px", color: checked ? "var(--green)" : "var(--gray-400)", marginTop: "2px", opacity: 0.8 }}>{description}</p>
      </div>
      <div style={{ width: "36px", height: "20px", borderRadius: "10px", background: checked ? "var(--green)" : "var(--gray-200)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: "3px", left: checked ? "19px" : "3px", width: "14px", height: "14px", borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
      </div>
    </div>
  );
}

function AppTag({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 8px 3px 10px", background: "var(--green-subtle)", color: "var(--green)", fontSize: "11px", borderRadius: "99px", border: "1px solid var(--green)" }}>
      {name}
      <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "var(--green)", cursor: "pointer", fontSize: "12px", lineHeight: 1, padding: 0, opacity: 0.7 }}>×</button>
    </span>
  );
}

const dragRegion: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 };
const mainStyle: React.CSSProperties = { flex: 1, padding: "52px 56px 40px", display: "flex", flexDirection: "column", overflowY: "auto" };
const eyebrow: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: "6px" };
const headline: React.CSSProperties = { fontFamily: "var(--serif)", fontSize: "32px", color: "var(--gray-800)", fontWeight: 400, lineHeight: 1.1, marginBottom: "8px" };
const subtext: React.CSSProperties = { fontSize: "12px", color: "var(--gray-400)", lineHeight: "1.7", marginBottom: "28px" };
const divider: React.CSSProperties = { height: "1px", background: "var(--gray-200)", marginBottom: "32px" };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "10px" };
const fieldLabel: React.CSSProperties = { fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gray-400)" };
const presetBtn: React.CSSProperties = { padding: "9px 18px", border: "1px solid", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: "12px", cursor: "pointer" };
const textareaStyle: React.CSSProperties = { padding: "12px 14px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: "12px", color: "var(--gray-800)", background: "var(--white)", outline: "none", resize: "none", width: "100%", lineHeight: "1.6", transition: "border-color 0.15s" };
const urlInputStyle: React.CSSProperties = { flex: 1, padding: "8px 12px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: "12px", color: "var(--gray-800)", background: "var(--white)", outline: "none", transition: "border-color 0.15s" };
const addBtn: React.CSSProperties = { padding: "8px 14px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: "16px", color: "var(--gray-600)", background: "transparent", cursor: "pointer" };
const smallBtn: React.CSSProperties = { padding: "6px 12px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.08em", color: "var(--gray-600)", background: "transparent", cursor: "pointer" };
const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(2px)" };
const modalPanel: React.CSSProperties = { background: "var(--white)", borderRadius: "var(--radius-md)", padding: "24px", width: "420px", maxWidth: "90vw", boxShadow: "0 8px 48px rgba(0,0,0,0.12)", border: "1px solid var(--gray-200)" };
