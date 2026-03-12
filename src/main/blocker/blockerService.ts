/**
 * blockerService — orquestra todas as camadas de bloqueio:
 * 1. Electron webRequest interceptor (instantâneo, sem UAC)
 * 2. PAC file server local (bloqueia por URL path em Chrome/Edge)
 * 3. Hosts file + DNS IPv4/IPv6 (sistema operativo, requer UAC)
 */

import { app } from "electron";
import fs from "fs";
import path from "path";
import { runElevated } from "./elevatedHelper.js";
import { activateRequestInterceptor, deactivateRequestInterceptor } from "./requestInterceptor.js";
import { startPacServer, stopPacServer } from "./pacServer.js";
import { startWatchdog, stopWatchdog, checkNow } from "./blockerWatchdog.js";
import { loadCustomBlocklist, getCustomDomains } from "./customBlocklist.js";

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

export async function activateBlocker(challengeId: string): Promise<{ ok: boolean; error?: string }> {
  console.log("🔒 Activating blocker for challenge:", challengeId);

  // 1. PAC server deve estar a correr ANTES de o PowerShell registar o URL
  await startPacServer();

  // 2. Electron interceptor — sem UAC, instantâneo
  activateRequestInterceptor();

  // 3. Sistema: hosts file + DNS + PAC registry (requer UAC)
  const result = await runElevated("activate");

  // Guarda estado independentemente do resultado do UAC
  // (PAC server e interceptor já estão ativos mesmo que UAC falhe)
  saveBlockerState({
    active: true,
    activatedAt: new Date().toISOString(),
    challengeId,
  });

  if (result.ok) {
    console.log("✅ Blocker fully activated (PAC + interceptor + hosts + DNS)");
    startWatchdog();
  } else {
    console.warn("⚠️  System-level failed, PAC + interceptor still active:", result.error);
    startWatchdog(); // watchdog mesmo assim — camadas in-process estão activas
  }

  return { ok: true };
}

export async function deactivateBlocker(): Promise<{ ok: boolean; error?: string }> {
  console.log("🔓 Deactivating blocker...");

  // 1. Para o watchdog imediatamente — bloqueio vai ser removido
  stopWatchdog();

  // 2. Interceptor imediatamente
  deactivateRequestInterceptor();

  // 2. Sistema: remove hosts + DNS + PAC registry (requer UAC)
  const result = await runElevated("deactivate");

  // 3. Para o servidor PAC local
  stopPacServer();

  saveBlockerState({ active: false, activatedAt: null, challengeId: null });

  if (result.ok) {
    console.log("✅ Blocker fully deactivated");
  } else {
    console.warn("⚠️  System-level deactivation failed:", result.error);
  }

  return result;
}

export async function loadAndRestoreInterceptor(): Promise<void> {
  const state = loadBlockerState();
  if (!state.active) return;

  // Restaura PAC server e interceptor sem UAC
  await startPacServer();
  activateRequestInterceptor();
  console.log("🔒 PAC server + interceptor restored from previous session");

  // Inicia watchdog e verifica imediatamente se algo foi removido
  startWatchdog();
  await checkNow();
}

/**
 * Reaplica o hosts file + DNS com a blocklist actual (sem tocar no estado).
 * Usado quando a blocklist muda a meio de um desafio activo (ex: remoção do YouTube).
 * Requer UAC/osascript/pkexec — o utilizador vai ver uma janela de permissão.
 */
export async function refreshBlocker(): Promise<{ ok: boolean; error?: string }> {
  const state = loadBlockerState();
  if (!state.active) return { ok: false, error: "Nenhum bloqueio activo." };

  console.log("🔄 Refreshing blocker (reapplying hosts + DNS with current blocklist)...");

  const custom = loadCustomBlocklist();
  const extraDomains = custom ? getCustomDomains(custom) : [];
  const blockedApps  = custom?.blockedApps?.map(a => a.exePath) ?? [];

  const result = await runElevated("activate", { extraDomains, blockedApps });

  if (result.ok) {
    console.log("✅ Blocker refreshed successfully");
  } else {
    console.warn("⚠️  Blocker refresh failed:", result.error);
  }

  return result;
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
