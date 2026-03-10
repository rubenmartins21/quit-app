/**
 * CreateChallengeScreen.tsx — Quit design system
 * Localização: src/renderer/screens/CreateChallengeScreen.tsx
 */

import React, { useEffect, useState } from "react";
import { ipc, ChallengeData, InstalledApp, BlockedApp } from "../lib/ipc";
import { Sidebar } from "../components/Sidebar";
import { AppScreen } from "../App";
import { useI18n } from "../lib/i18n";

interface Props {
  onCreated: (challenge: ChallengeData) => void;
  onNavigate: (screen: AppScreen) => void;
}

const PRESET_DAYS = [7, 30, 90];
const REASON_MIN  = 10;

export function CreateChallengeScreen({ onCreated, onNavigate }: Props) {
  const { t } = useI18n();

  const [hasActive,     setHasActive]     = useState<boolean | null>(null);
  const [selectedDays,  setSelectedDays]  = useState<number | null>(30);
  const [customDays,    setCustomDays]    = useState("");
  const [useCustom,     setUseCustom]     = useState(false);
  const [reason,        setReason]        = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const [blockReddit,   setBlockReddit]   = useState(false);
  const [blockTwitter,  setBlockTwitter]  = useState(false);
  const [blockedApps,   setBlockedApps]   = useState<BlockedApp[]>([]);
  const [customUrls,    setCustomUrls]    = useState<string[]>([]);
  const [urlInput,      setUrlInput]      = useState("");
  const [installedApps, setInstalledApps] = useState<InstalledApp[] | null>(null);
  const [appSearch,     setAppSearch]     = useState("");
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [loadingApps,   setLoadingApps]   = useState(false);

  useEffect(() => {
    ipc.challenge.active().then(r => setHasActive(!!r.challenge));
  }, []);

  async function handleLoadApps() {
    if (installedApps !== null) { setShowAppPicker(true); return; }
    setLoadingApps(true);
    const r = await ipc.blocker.installedApps();
    setInstalledApps(r.apps ?? []);
    setLoadingApps(false);
    setShowAppPicker(true);
  }

  function toggleApp(app: InstalledApp) {
    setBlockedApps(p => p.find(a => a.exePath === app.exePath)
      ? p.filter(a => a.exePath !== app.exePath)
      : [...p, { name: app.name, exePath: app.exePath }]);
  }

  function addCustomUrl() {
    const u = urlInput.trim();
    if (!u || customUrls.includes(u)) return;
    setCustomUrls(p => [...p, u]);
    setUrlInput("");
  }

  const effectiveDays  = useCustom ? parseInt(customDays, 10) : selectedDays;
  const filteredApps   = (installedApps ?? []).filter(a => a.name.toLowerCase().includes(appSearch.toLowerCase()));
  const daysValid      = !!effectiveDays && !isNaN(effectiveDays) && effectiveDays >= 7;
  const reasonValid    = reason.trim().length >= REASON_MIN;
  const canSubmit      = daysValid && reasonValid;
  const reasonMissing  = Math.max(0, REASON_MIN - reason.trim().length);
  const showReasonHint = reasonTouched && !reasonValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setReasonTouched(true);
    if (!daysValid)   { setError(t.create.daysMin); return; }
    if (!reasonValid) { setError(t.create.reasonMin(reasonMissing)); return; }
    setLoading(true);
    const res = await ipc.challenge.create({
      durationDays: effectiveDays!, reason: reason.trim(),
      blockReddit, blockTwitter, blockedApps, blockedUrls: customUrls,
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.ok && res.challenge) onCreated(res.challenge);
  }

  if (hasActive === null) return (
    <ChallengeShell onNavigate={onNavigate}>
      <main style={mainS}>
        <p style={{ fontSize: "13px", color: "#6B6B6B" }}>{t.common.loading}</p>
      </main>
    </ChallengeShell>
  );

  if (hasActive) return (
    <ChallengeShell onNavigate={onNavigate}>
      <main style={mainS}>
        <div style={S.eyebrow}>{t.nav.challenge}</div>
        <div style={S.headline}>{t.create.alreadyActive}</div>
        <p style={{ fontSize: "13px", color: "#6B6B6B", lineHeight: 1.7, marginBottom: "24px", maxWidth: "400px" }}>
          {t.create.alreadyActiveDesc.split("\n").join(" ")}
        </p>
        <button style={S.btnPrimary} onClick={() => onNavigate("dashboard")}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#173222"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1F3D2B"; }}
        >
          {t.create.viewStatus}
        </button>
      </main>
    </ChallengeShell>
  );

  // ── End date preview
  const endDate = effectiveDays && daysValid
    ? new Date(Date.now() + effectiveDays * 86_400_000).toLocaleDateString()
    : null;

  return (
    <ChallengeShell onNavigate={onNavigate}>
      <main style={{ ...mainS, overflowY: "auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "540px" }}>

          {/* Header */}
          <div>
            <div style={S.eyebrow}>{t.nav.challenge}</div>
            <div style={S.headline}>{t.create.title}</div>
          </div>

          <div style={{ height: "1px", background: "#E4EBE7" }} />

          {/* Duration */}
          <div>
            <div style={S.label}>{t.create.duration}</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
              {PRESET_DAYS.map(d => (
                <button key={d} type="button"
                  onClick={() => { setSelectedDays(d); setUseCustom(false); }}
                  style={{
                    ...S.preset,
                    borderColor: !useCustom && selectedDays === d ? "#1F3D2B" : "#C8D8CE",
                    color:       !useCustom && selectedDays === d ? "#1F3D2B" : "#6B6B6B",
                    background:  !useCustom && selectedDays === d ? "#EBF2EE" : "transparent",
                  }}
                >
                  {d} {t.common.days}
                </button>
              ))}
              <button type="button"
                onClick={() => setUseCustom(true)}
                style={{
                  ...S.preset,
                  borderColor: useCustom ? "#1F3D2B" : "#C8D8CE",
                  color:       useCustom ? "#1F3D2B" : "#6B6B6B",
                  background:  useCustom ? "#EBF2EE" : "transparent",
                }}
              >
                {t.create.customPlaceholder}
              </button>
            </div>
            {useCustom && (
              <input
                type="number" min={7} placeholder="Ex: 21"
                value={customDays}
                onChange={e => setCustomDays(e.target.value)}
                style={{ ...S.input, marginTop: "10px", width: "120px" }}
              />
            )}
            {useCustom && customDays && !daysValid && (
              <p style={S.hint}>{t.create.daysMin}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <div style={S.label}>{t.create.reason}</div>
            <textarea
              rows={4}
              placeholder={`${t.create.reason}…`}
              value={reason}
              onChange={e => setReason(e.target.value)}
              onBlur={() => setReasonTouched(true)}
              style={S.textarea}
            />
            {showReasonHint && (
              <p style={S.hint}>{t.create.reasonMin(reasonMissing)}</p>
            )}
          </div>

          {/* Blocking */}
          <div>
            <div style={S.label}>{t.create.blocking}</div>
            <p style={{ fontSize: "11px", color: "#6B6B6B", marginBottom: "12px", lineHeight: 1.6 }}>{t.create.blockingDesc}</p>
            <ToggleRow label="Reddit" desc="reddit.com" checked={blockReddit} onChange={setBlockReddit} />
            <ToggleRow label="Twitter / X" desc="twitter.com, x.com" checked={blockTwitter} onChange={setBlockTwitter} />

            {/* Custom URLs */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ ...S.label, marginBottom: "8px" }}>{t.create.additionalUrls}</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text" value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomUrl(); } }}
                  placeholder={t.create.urlPlaceholder}
                  style={{ ...S.input, flex: 1 }}
                />
                <button type="button" onClick={addCustomUrl} style={S.btnSecondary}>+</button>
              </div>
              {customUrls.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, marginTop: "8px" }}>
                  {customUrls.map(u => (
                    <span key={u} style={S.urlTag}>
                      {u}
                      <span onClick={() => setCustomUrls(p => p.filter(x => x !== u))} style={{ marginLeft: "6px", cursor: "pointer", opacity: .6 }}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* App picker */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ ...S.label, marginBottom: "8px" }}>{t.create.installedApps}</div>
              <button type="button" onClick={handleLoadApps} style={S.btnSecondary} disabled={loadingApps}>
                {loadingApps ? t.create.loading : blockedApps.length > 0 ? t.create.confirm(blockedApps.length) : t.create.select}
              </button>
              {showAppPicker && installedApps !== null && (
                <div style={S.appPickerWrap}>
                  <input
                    type="text" value={appSearch} onChange={e => setAppSearch(e.target.value)}
                    placeholder="Pesquisar…"
                    style={{ ...S.input, marginBottom: "8px" }}
                  />
                  {filteredApps.length === 0
                    ? <p style={{ fontSize: "12px", color: "#6B6B6B" }}>{t.create.noAppsFound}</p>
                    : filteredApps.map(app => {
                      const sel = !!blockedApps.find(a => a.exePath === app.exePath);
                      return (
                        <div key={app.exePath} onClick={() => toggleApp(app)} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 12px", borderRadius: "5px", cursor: "pointer",
                          background: sel ? "#EBF2EE" : "transparent",
                          marginBottom: "2px",
                        }}>
                          <span style={{ fontSize: "13px", color: "#1C1C1C" }}>{app.name}</span>
                          {sel && <span style={{ fontSize: "11px", color: "#1F3D2B", fontWeight: 600 }}>✓</span>}
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {endDate && (
            <div style={S.summary}>
              <div style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: ".12em", color: "#1F3D2B", marginBottom: "4px" }}>
                {t.create.summary}
              </div>
              <div style={{ fontSize: "13px", color: "#1F3D2B", fontWeight: 500 }}>
                {t.create.summaryText(effectiveDays!, endDate)}
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p style={{ fontSize: "12px", color: "#C44536" }}>{error}</p>}

          {/* Submit */}
          <button type="submit" disabled={loading || !canSubmit} style={{
            ...S.btnPrimary,
            opacity: !canSubmit ? .5 : 1,
            cursor: !canSubmit ? "not-allowed" : "pointer",
          }}
            onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLElement).style.background = "#173222"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1F3D2B"; }}
          >
            {loading ? t.create.startingMsg : t.create.btn}
          </button>
        </form>
      </main>
    </ChallengeShell>
  );
}

// ── ChallengeShell — defined OUTSIDE the main component to prevent remounts ───

function ChallengeShell({ children, onNavigate }: { children: React.ReactNode; onNavigate: (s: AppScreen) => void }) {
  return (
    <div style={{ height: "100vh", display: "flex", background: "#F7F9F8", overflow: "hidden", position: "relative" }}>
      <div className="drag-region" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28px", zIndex: 10 }} />
      <Sidebar active="challenge" onNavigate={onNavigate} />
      {children}
    </div>
  );
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 14px", borderRadius: "5px", cursor: "pointer",
      border: `1.5px solid ${checked ? "#1F3D2B" : "#E4EBE7"}`,
      background: checked ? "#EBF2EE" : "#fff",
      marginBottom: "6px", transition: "all .15s",
    }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: checked ? "#1F3D2B" : "#1C1C1C" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "#6B6B6B", marginTop: "2px" }}>{desc}</div>
      </div>
      {/* Toggle switch */}
      <div style={{ width: "34px", height: "20px", borderRadius: "10px", background: checked ? "#1F3D2B" : "#C8D8CE", position: "relative", flexShrink: 0, transition: "background .2s" }}>
        <div style={{ position: "absolute", top: "3px", left: checked ? "17px" : "3px", width: "14px", height: "14px", borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const mainS: React.CSSProperties = {
  flex: 1, padding: "40px 44px 32px", overflowY: "auto", display: "flex", flexDirection: "column",
};

const S: Record<string, React.CSSProperties> = {
  eyebrow: { fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B8F7A", marginBottom: "6px" },
  headline: { fontSize: "28px", fontWeight: 700, letterSpacing: "-.5px", color: "#1C1C1C", lineHeight: 1.1 },
  label: { fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B6B6B", marginBottom: "8px" },
  preset: { padding: "7px 14px", borderRadius: "5px", border: "1.5px solid", fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all .15s" },
  input: { padding: "9px 12px", border: "1.5px solid #C8D8CE", borderRadius: "5px", fontSize: "13px", color: "#1C1C1C", background: "#fff", outline: "none", width: "100%" },
  textarea: { padding: "10px 12px", border: "1.5px solid #C8D8CE", borderRadius: "5px", fontSize: "13px", color: "#1C1C1C", background: "#fff", outline: "none", width: "100%", resize: "vertical" as const, lineHeight: 1.65, fontFamily: "Inter, sans-serif" },
  hint: { fontSize: "11px", color: "#C44536", marginTop: "5px" },
  btnPrimary: { padding: "11px 22px", border: "none", borderRadius: "5px", fontSize: "12px", fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase" as const, color: "#fff", background: "#1F3D2B", transition: "background .15s" },
  btnSecondary: { padding: "8px 14px", border: "1.5px solid #C8D8CE", borderRadius: "5px", fontSize: "12px", fontWeight: 500, color: "#1C1C1C", background: "transparent", cursor: "pointer", transition: "all .15s" },
  urlTag: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "99px", border: "1px solid #C8D8CE", fontSize: "11px", color: "#1C1C1C", background: "#EBF2EE" },
  appPickerWrap: { marginTop: "10px", maxHeight: "200px", overflowY: "auto" as const, border: "1px solid #E4EBE7", borderRadius: "5px", padding: "8px" },
  summary: { padding: "12px 16px", background: "#EBF2EE", borderLeft: "2px solid #1F3D2B", borderRadius: "0 5px 5px 0" },
};
