/**
 * requestInterceptor — Electron-level URL blocking.
 * Uses session.webRequest.onBeforeRequest to intercept and cancel requests
 * before they leave the app. Works for all Electron-rendered content.
 *
 * Note: This only blocks requests made WITHIN the Electron app (webviews etc).
 * For system-wide blocking (Chrome, Firefox etc), hosts file + DNS is used.
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

  // Remove the listener by passing null
  session.defaultSession.webRequest.onBeforeRequest(null as any);
  interceptorActive = false;
  console.log("✅ Request interceptor deactivated");
}

export function isInterceptorActive(): boolean {
  return interceptorActive;
}
