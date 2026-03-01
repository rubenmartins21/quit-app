/**
 * blockerService — orquestra todas as camadas de bloqueio:
 * 1. Electron webRequest interceptor (instantâneo, sem UAC)
 * 2. PAC file server local (bloqueia por URL path em Chrome/Edge)
 * 3. Hosts file + DNS IPv4/IPv6 (sistema operativo, requer UAC)
 * 4. icacls — remove permissão de execução de apps bloqueadas
 */

import { app } from "electron";
import fs from "fs";
import path from "path";
import { runElevated, ElevatedOptions } from "./elevatedHelper.js";
import { activateRequestInterceptor, deactivateRequestInterceptor } from "./requestInterceptor.js";
import { startPacServer, stopPacServer } from "./pacServer.js";
import {
  CustomBlocklist,
  loadCustomBlocklist,
  saveCustomBlocklist,
  clearCustomBlocklist,
  getCustomDomains,
  normalizeDomain,
  BlockedApp,
} from "./customBlocklist.js";

interface BlockerState {
  active: boolean;
  activatedAt: string | null;
  challengeId: string | null;
}

function getStatePath(): string {
  return path.join(app.getPath("userData"), "blocker-state.json");
}

export function loadBlockerState(): BlockerState {
  try {
    return JSON.parse(fs.readFileSync(getStatePath(), "utf-8")) as BlockerState;
  } catch {
    return { active: false, activatedAt: null, challengeId: null };
  }
}

function saveBlockerState(state: BlockerState): void {
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf-8");
}

function buildElevatedOpts(bl: CustomBlocklist): ElevatedOptions {
  return {
    extraDomains: getCustomDomains(bl),
    blockedApps: bl.blockedApps.map(a => a.exePath),
  };
}

export async function activateBlocker(
  challengeId: string,
  customBl?: CustomBlocklist,
): Promise<{ ok: boolean; error?: string }> {
  console.log("🔒 Activating blocker for challenge:", challengeId);

  if (customBl) {
    saveCustomBlocklist({ ...customBl, addedAt: new Date().toISOString() });
  }

  const bl = customBl ?? loadCustomBlocklist() ?? {
    blockReddit: false, blockTwitter: false,
    blockedApps: [], blockedUrls: [], addedAt: new Date().toISOString(),
  };

  await startPacServer();
  activateRequestInterceptor();

  const result = await runElevated("activate", buildElevatedOpts(bl));

  saveBlockerState({ active: true, activatedAt: new Date().toISOString(), challengeId });

  if (result.ok) {
    console.log("✅ Blocker fully activated");
  } else {
    console.warn("⚠️  System-level failed:", result.error);
  }

  return { ok: true };
}

export async function deactivateBlocker(): Promise<{ ok: boolean; error?: string }> {
  console.log("🔓 Deactivating blocker...");

  deactivateRequestInterceptor();

  // Passa a lista actual para o script poder desbloquear as apps via icacls
  const bl = loadCustomBlocklist();
  const opts: ElevatedOptions = bl ? buildElevatedOpts(bl) : {};

  const result = await runElevated("deactivate", opts);

  stopPacServer();
  clearCustomBlocklist();
  saveBlockerState({ active: false, activatedAt: null, challengeId: null });

  if (result.ok) {
    console.log("✅ Blocker fully deactivated");
  } else {
    console.warn("⚠️  System-level deactivation failed:", result.error);
  }

  return result;
}

/**
 * Adiciona itens ao bloqueador durante um desafio activo.
 * Re-aplica hosts file e icacls com os novos itens (requer UAC).
 */
export async function addToActiveBlocker(payload: {
  url?: string;
  app?: BlockedApp;
  blockReddit?: boolean;
  blockTwitter?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const state = loadBlockerState();
  if (!state.active) return { ok: false, error: "Nenhum bloqueador activo." };

  let bl = loadCustomBlocklist() ?? {
    blockReddit: false, blockTwitter: false,
    blockedApps: [], blockedUrls: [], addedAt: new Date().toISOString(),
  };

  if (payload.url) {
    const domain = normalizeDomain(payload.url);
    if (!domain) return { ok: false, error: "URL inválido." };
    if (bl.blockedUrls.includes(domain)) return { ok: false, error: "Já está na lista." };
    bl = { ...bl, blockedUrls: [...bl.blockedUrls, domain] };
  }

  if (payload.app) {
    if (bl.blockedApps.some(a => a.exePath === payload.app!.exePath)) {
      return { ok: false, error: "App já está na lista." };
    }
    bl = { ...bl, blockedApps: [...bl.blockedApps, payload.app] };
  }

  if (payload.blockReddit !== undefined) bl = { ...bl, blockReddit: payload.blockReddit };
  if (payload.blockTwitter !== undefined) bl = { ...bl, blockTwitter: payload.blockTwitter };

  saveCustomBlocklist(bl);
  const result = await runElevated("activate", buildElevatedOpts(bl));
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function loadAndRestoreInterceptor(): Promise<void> {
  const state = loadBlockerState();
  if (!state.active) return;

  await startPacServer();
  activateRequestInterceptor();
  console.log("🔒 PAC server + interceptor restored from previous session");
}

export async function getBlockerStatus(): Promise<{
  active: boolean;
  hostsActive: boolean;
  dnsActive: boolean;
  pacActive: boolean;
}> {
  const state = loadBlockerState();
  if (!state.active) {
    return { active: false, hostsActive: false, dnsActive: false, pacActive: false };
  }

  const result = await runElevated("status");
  return {
    active: state.active,
    hostsActive: result.hostsActive ?? false,
    dnsActive: result.dnsActive ?? false,
    pacActive: result.pacActive ?? false,
  };
}
