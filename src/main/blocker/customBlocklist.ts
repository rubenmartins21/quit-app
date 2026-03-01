/**
 * customBlocklist — gere as preferências de bloqueio personalizadas do utilizador.
 * Persiste em custom-blocklist.json no userData.
 * Só é limpo quando o desafio termina (deactivateBlocker).
 */

import { app } from "electron";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

export interface CustomBlocklist {
  blockReddit: boolean;
  blockTwitter: boolean;
  blockedApps: BlockedApp[];   // apps instaladas no PC
  blockedUrls: string[];       // domínios/URLs custom (ex: "instagram.com")
  addedAt: string;             // ISO timestamp da criação
}

export interface BlockedApp {
  name: string;       // nome legível (ex: "Discord")
  exePath: string;    // caminho do .exe (ex: "C:\...\\Discord.exe")
}

export interface InstalledApp {
  name: string;
  exePath: string;
}

// ── Domínios associados ao Reddit e Twitter ───────────────────────────────────

export const REDDIT_DOMAINS = [
  "reddit.com", "www.reddit.com",
  "old.reddit.com", "new.reddit.com",
  "oauth.reddit.com", "sh.reddit.com",
  "gateway.reddit.com",
  "v.redd.it", "i.redd.it",
  "preview.redd.it", "external-preview.redd.it",
];

export const TWITTER_DOMAINS = [
  "twitter.com", "www.twitter.com",
  "x.com", "www.x.com",
  "t.co",
  "abs.twimg.com", "pbs.twimg.com", "video.twimg.com",
  "api.twitter.com", "api.x.com",
  "upload.twitter.com",
];

// ── Persistência ──────────────────────────────────────────────────────────────

function getFilePath(): string {
  return path.join(app.getPath("userData"), "custom-blocklist.json");
}

export function loadCustomBlocklist(): CustomBlocklist | null {
  try {
    const raw = fs.readFileSync(getFilePath(), "utf-8");
    return JSON.parse(raw) as CustomBlocklist;
  } catch {
    return null;
  }
}

export function saveCustomBlocklist(bl: CustomBlocklist): void {
  fs.writeFileSync(getFilePath(), JSON.stringify(bl, null, 2), "utf-8");
}

export function clearCustomBlocklist(): void {
  try { fs.unlinkSync(getFilePath()); } catch {}
}

// ── Adicionar URL durante desafio activo ──────────────────────────────────────

export function addCustomUrl(url: string): { ok: boolean; error?: string } {
  const bl = loadCustomBlocklist();
  if (!bl) return { ok: false, error: "Nenhum desafio activo encontrado." };

  const domain = normalizeDomain(url);
  if (!domain) return { ok: false, error: "URL inválido." };
  if (bl.blockedUrls.includes(domain)) return { ok: false, error: "Já está na lista." };

  bl.blockedUrls.push(domain);
  saveCustomBlocklist(bl);
  return { ok: true };
}

// ── Resolver domínios bloqueados a partir do custom blocklist ─────────────────

export function getCustomDomains(bl: CustomBlocklist): string[] {
  const domains: string[] = [];

  if (bl.blockReddit)  domains.push(...REDDIT_DOMAINS);
  if (bl.blockTwitter) domains.push(...TWITTER_DOMAINS);

  for (const url of bl.blockedUrls) {
    const d = normalizeDomain(url);
    if (d && !domains.includes(d)) domains.push(d, `www.${d}`);
  }

  return domains;
}

// ── Listar apps instaladas (Windows) ─────────────────────────────────────────

export function getInstalledApps(): InstalledApp[] {
  const tmpScript = path.join(os.tmpdir(), "quit-list-apps.ps1");
  const tmpResult = path.join(os.tmpdir(), "quit-list-apps.json");

  // Script escrito para ficheiro — evita problemas de escape em linha de comando
  const script = `
$apps = @()
$paths = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
foreach ($p in $paths) {
  Get-ItemProperty $p -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -and ($_.DisplayIcon -or $_.InstallLocation) } |
    ForEach-Object {
      $name = $_.DisplayName.Trim()

      # Tenta DisplayIcon primeiro (remove parâmetros de ícone como ",0")
      $icon = ($_.DisplayIcon -replace '"','').Trim()
      $icon = ($icon -split ',')[0].Trim()

      # Se não for .exe, tenta InstallLocation + nome do exe
      $exe = ""
      if ($icon -match '\\.exe$' -and (Test-Path $icon)) {
        $exe = $icon
      } elseif ($_.InstallLocation -and (Test-Path $_.InstallLocation)) {
        $found = Get-ChildItem $_.InstallLocation -Filter "*.exe" -ErrorAction SilentlyContinue |
          Where-Object { $_.Name -notmatch '(uninstall|setup|update|redist|vcredist|repair)' } |
          Select-Object -First 1
        if ($found) { $exe = $found.FullName }
      }

      if ($exe -ne "" -and $name -ne "") {
        $apps += [PSCustomObject]@{ name = $name; exePath = $exe }
      }
    }
}
$apps | Sort-Object name -Unique | ConvertTo-Json -Compress | Set-Content -Path '${tmpResult.replace(/\\/g, "\\\\")}' -Encoding UTF8
`.trim();

  try {
    fs.writeFileSync(tmpScript, script, "utf-8");

    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpScript}"`,
      { encoding: "utf-8", timeout: 15000, stdio: ["pipe", "pipe", "ignore"] }
    );

    if (!fs.existsSync(tmpResult)) return [];

    const raw = fs.readFileSync(tmpResult, "utf-8").trim();
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr
      .filter((a: any) => a.name && a.exePath)
      .map((a: any) => ({ name: String(a.name).trim(), exePath: String(a.exePath).trim() }))
      .slice(0, 300);
  } catch (err) {
    console.error("[customBlocklist] getInstalledApps failed:", err);
    return [];
  } finally {
    try { fs.unlinkSync(tmpScript); } catch {}
    try { fs.unlinkSync(tmpResult); } catch {}
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function normalizeDomain(input: string): string | null {
  try {
    let s = input.trim().toLowerCase();
    if (!s.startsWith("http")) s = "https://" + s;
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (!host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}
