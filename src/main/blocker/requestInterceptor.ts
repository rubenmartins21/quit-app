/**
 * requestInterceptor — Electron-level URL blocking.
 *
 * Bloqueia domínios adultos conhecidos dentro do Electron (BrowserWindow/webview).
 * Não cobre Reddit/Twitter por path — esses abrem no Chrome externo onde só o
 * PAC file tem jurisdição.
 *
 * Nota: só bloqueia dentro do Electron.
 * Para Chrome/Firefox, o bloqueio é feito por hosts + DNS + PAC.
 */

import { session } from "electron";
import { BLOCKED_URL_PATTERNS } from "./blocklist.js";

let interceptorActive = false;

export function activateRequestInterceptor(): void {
  if (interceptorActive) return;

  const ses = session.defaultSession;

  ses.webRequest.onBeforeRequest(
    { urls: BLOCKED_URL_PATTERNS },
    (details, callback) => {
      console.log(`🚫 Blocked request: ${details.url}`);
      callback({ cancel: true });
    }
  );

  interceptorActive = true;
  console.log("✅ Request interceptor active");
}

export function deactivateRequestInterceptor(): void {
  if (!interceptorActive) return;

  session.defaultSession.webRequest.onBeforeRequest(null as any);
  interceptorActive = false;
  console.log("✅ Request interceptor deactivated");
}

export function isInterceptorActive(): boolean {
  return interceptorActive;
}
