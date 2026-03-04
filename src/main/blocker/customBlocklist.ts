/**
 * customBlocklist — gere as preferências de bloqueio personalizadas do utilizador.
 * Persiste em custom-blocklist.json no userData.
 * Só é limpo quando o desafio termina (deactivateBlocker).
 *
 * ALTERAÇÃO cross-platform: getInstalledApps() detecta a plataforma e usa:
 *   Windows → PowerShell + registo (comportamento original)
 *   macOS   → lê .app bundles de /Applications e ~/Applications
 *   Linux   → lê ficheiros .desktop de /usr/share/applications e ~/.local/share
 *
 * Todo o resto (interfaces, persistência, domínios, normalizeDomain) é igual.
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
  exePath: string;    // caminho do executável / .app bundle
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

// ── getInstalledApps — entry point cross-platform ─────────────────────────────

export function getInstalledApps(): InstalledApp[] {
  try {
    switch (process.platform) {
      case "win32":  return getInstalledAppsWindows();
      case "darwin": return getInstalledAppsMac();
      default:       return getInstalledAppsLinux();
    }
  } catch (err) {
    console.error("[customBlocklist] getInstalledApps failed:", err);
    return [];
  }
}

// ── Windows: PowerShell + registo (comportamento original) ────────────────────

function getInstalledAppsWindows(): InstalledApp[] {
  const tmpScript = path.join(os.tmpdir(), "quit-list-apps.ps1");
  const tmpResult = path.join(os.tmpdir(), "quit-list-apps.json");

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

      # Tenta DisplayIcon primeiro (remove parametros de icone como ",0")
      $icon = ($_.DisplayIcon -replace '"','').Trim()
      $icon = ($icon -split ',')[0].Trim()

      # Se nao for .exe, tenta InstallLocation + nome do exe
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
      { encoding: "utf-8", timeout: 15000, stdio: ["pipe", "pipe", "ignore"] },
    );

    if (!fs.existsSync(tmpResult)) return [];
    const raw = fs.readFileSync(tmpResult, "utf-8").replace(/^\uFEFF/, "").trim();
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr
      .filter((a: any) => a.name && a.exePath)
      .map((a: any) => ({ name: String(a.name).trim(), exePath: String(a.exePath).trim() }))
      .slice(0, 300);
  } catch (err) {
    console.error("[customBlocklist] getInstalledAppsWindows failed:", err);
    return [];
  } finally {
    try { fs.unlinkSync(tmpScript); } catch {}
    try { fs.unlinkSync(tmpResult); } catch {}
  }
}

// ── macOS: .app bundles em /Applications e ~/Applications ────────────────────
//
// exePath armazena o caminho do .app bundle (ex: "/Applications/Discord.app").
// O elevatedHelper.mac.ts usa find_binary() para localizar o executável dentro
// do bundle (Contents/MacOS/) quando aplica chmod a-x.

const MAC_EXCLUDE = new Set([
  "Finder", "System Preferences", "SystemPreferences",
  "App Store", "Activity Monitor", "Terminal", "Console",
  "Disk Utility", "Migration Assistant", "Keychain Access",
  "Digital Color Meter", "Screenshot", "Script Editor",
  "Automator", "ColorSync Utility", "Directory Utility",
]);

function getInstalledAppsMac(): InstalledApp[] {
  const searchDirs = [
    "/Applications",
    path.join(os.homedir(), "Applications"),
    "/System/Applications",
    "/System/Applications/Utilities",
  ];

  const apps: InstalledApp[] = [];
  const seen = new Set<string>();

  for (const dir of searchDirs) {
    let entries: string[];
    try { entries = fs.readdirSync(dir); } catch { continue; }

    for (const entry of entries) {
      if (!entry.endsWith(".app")) continue;
      const appName = entry.replace(/\.app$/, "");
      if (MAC_EXCLUDE.has(appName)) continue;

      const appPath = path.join(dir, entry);
      if (seen.has(appPath)) continue;

      // Verifica que o bundle tem pelo menos Contents/MacOS/ acessível
      const macOSDir = path.join(appPath, "Contents", "MacOS");
      let hasExecutable = false;
      try {
        const binaries = fs.readdirSync(macOSDir);
        hasExecutable = binaries.some(b => {
          try {
            const stat = fs.statSync(path.join(macOSDir, b));
            return stat.isFile() && (stat.mode & 0o111) !== 0;
          } catch { return false; }
        });
      } catch { continue; }

      if (!hasExecutable) continue;

      seen.add(appPath);
      apps.push({ name: appName, exePath: appPath });
    }
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 300);
}

// ── Linux: ficheiros .desktop de /usr/share/applications e ~/.local/share ────
//
// exePath armazena o path absoluto do binário (resolvido via which se relativo).
// O elevatedHelper.linux.ts aplica chmod a-x directamente neste path.

function getInstalledAppsLinux(): InstalledApp[] {
  const searchDirs = [
    "/usr/share/applications",
    "/usr/local/share/applications",
    path.join(os.homedir(), ".local", "share", "applications"),
    "/var/lib/snapd/desktop/applications",        // Snap
    "/var/lib/flatpak/exports/share/applications", // Flatpak
  ];

  const apps: InstalledApp[] = [];
  const seen = new Set<string>();

  for (const dir of searchDirs) {
    let entries: string[];
    try { entries = fs.readdirSync(dir); } catch { continue; }

    for (const entry of entries) {
      if (!entry.endsWith(".desktop")) continue;

      try {
        const content = fs.readFileSync(path.join(dir, entry), "utf-8");
        let name = "";
        let exec = "";
        let noDisplay = false;

        for (const line of content.split("\n")) {
          if (line.startsWith("Name=") && !name)       name      = line.slice(5).trim();
          if (line.startsWith("Exec=") && !exec)       exec      = line.slice(5).trim();
          if (line === "NoDisplay=true")                noDisplay = true;
        }

        if (!name || !exec || noDisplay) continue;

        // Remove flags Exec= como %f %u %F %U e aspas extra
        exec = exec.replace(/%[fFuUdDnNickvm]/g, "").trim();
        if (exec.startsWith('"')) {
          exec = exec.slice(1, exec.indexOf('"', 1));
        } else {
          exec = exec.split(/\s+/)[0];
        }
        if (!exec) continue;

        // Resolve path absoluto se for relativo
        let binaryPath = exec;
        if (!path.isAbsolute(exec)) {
          try {
            binaryPath = execSync(`which "${exec}" 2>/dev/null`, {
              encoding: "utf-8", timeout: 2000,
            }).trim();
          } catch {
            binaryPath = exec;
          }
        }

        if (!binaryPath || seen.has(binaryPath)) continue;
        // Só adiciona se o binário existir (ignora entradas quebradas)
        if (path.isAbsolute(binaryPath) && !fs.existsSync(binaryPath)) continue;

        seen.add(binaryPath);
        apps.push({ name, exePath: binaryPath });
      } catch {
        continue;
      }
    }
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 300);
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
