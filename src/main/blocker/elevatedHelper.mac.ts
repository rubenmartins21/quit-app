/**
 * elevatedHelper.mac.ts — macOS blocker via osascript privilege escalation.
 *
 * Equivalências ao Windows:
 *   Hosts file → /etc/hosts          (mesmo formato e marcadores)
 *   DNS        → networksetup        (Cloudflare for Families 1.1.1.3)
 *   PAC        → networksetup        (Auto Proxy URL para localhost:7777)
 *   Apps       → chmod a-x <binary>  (remove permissão de execução)
 *
 * Elevação: osascript "do shell script ... with administrator privileges"
 *   → mostra diálogo de password do sistema, equivalente ao UAC Windows.
 *
 * NOTA DE ESCAPING em template literals TS:
 *   - ${...} é interpolação JS → usar para variáveis TS (domainLines, etc.)
 *   - \${...} passa literal ao bash → usar para variáveis bash (ACTION, etc.)
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { app } from "electron";
import {
  ADULT_DOMAINS,
  SAFE_DNS_PRIMARY,
  SAFE_DNS_SECONDARY,
  HOSTS_MARKER_START,
  HOSTS_MARKER_END,
} from "./blocklist.js";
import { PAC_URL } from "./pacServer.js";
import type { BlockerAction, ElevatedOptions, HelperResult } from "./elevatedHelper.js";

function getScriptPath(): string {
  return path.join(app.getPath("userData"), "quit-blocker-helper.sh");
}
function getResultPath(): string {
  return path.join(os.tmpdir(), "quit-blocker-result.json");
}

/** Converte paths TS para declaração de array bash com single-quote escaping. */
function toBashArray(paths: string[]): string {
  if (paths.length === 0) return "()";
  return "(" + paths.map(p => `'${p.replace(/'/g, "'\\''")}'`).join(" ") + ")";
}

function buildScript(opts: ElevatedOptions = {}): string {
  const allDomains = [...ADULT_DOMAINS, ...(opts.extraDomains ?? [])];
  const domainLines = allDomains.map(d => `0.0.0.0 ${d}`).join("\n");
  const resultPath  = getResultPath();
  const appPaths    = toBashArray(opts.blockedApps ?? []);

  return `#!/bin/bash
# Gerado pelo quit-blocker — nao editar manualmente
set -uo pipefail

ACTION="\${1:-status}"
RESULT_PATH="${resultPath}"
HOSTS_PATH="/etc/hosts"
MARKER_START="${HOSTS_MARKER_START}"
MARKER_END="${HOSTS_MARKER_END}"
PRIMARY_DNS="${SAFE_DNS_PRIMARY}"
SECONDARY_DNS="${SAFE_DNS_SECONDARY}"
PAC_URL="${PAC_URL}"

HOSTS_ACTIVE=false
DNS_ACTIVE=false
PAC_ACTIVE=false
OK=true

APP_PATHS=${appPaths}

# ── find_binary: localiza executavel de .app bundle ou path directo ───────────
find_binary() {
  local p="\$1"
  if [ -f "\$p" ]; then echo "\$p"; return 0; fi
  if [ -d "\$p" ]; then
    local name bin first
    name=\$(basename "\$p" .app)
    bin="\$p/Contents/MacOS/\$name"
    if [ -f "\$bin" ]; then echo "\$bin"; return 0; fi
    first=\$(find "\$p/Contents/MacOS" -maxdepth 1 -type f -perm +111 2>/dev/null | head -1 || true)
    if [ -n "\$first" ]; then echo "\$first"; return 0; fi
  fi
  echo ""; return 1
}

# ── Servicos de rede activos (excluindo desactivados marcados com *) ──────────
get_network_services() {
  networksetup -listallnetworkservices 2>/dev/null | tail -n +2 | grep -v '^\*' || true
}

# ── Hosts file ────────────────────────────────────────────────────────────────
remove_quit_entries() {
  local tmp
  tmp=\$(mktemp) || return 0
  awk "/^\$MARKER_START$/{skip=1;next}/^\$MARKER_END$/{skip=0;next}!skip{print}" \\
    "\$HOSTS_PATH" > "\$tmp" 2>/dev/null && cat "\$tmp" > "\$HOSTS_PATH" 2>/dev/null || true
  rm -f "\$tmp"
}

activate_hosts() {
  remove_quit_entries
  {
    printf '\\n%s\\n' "\$MARKER_START"
    printf '%s\\n' "${domainLines}"
    printf '%s\\n' "\$MARKER_END"
  } >> "\$HOSTS_PATH" 2>/dev/null || true
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
}

deactivate_hosts() {
  remove_quit_entries
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
}

# ── DNS via networksetup ──────────────────────────────────────────────────────
activate_dns() {
  local svc
  while IFS= read -r svc; do
    [ -z "\$svc" ] && continue
    networksetup -setdnsservers "\$svc" "\$PRIMARY_DNS" "\$SECONDARY_DNS" 2>/dev/null || true
  done < <(get_network_services)
}

deactivate_dns() {
  local svc
  while IFS= read -r svc; do
    [ -z "\$svc" ] && continue
    networksetup -setdnsservers "\$svc" "Empty" 2>/dev/null || true
  done < <(get_network_services)
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
}

# ── PAC via networksetup ──────────────────────────────────────────────────────
activate_pac() {
  local svc
  while IFS= read -r svc; do
    [ -z "\$svc" ] && continue
    networksetup -setautoproxyurl "\$svc" "\$PAC_URL" 2>/dev/null || true
    networksetup -setautoproxystate "\$svc" on 2>/dev/null || true
  done < <(get_network_services)
}

deactivate_pac() {
  local svc
  while IFS= read -r svc; do
    [ -z "\$svc" ] && continue
    networksetup -setautoproxystate "\$svc" off 2>/dev/null || true
  done < <(get_network_services)
}

# ── Apps via chmod a-x ────────────────────────────────────────────────────────
block_apps() {
  local app_path bin pname
  [ "\${#APP_PATHS[@]}" -eq 0 ] && return 0
  for app_path in "\${APP_PATHS[@]}"; do
    bin=\$(find_binary "\$app_path" 2>/dev/null || true)
    [ -z "\$bin" ] && continue
    chmod a-x "\$bin" 2>/dev/null || true
    pname=\$(basename "\$bin")
    pkill -x "\$pname" 2>/dev/null || true
  done
}

unblock_apps() {
  local app_path bin
  [ "\${#APP_PATHS[@]}" -eq 0 ] && return 0
  for app_path in "\${APP_PATHS[@]}"; do
    bin=\$(find_binary "\$app_path" 2>/dev/null || true)
    [ -z "\$bin" ] && continue
    chmod a+x "\$bin" 2>/dev/null || true
  done
}

# ── Status ────────────────────────────────────────────────────────────────────
check_status() {
  local first_svc dns_out pac_out
  grep -q "\$MARKER_START" "\$HOSTS_PATH" 2>/dev/null && HOSTS_ACTIVE=true || true

  first_svc=\$(get_network_services | head -1)
  if [ -n "\$first_svc" ]; then
    dns_out=\$(networksetup -getdnsservers "\$first_svc" 2>/dev/null || true)
    echo "\$dns_out" | grep -q "\$PRIMARY_DNS" && DNS_ACTIVE=true || true

    pac_out=\$(networksetup -getautoproxyurl "\$first_svc" 2>/dev/null || true)
    echo "\$pac_out" | grep -q "\$PAC_URL" && PAC_ACTIVE=true || true
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  case "\${ACTION}" in
    activate)   activate_hosts; activate_dns; activate_pac; block_apps ;;
    deactivate) deactivate_hosts; deactivate_dns; deactivate_pac; unblock_apps ;;
    status)     check_status ;;
    *)          OK=false ;;
  esac
}

main || { OK=false; }

# JSON com printf — sem heredoc para evitar problemas de expansao com $ERROR
printf '{"ok":%s,"hostsActive":%s,"dnsActive":%s,"pacActive":%s,"error":""}\n' \\
  "\$OK" "\$HOSTS_ACTIVE" "\$DNS_ACTIVE" "\$PAC_ACTIVE" > "\$RESULT_PATH" || true
`;
}

export async function runElevatedMac(
  action: BlockerAction,
  opts: ElevatedOptions = {},
): Promise<HelperResult> {
  const resultPath = getResultPath();
  try { if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath); } catch {}

  const scriptPath = getScriptPath();
  try {
    fs.writeFileSync(scriptPath, buildScript(opts), "utf-8");
    fs.chmodSync(scriptPath, 0o700);
  } catch (err) {
    return { ok: false, error: `Failed to write helper script: ${err}` };
  }

  return new Promise((resolve) => {
    // osascript pede password do sistema e executa como admin.
    // Se utilizador cancelar → sai com código 1, sem RESULT_PATH.
    // Aspas duplas no path escapadas para o AppleScript string.
    const escapedPath = scriptPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const appleScript = `do shell script "bash \\"${escapedPath}\\" ${action}" with administrator privileges`;

    const proc = spawn("osascript", ["-e", appleScript]);

    proc.on("close", (code) => {
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
        const raw = fs.readFileSync(resultPath, "utf-8").trim();
        resolve(JSON.parse(raw) as HelperResult);
      } catch (err) {
        resolve({ ok: false, error: `Failed to read result: ${err}` });
      }
    });

    proc.on("error", (err) => resolve({ ok: false, error: err.message }));
  });
}
