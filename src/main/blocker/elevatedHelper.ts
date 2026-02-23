/**
 * elevatedHelper — runs blocker operations with UAC elevation on Windows.
 * Writes a self-contained PowerShell script and launches it as admin via UAC.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { app } from "electron";
import { ADULT_DOMAINS, SAFE_DNS_PRIMARY, SAFE_DNS_SECONDARY, HOSTS_MARKER_START, HOSTS_MARKER_END } from "./blocklist.js";

export type BlockerAction = "activate" | "deactivate" | "status";

export interface HelperResult {
  ok: boolean;
  hostsActive?: boolean;
  dnsActive?: boolean;
  error?: string;
}

function getScriptPath(): string {
  return path.join(app.getPath("userData"), "quit-blocker-helper.ps1");
}

function getResultPath(): string {
  return path.join(os.tmpdir(), "quit-blocker-result.json");
}

function buildScript(): string {
  const hostsPath = "C:\\Windows\\System32\\drivers\\etc\\hosts";
  const domainLines = ADULT_DOMAINS.map(d => `0.0.0.0 ${d}`).join("\r\n");

  return `param([string]$Action, [string]$ResultPath)

$result = @{ ok = $true; hostsActive = $false; dnsActive = $false; error = "" }

$hostsPath = "${hostsPath.replace(/\\/g, "\\\\")}"
$markerStart = "${HOSTS_MARKER_START}"
$markerEnd = "${HOSTS_MARKER_END}"
$primaryDNS = "${SAFE_DNS_PRIMARY}"
$secondaryDNS = "${SAFE_DNS_SECONDARY}"

function Flush-DNS { try { ipconfig /flushdns | Out-Null } catch {} }

function Get-ActiveAdapters {
  try { return (Get-NetAdapter | Where-Object { $_.Status -eq "Up" }).Name }
  catch { return @("Wi-Fi", "Ethernet") }
}

function Activate-Block {
  # Hosts file
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $startIdx = $content.IndexOf($markerStart)
  $endIdx = $content.IndexOf($markerEnd)
  if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $content = $content.Substring(0, $startIdx) + $content.Substring($endIdx + $markerEnd.Length)
  }
  $block = "\`r\`n\`r\`n" + $markerStart + "\`r\`n${domainLines}\`r\`n" + $markerEnd + "\`r\`n"
  $content = $content.TrimEnd() + $block
  [System.IO.File]::WriteAllText($hostsPath, $content, [System.Text.Encoding]::UTF8)

  # DNS
  $adapters = Get-ActiveAdapters
  foreach ($a in $adapters) {
    try { netsh interface ip set dns "$a" static $primaryDNS primary | Out-Null } catch {}
    try { netsh interface ip add dns "$a" $secondaryDNS index=2 | Out-Null } catch {}
  }
  Flush-DNS
}

function Deactivate-Block {
  # Hosts file
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $startIdx = $content.IndexOf($markerStart)
  $endIdx = $content.IndexOf($markerEnd)
  if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $content = $content.Substring(0, $startIdx) + $content.Substring($endIdx + $markerEnd.Length)
    $content = $content.TrimEnd() + "\`r\`n"
    [System.IO.File]::WriteAllText($hostsPath, $content, [System.Text.Encoding]::UTF8)
  }

  # DNS restore to DHCP
  $adapters = Get-ActiveAdapters
  foreach ($a in $adapters) {
    try { netsh interface ip set dns "$a" dhcp | Out-Null } catch {}
  }
  Flush-DNS
}

function Get-Status {
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $result["hostsActive"] = $content.Contains($markerStart)
  $dnsOut = netsh interface ip show dns 2>$null | Out-String
  $result["dnsActive"] = $dnsOut.Contains($primaryDNS)
}

try {
  switch ($Action) {
    "activate"   { Activate-Block }
    "deactivate" { Deactivate-Block }
    "status"     { Get-Status }
    default { $result["ok"] = $false; $result["error"] = "Unknown action: $Action" }
  }
} catch {
  $result["ok"] = $false
  $result["error"] = $_.Exception.Message
}

$result | ConvertTo-Json | Set-Content -Path $ResultPath -Encoding UTF8
`;
}

export async function runElevated(action: BlockerAction): Promise<HelperResult> {
  const resultPath = getResultPath();

  // Clean previous result
  try { if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath); } catch {}

  // Write helper script
  try {
    fs.writeFileSync(getScriptPath(), buildScript(), "utf-8");
  } catch (err) {
    return { ok: false, error: `Failed to write helper script: ${err}` };
  }

  const scriptPath = getScriptPath();

  return new Promise((resolve) => {
    // Launch PowerShell as admin via Start-Process -Verb RunAs (triggers UAC prompt)
    const ps = spawn("powershell", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-Command",
      `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""${scriptPath}"" -Action ${action} -ResultPath ""${resultPath}""'`,
    ]);

    let stderr = "";
    ps.stderr?.on("data", (d) => { stderr += d.toString(); });

    ps.on("close", (code) => {
      try {
        if (!fs.existsSync(resultPath)) {
          const msg = code !== 0
            ? "Operação cancelada ou recusada pelo utilizador."
            : "Sem resultado — o script pode ter falhado silenciosamente.";
          resolve({ ok: false, error: msg });
          return;
        }
        const raw = fs.readFileSync(resultPath, "utf-8");
        resolve(JSON.parse(raw) as HelperResult);
      } catch (err) {
        resolve({ ok: false, error: `Failed to read result: ${err}` });
      }
    });

    ps.on("error", (err) => resolve({ ok: false, error: err.message }));
  });
}
