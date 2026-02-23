/**
 * dnsManager — sets system DNS to Cloudflare for Families (blocks adult content).
 * Windows only. Requires elevation.
 */

import { execSync } from "child_process";
import { SAFE_DNS_PRIMARY, SAFE_DNS_SECONDARY } from "./blocklist.js";

// Get all active network adapter names
function getAdapters(): string[] {
  try {
    const output = execSync(
      'powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq \'Up\'} | Select-Object -ExpandProperty Name"',
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    );
    return output.split("\n").map(s => s.trim()).filter(Boolean);
  } catch {
    return ["Wi-Fi", "Ethernet"]; // Fallback to common names
  }
}

export function setBlockDNS(): { ok: boolean; error?: string } {
  try {
    const adapters = getAdapters();
    for (const adapter of adapters) {
      try {
        execSync(
          `netsh interface ip set dns "${adapter}" static ${SAFE_DNS_PRIMARY} primary`,
          { stdio: "ignore" }
        );
        execSync(
          `netsh interface ip add dns "${adapter}" ${SAFE_DNS_SECONDARY} index=2`,
          { stdio: "ignore" }
        );
      } catch {
        // Skip adapters that fail (some may be virtual)
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function restoreDNS(): { ok: boolean; error?: string } {
  try {
    const adapters = getAdapters();
    for (const adapter of adapters) {
      try {
        // Restore to DHCP-assigned DNS
        execSync(
          `netsh interface ip set dns "${adapter}" dhcp`,
          { stdio: "ignore" }
        );
      } catch {}
    }
    // Flush DNS cache
    try { execSync("ipconfig /flushdns", { stdio: "ignore" }); } catch {}
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function isDNSBlockActive(): boolean {
  try {
    const output = execSync(
      'netsh interface ip show dns',
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    );
    return output.includes(SAFE_DNS_PRIMARY);
  } catch {
    return false;
  }
}
