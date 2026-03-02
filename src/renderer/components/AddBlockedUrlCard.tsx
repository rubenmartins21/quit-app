import React, { useState, useEffect, useCallback } from "react";
import { ipc, BlockerStatus, InstalledApp } from "../lib/ipc";

interface Props {
  blockerStatus: BlockerStatus;
  onUpdated: () => void;
}

export function AddBlockedUrlCard({ blockerStatus, onUpdated }: Props) {
  // Estado local optimista — reflecte imediatamente as mudanças sem esperar pelo IPC
  const [localStatus, setLocalStatus] = useState<BlockerStatus>(blockerStatus);

  // Sincroniza quando o pai actualiza (ex: ao mudar de página e voltar)
  useEffect(() => {
    setLocalStatus(blockerStatus);
  }, [blockerStatus]);

  const [urlInput, setUrlInput] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [loadingReddit, setLoadingReddit] = useState(false);
  const [loadingTwitter, setLoadingTwitter] = useState(false);
  const [addingApp, setAddingApp] = useState<string | null>(null); // exePath da app a ser adicionada
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // App picker
  const [installedApps, setInstalledApps] = useState<InstalledApp[] | null>(null);
  const [appSearch, setAppSearch] = useState("");
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  function showFeedback(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  }

  async function handleAddUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setLoadingUrl(true);

    // Actualização optimista
    const optimisticStatus = {
      ...localStatus,
      blockedUrls: [...localStatus.blockedUrls, url],
    };
    setLocalStatus(optimisticStatus);
    setUrlInput("");

    const res = await ipc.blocker.add({ url });
    setLoadingUrl(false);
    if (res.error) {
      // Reverte se falhou
      setLocalStatus(localStatus);
      setUrlInput(url);
      showFeedback(res.error, true);
      return;
    }
    showFeedback(`"${url}" adicionado ao bloqueio.`);
    onUpdated(); // sincroniza com o servidor em background
  }

  async function handleEnableReddit() {
    // Só permite activar, nunca desactivar
    if (localStatus.blockReddit) return;
    setLoadingReddit(true);

    setLocalStatus(prev => ({ ...prev, blockReddit: true }));

    const res = await ipc.blocker.add({ blockReddit: true });
    setLoadingReddit(false);
    if (res.error) {
      setLocalStatus(prev => ({ ...prev, blockReddit: false }));
      showFeedback(res.error, true);
      return;
    }
    showFeedback("Reddit bloqueado.");
    onUpdated();
  }

  async function handleEnableTwitter() {
    // Só permite activar, nunca desactivar
    if (localStatus.blockTwitter) return;
    setLoadingTwitter(true);

    setLocalStatus(prev => ({ ...prev, blockTwitter: true }));

    const res = await ipc.blocker.add({ blockTwitter: true });
    setLoadingTwitter(false);
    if (res.error) {
      setLocalStatus(prev => ({ ...prev, blockTwitter: false }));
      showFeedback(res.error, true);
      return;
    }
    showFeedback("Twitter bloqueado.");
    onUpdated();
  }

  async function handleLoadApps() {
    if (installedApps !== null) { setShowAppPicker(true); return; }
    setLoadingApps(true);
    const res = await ipc.blocker.installedApps();
    setInstalledApps(res.apps ?? []);
    setLoadingApps(false);
    setShowAppPicker(true);
  }

  async function handleAddApp(app: InstalledApp) {
    setAddingApp(app.exePath);

    // Actualização optimista
    setLocalStatus(prev => ({
      ...prev,
      blockedApps: [...prev.blockedApps, { name: app.name, exePath: app.exePath }],
    }));
    setShowAppPicker(false);

    const res = await ipc.blocker.add({ app: { name: app.name, exePath: app.exePath } });
    setAddingApp(null);
    if (res.error) {
      // Reverte
      setLocalStatus(prev => ({
        ...prev,
        blockedApps: prev.blockedApps.filter(a => a.exePath !== app.exePath),
      }));
      showFeedback(res.error, true);
      return;
    }
    showFeedback(`"${app.name}" bloqueada.`);
    onUpdated();
  }

  const filteredApps = (installedApps ?? []).filter(a =>
    a.name.toLowerCase().includes(appSearch.toLowerCase()) &&
    !localStatus.blockedApps.some(b => b.exePath === a.exePath)
  );

  return (
    <>
      <div style={card}>
        <p style={fieldLabel}>Bloqueios activos</p>
        <p style={{ fontSize: "11px", color: "var(--gray-400)", marginTop: "2px", marginBottom: "16px", lineHeight: "1.5" }}>
          Só são removidos quando o desafio terminar. Cada adição requer confirmação de administrador.
        </p>

        {/* Reddit / Twitter — só permite activar, não desactivar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          <PlatformRow
            label="Reddit"
            description="reddit.com e todos os CDNs"
            enabled={localStatus.blockReddit}
            loading={loadingReddit}
            onEnable={handleEnableReddit}
          />
          <PlatformRow
            label="Twitter / X"
            description="twitter.com, x.com e app de desktop"
            enabled={localStatus.blockTwitter}
            loading={loadingTwitter}
            onEnable={handleEnableTwitter}
          />
        </div>

        {/* Apps bloqueadas */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--gray-600)" }}>Apps bloqueadas</span>
            <button
              onClick={handleLoadApps}
              disabled={loadingApps || addingApp !== null}
              style={{ ...smallBtn, opacity: loadingApps || addingApp !== null ? 0.5 : 1 }}
            >
              {loadingApps ? "A carregar..." : addingApp !== null ? "A bloquear..." : "+ Adicionar app"}
            </button>
          </div>
          {localStatus.blockedApps.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {localStatus.blockedApps.map(a => <Tag key={a.exePath} label={a.name} />)}
            </div>
          ) : (
            <p style={{ fontSize: "11px", color: "var(--gray-400)" }}>Nenhuma app bloqueada.</p>
          )}
        </div>

        {/* URLs bloqueados */}
        <div>
          <span style={{ fontSize: "11px", color: "var(--gray-600)", display: "block", marginBottom: "8px" }}>
            URLs / domínios bloqueados
          </span>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input
              type="text"
              placeholder="ex: instagram.com"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
              disabled={loadingUrl}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = "var(--green)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--gray-200)"}
            />
            <button
              onClick={handleAddUrl}
              disabled={loadingUrl || !urlInput.trim()}
              style={{ ...addBtn, opacity: loadingUrl || !urlInput.trim() ? 0.4 : 1 }}
            >
              {loadingUrl ? "…" : "+"}
            </button>
          </div>
          {localStatus.blockedUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {localStatus.blockedUrls.map(url => <Tag key={url} label={url} />)}
            </div>
          )}
        </div>

        {error   && <p style={{ fontSize: "11px", color: "var(--red-muted)", marginTop: "10px" }}>{error}</p>}
        {success && <p style={{ fontSize: "11px", color: "var(--green)", marginTop: "10px" }}>{success}</p>}
      </div>

      {/* App Picker Modal */}
      {showAppPicker && (
        <div style={overlay} onClick={() => setShowAppPicker(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={fieldLabel}>Seleccionar app para bloquear</p>
              <button
                onClick={() => setShowAppPicker(false)}
                style={{ background: "none", border: "none", color: "var(--gray-400)", cursor: "pointer", fontSize: "14px" }}
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={appSearch}
              onChange={e => setAppSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: "12px", width: "100%" }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--green)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--gray-200)"}
              autoFocus
            />
            <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
              {filteredApps.length === 0 && (
                <p style={{ fontSize: "12px", color: "var(--gray-400)", padding: "12px 0" }}>
                  {appSearch ? "Nenhuma app encontrada." : "Todas as apps já estão bloqueadas."}
                </p>
              )}
              {filteredApps.map(app => (
                <div
                  key={app.exePath}
                  onClick={() => handleAddApp(app)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: "var(--radius-sm)",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--gray-50)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontSize: "12px", color: "var(--gray-800)" }}>{app.name}</span>
                  <span style={{ fontSize: "10px", color: "var(--green)" }}>+ bloquear</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Linha de plataforma — apenas permite activar, nunca desactivar.
 * Quando já está activo, mostra badge "Bloqueado" sem cursor pointer.
 */
function PlatformRow({ label, description, enabled, loading, onEnable }: {
  label: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onEnable: () => void;
}) {
  return (
    <div
      onClick={() => !enabled && !loading && onEnable()}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 12px",
        border: `1px solid ${enabled ? "var(--green)" : "var(--gray-200)"}`,
        borderRadius: "var(--radius-sm)",
        // cursor: pointer só quando ainda não está activo
        cursor: enabled ? "default" : loading ? "wait" : "pointer",
        background: enabled ? "var(--green-subtle)" : "transparent",
        transition: "all 0.15s",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <div>
        <p style={{ fontSize: "12px", color: enabled ? "var(--green)" : "var(--gray-800)" }}>
          {label}
        </p>
        <p style={{ fontSize: "10px", color: enabled ? "var(--green)" : "var(--gray-400)", opacity: 0.8, marginTop: "1px" }}>
          {description}
        </p>
      </div>

      {loading ? (
        <span style={{ fontSize: "10px", color: "var(--gray-400)" }}>A bloquear…</span>
      ) : enabled ? (
        // Já activo — badge sem switch, sem cursor pointer
        <span style={{
          fontSize: "10px", color: "var(--green)",
          background: "rgba(26,61,43,0.08)",
          padding: "3px 10px", borderRadius: "99px",
          border: "1px solid var(--green)",
          letterSpacing: "0.05em",
        }}>
          Bloqueado ✓
        </span>
      ) : (
        // Inactivo — switch visual
        <div style={{
          width: "34px", height: "18px", borderRadius: "9px",
          background: "var(--gray-200)", position: "relative",
          transition: "background 0.2s", flexShrink: 0,
        }}>
          <div style={{
            position: "absolute", top: "3px", left: "3px",
            width: "12px", height: "12px", borderRadius: "50%",
            background: "white", transition: "left 0.2s",
          }} />
        </div>
      )}
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{
      padding: "3px 10px",
      background: "var(--green-subtle)",
      color: "var(--green)",
      fontSize: "11px",
      borderRadius: "99px",
      border: "1px solid var(--green)",
    }}>
      {label}
    </span>
  );
}

const card: React.CSSProperties = {
  padding: "20px 24px",
  border: "1px solid var(--gray-200)",
  borderRadius: "var(--radius-md)",
  background: "var(--gray-50)",
};
const fieldLabel: React.CSSProperties = {
  fontSize: "10px", letterSpacing: "0.18em",
  textTransform: "uppercase", color: "var(--gray-400)",
};
const inputStyle: React.CSSProperties = {
  flex: 1, padding: "8px 12px",
  border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)",
  fontFamily: "var(--mono)", fontSize: "12px", color: "var(--gray-800)",
  background: "var(--white)", outline: "none", transition: "border-color 0.15s",
};
const addBtn: React.CSSProperties = {
  padding: "8px 14px", border: "1px solid var(--gray-200)",
  borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)",
  fontSize: "16px", color: "var(--gray-600)", background: "transparent", cursor: "pointer",
};
const smallBtn: React.CSSProperties = {
  padding: "5px 10px", border: "1px solid var(--gray-200)",
  borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)",
  fontSize: "10px", letterSpacing: "0.06em", color: "var(--gray-600)",
  background: "transparent", cursor: "pointer",
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.08)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 200, backdropFilter: "blur(2px)",
};
const modal: React.CSSProperties = {
  background: "var(--white)", borderRadius: "var(--radius-md)",
  padding: "24px", width: "400px", maxWidth: "90vw",
  boxShadow: "0 8px 48px rgba(0,0,0,0.12)", border: "1px solid var(--gray-200)",
};
