/**
 * blockerWatchdog — detecta quando as camadas de bloqueio são removidas
 * manualmente enquanto um desafio está activo, e reaplica-as.
 *
 * Verifica a cada WATCHDOG_INTERVAL_MS:
 *   - Hosts file: presença do marcador QUIT-BLOCKER-START
 *   - DNS: presença do IP Cloudflare for Families
 *
 * Se alguma camada estiver em falta → reaplica via runElevated("activate")
 * e notifica o renderer para mostrar aviso ao utilizador.
 *
 * Nota: o Electron webRequest interceptor e o PAC server são restaurados
 * sem UAC (são in-process) — não precisam de watchdog separado.
 */

import { BrowserWindow } from "electron";
import { loadBlockerState } from "./blockerService.js";
import { activateRequestInterceptor } from "./requestInterceptor.js";
import { startPacServer } from "./pacServer.js";
import { runElevated } from "./elevatedHelper.js";

const WATCHDOG_INTERVAL_MS = 30 * 1000; // 30 segundos

let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let isReapplying = false;

function notifyRenderer(event: "tamper-detected" | "tamper-reapplied" | "tamper-failed"): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("blocker:watchdog", { event });
    }
  }
}

async function checkAndReapply(): Promise<void> {
  // Só actua se o bloqueio deve estar activo
  const state = loadBlockerState();
  if (!state.active) return;

  // Verifica se é necessário reaplica através do helper elevado
  // (o helper já sabe verificar hosts e DNS sem elevar)
  let needsReapply = false;

  try {
    const status = await runElevated("status");
    const hostsOk = status.hostsActive ?? false;
    const dnsOk   = status.dnsActive   ?? false;

    if (!hostsOk || !dnsOk) {
      console.warn(
        `🚨 Watchdog: tampering detected — hosts=${hostsOk} dns=${dnsOk}`
      );
      needsReapply = true;
    }
  } catch {
    // Se não consegue verificar, assume que está bem — não quer UAC sem razão
    return;
  }

  if (!needsReapply) return;
  if (isReapplying) return; // evita sobreposição de chamadas

  isReapplying = true;
  notifyRenderer("tamper-detected");

  try {
    // Restaura camadas in-process imediatamente (sem UAC)
    await startPacServer();
    activateRequestInterceptor();

    // Reaplica hosts + DNS via UAC
    const result = await runElevated("activate");

    if (result.ok) {
      console.log("✅ Watchdog: bloqueio reapplicado com sucesso");
      notifyRenderer("tamper-reapplied");
    } else {
      console.warn("⚠️  Watchdog: reapplicação falhou —", result.error);
      notifyRenderer("tamper-failed");
    }
  } catch (err) {
    console.warn("⚠️  Watchdog: erro ao reapplicar —", err);
    notifyRenderer("tamper-failed");
  } finally {
    isReapplying = false;
  }
}

export function startWatchdog(): void {
  if (watchdogTimer) return; // já a correr
  console.log(`👁️  Blocker watchdog started (interval: ${WATCHDOG_INTERVAL_MS / 1000}s)`);
  watchdogTimer = setInterval(checkAndReapply, WATCHDOG_INTERVAL_MS);
}

export function stopWatchdog(): void {
  if (!watchdogTimer) return;
  clearInterval(watchdogTimer);
  watchdogTimer = null;
  console.log("👁️  Blocker watchdog stopped");
}

/**
 * Verifica imediatamente (sem esperar pelo intervalo).
 * Usado ao restaurar o bloqueio no arranque.
 */
export async function checkNow(): Promise<void> {
  await checkAndReapply();
}
