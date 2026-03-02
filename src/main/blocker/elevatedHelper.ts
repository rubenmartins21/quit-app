import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { app } from "electron";
import {
  ADULT_DOMAINS,
  SAFE_DNS_PRIMARY,
  SAFE_DNS_SECONDARY,
  SAFE_DNS_PRIMARY_V6,
  SAFE_DNS_SECONDARY_V6,
  HOSTS_MARKER_START,
  HOSTS_MARKER_END,
} from "./blocklist.js";
import { PAC_URL } from "./pacServer.js";

export type BlockerAction = "activate" | "deactivate" | "status";

export interface HelperResult {
  ok: boolean;
  hostsActive?: boolean;
  dnsActive?: boolean;
  pacActive?: boolean;
  error?: string;
}

export interface ElevatedOptions {
  extraDomains?: string[];  // Reddit, Twitter, URLs custom
  blockedApps?: string[];   // paths de .exe a bloquear via IFEO
}

function getScriptPath(): string {
  return path.join(app.getPath("userData"), "quit-blocker-helper.ps1");
}
function getResultPath(): string {
  return path.join(os.tmpdir(), "quit-blocker-result.json");
}

function buildScript(opts: ElevatedOptions = {}): string {
  const hostsPath = "C:\\Windows\\System32\\drivers\\etc\\hosts";
  const allDomains = [...ADULT_DOMAINS, ...(opts.extraDomains ?? [])];
  const domainLines = allDomains.map(d => `0.0.0.0 ${d}`).join("\r\n");
  const pacUrl = PAC_URL;
  const appPathsJson = JSON.stringify(opts.blockedApps ?? []);

  return `param([string]$Action, [string]$ResultPath)

$result = @{ ok = $true; hostsActive = $false; dnsActive = $false; pacActive = $false; error = "" }
$hostsPath = "${hostsPath.replace(/\\/g, "\\\\")}"
$markerStart = "${HOSTS_MARKER_START}"
$markerEnd = "${HOSTS_MARKER_END}"
$primaryDNS = "${SAFE_DNS_PRIMARY}"
$secondaryDNS = "${SAFE_DNS_SECONDARY}"
$primaryDNSv6 = "${SAFE_DNS_PRIMARY_V6}"
$secondaryDNSv6 = "${SAFE_DNS_SECONDARY_V6}"
$pacUrl = "${pacUrl}"
$regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
$ifeoBase = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options"
$blockedApps = '${appPathsJson}' | ConvertFrom-Json
$fakeDebugger = "C:\\Windows\\System32\\ping.exe 0.0.0.0 -n 1"

function Flush-DNS { try { ipconfig /flushdns | Out-Null } catch {} }

function Block-Apps {
  foreach ($exePath in $blockedApps) {
    $exeName = [System.IO.Path]::GetFileName($exePath)
    try {
      $key = "$ifeoBase\\$exeName"
      if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
      Set-ItemProperty -Path $key -Name "Debugger" -Value $fakeDebugger -Force
      $procName = [System.IO.Path]::GetFileNameWithoutExtension($exeName)
      Get-Process -Name $procName -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue
    } catch {}
  }
}

function Unblock-Apps {
  foreach ($exePath in $blockedApps) {
    $exeName = [System.IO.Path]::GetFileName($exePath)
    try {
      $key = "$ifeoBase\\$exeName"
      if (Test-Path $key) {
        Remove-ItemProperty -Path $key -Name "Debugger" -ErrorAction SilentlyContinue
        $props = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
        $userProps = $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' }
        if (-not $userProps -or $userProps.Count -eq 0) {
          Remove-Item -Path $key -Force -ErrorAction SilentlyContinue
        }
      }
    } catch {}
  }
  Get-ChildItem $ifeoBase -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $debugger = (Get-ItemProperty $_.PSPath -Name "Debugger" -ErrorAction SilentlyContinue).Debugger
      if ($debugger -like "*ping.exe 0.0.0.0*") {
        Remove-ItemProperty -Path $_.PSPath -Name "Debugger" -ErrorAction SilentlyContinue
      }
    } catch {}
  }
}

function Notify-ProxyChange {
  try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinInetHelper {
  [DllImport("wininet.dll", SetLastError=true)]
  public static extern bool InternetSetOption(IntPtr h, int opt, IntPtr buf, int len);
}
"@ -ErrorAction SilentlyContinue
    [WinInetHelper]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
    [WinInetHelper]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
  } catch {}
}

function Get-ActiveAdapters {
  try { return (Get-NetAdapter | Where-Object { $_.Status -eq "Up" }).Name }
  catch { return @("Wi-Fi", "Ethernet") }
}

function Remove-QuitEntries([string]$content) {
  $startIdx = $content.IndexOf($markerStart)
  $endIdx = $content.IndexOf($markerEnd)
  if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $content = $content.Substring(0, $startIdx) + $content.Substring($endIdx + $markerEnd.Length)
  }
  return $content.TrimEnd() + "\`r\`n"
}

function Activate-Block {
  # 1. Hosts file
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $content = Remove-QuitEntries $content
  $block = "\`r\`n" + $markerStart + "\`r\`n${domainLines}\`r\`n" + $markerEnd + "\`r\`n"
  $content = $content.TrimEnd() + $block
  [System.IO.File]::WriteAllText($hostsPath, $content, [System.Text.Encoding]::ASCII)

  # 2. DNS IPv4
  $adapters = Get-ActiveAdapters
  foreach ($a in $adapters) {
    try { netsh interface ip set dns "$a" static $primaryDNS primary validate=no | Out-Null } catch {}
    try { netsh interface ip add dns "$a" $secondaryDNS index=2 validate=no | Out-Null } catch {}
  }

  # 3. DNS IPv6
  foreach ($a in $adapters) {
    try { netsh interface ipv6 set dns "$a" static $primaryDNSv6 primary validate=no | Out-Null } catch {}
    try { netsh interface ipv6 add dns "$a" $secondaryDNSv6 index=2 validate=no | Out-Null } catch {}
  }

  # 4. PAC file
  Set-ItemProperty -Path $regPath -Name "AutoConfigURL" -Value $pacUrl
  Set-ItemProperty -Path $regPath -Name "ProxyEnable" -Value 0
  Notify-ProxyChange

  # 5. Bloqueia apps via IFEO
  Block-Apps

  Flush-DNS
}

function Deactivate-Block {
  # 1. Hosts file
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $content = Remove-QuitEntries $content
  [System.IO.File]::WriteAllText($hostsPath, $content, [System.Text.Encoding]::ASCII)

  # 2. DNS IPv4 -> DHCP
  $adapters = Get-ActiveAdapters
  foreach ($a in $adapters) {
    try { netsh interface ip set dns "$a" dhcp | Out-Null } catch {}
  }

  # 3. DNS IPv6 -> DHCP
  foreach ($a in $adapters) {
    try { netsh interface ipv6 set dns "$a" dhcp | Out-Null } catch {}
  }

  # 4. Remove PAC
  try { Remove-ItemProperty -Path $regPath -Name "AutoConfigURL" -ErrorAction SilentlyContinue } catch {}
  Set-ItemProperty -Path $regPath -Name "ProxyEnable" -Value 0
  Notify-ProxyChange

  # 5. Desbloqueia apps
  Unblock-Apps

  Flush-DNS
}

function Get-Status {
  $content = ""
  if (Test-Path $hostsPath) { $content = [System.IO.File]::ReadAllText($hostsPath) }
  $result["hostsActive"] = $content.Contains($markerStart)

  $dnsOut = netsh interface ip show dns 2>$null | Out-String
  $result["dnsActive"] = $dnsOut.Contains($primaryDNS)

  try {
    $pacVal = Get-ItemProperty -Path $regPath -Name "AutoConfigURL" -ErrorAction SilentlyContinue
    $result["pacActive"] = ($null -ne $pacVal -and $pacVal.AutoConfigURL -eq $pacUrl)
  } catch {
    $result["pacActive"] = $false
  }
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

$json = $result | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText($ResultPath, $json, [System.Text.Encoding]::UTF8)
`;
}

export async function runElevated(action: BlockerAction, opts: ElevatedOptions = {}): Promise<HelperResult> {
  const resultPath = getResultPath();
  try { if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath); } catch {}

  try {
    fs.writeFileSync(getScriptPath(), buildScript(opts), "utf-8");
  } catch (err) {
    return { ok: false, error: `Failed to write helper script: ${err}` };
  }

  const scriptPath = getScriptPath();

  return new Promise((resolve) => {
    const ps = spawn("powershell", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-Command",
      `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""${scriptPath}"" -Action ${action} -ResultPath ""${resultPath}""'`,
    ]);

    ps.on("close", (code) => {
      try {
        if (!fs.existsSync(resultPath)) {
          resolve({
            ok: false,
            error: code !== 0
              ? "Operação cancelada pelo utilizador."
              : "Script falhou silenciosamente.",
          });
          return;
        }
        const raw = fs.readFileSync(resultPath, "utf-8").replace(/^\uFEFF/, "").trim();
        resolve(JSON.parse(raw) as HelperResult);
      } catch (err) {
        resolve({ ok: false, error: `Failed to read result: ${err}` });
      }
    });

    ps.on("error", (err) => resolve({ ok: false, error: err.message }));
  });
}
