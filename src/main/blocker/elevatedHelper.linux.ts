/**
 * elevatedHelper.linux.ts — Linux blocker via pkexec (polkit) privilege escalation.
 *
 * Equivalências ao Windows:
 *   Hosts file → /etc/hosts              (mesmo formato e marcadores)
 *   DNS        → nmcli → systemd-resolved → /etc/resolv.conf (fallback chain)
 *   PAC        → gsettings (GNOME) + kwriteconfig5 (KDE)
 *   Apps       → chmod a-x <binary>      (remove permissão de execução)
 *
 * Elevação: pkexec bash <script> (polkit GUI dialog, equivalente ao UAC)
 *   Fallback: gksudo / kdesudo
 *
 * NOTA DE ESCAPING em template literals TS:
 *   - ${...} é interpolação JS → usar para variáveis TS
 *   - \${...} passa literal ao bash → usar para variáveis bash
 */

import { spawn } from "child_process";
import { execSync } from "child_process";
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
  SAFESEARCH_HOSTS_ENTRIES,
} from "./blocklist.js";
import { PAC_URL } from "./pacServer.js";
import type { BlockerAction, ElevatedOptions, HelperResult } from "./elevatedHelper.js";

function getScriptPath(): string {
  return path.join(app.getPath("userData"), "quit-blocker-helper.sh");
}
function getResultPath(): string {
  return path.join(os.tmpdir(), "quit-blocker-result.json");
}

/** Detecta qual método de elevação está disponível no sistema. */
function detectElevationMethod(): "pkexec" | "gksudo" | "kdesudo" | "none" {
  for (const m of ["pkexec", "gksudo", "kdesudo"] as const) {
    try { execSync(`which ${m}`, { stdio: "ignore" }); return m; } catch {}
  }
  return "none";
}

/** Converte paths TS para declaração de array bash com single-quote escaping. */
function toBashArray(paths: string[]): string {
  if (paths.length === 0) return "()";
  return "(" + paths.map(p => `'${p.replace(/'/g, "'\\''")}'`).join(" ") + ")";
}

function buildScript(opts: ElevatedOptions = {}): string {
  const allDomains = [...ADULT_DOMAINS, ...(opts.extraDomains ?? [])];
  const domainLines = allDomains.map(d => `0.0.0.0 ${d}`).join("\n")
    + "\n# SafeSearch enforcement\n"
    + SAFESEARCH_HOSTS_ENTRIES;
  const resultPath  = getResultPath();
  const appPaths    = toBashArray(opts.blockedApps ?? []);

  return `#!/bin/bash
# Gerado pelo quit-blocker — nao editar manualmente
# Executado como root via pkexec/gksudo
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

# ── Flush DNS cache ───────────────────────────────────────────────────────────
flush_dns() {
  systemd-resolve --flush-caches 2>/dev/null || resolvectl flush-caches 2>/dev/null || true
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
  flush_dns
}

deactivate_hosts() {
  remove_quit_entries
  flush_dns
}

# ── DNS via NetworkManager (nmcli) ────────────────────────────────────────────
activate_dns_nm() {
  local connections conn
  connections=\$(nmcli -t -f NAME connection show --active 2>/dev/null | head -20 || true)
  [ -z "\$connections" ] && return 1
  while IFS= read -r conn; do
    [ -z "\$conn" ] && continue
    nmcli connection modify "\$conn" ipv4.dns "\$PRIMARY_DNS \$SECONDARY_DNS" 2>/dev/null || true
    nmcli connection modify "\$conn" ipv4.ignore-auto-dns yes 2>/dev/null || true
    nmcli connection modify "\$conn" ipv6.dns "" 2>/dev/null || true
    nmcli connection up "\$conn" 2>/dev/null || true
  done <<< "\$connections"
  return 0
}

deactivate_dns_nm() {
  local connections conn
  connections=\$(nmcli -t -f NAME connection show --active 2>/dev/null | head -20 || true)
  [ -z "\$connections" ] && return 1
  while IFS= read -r conn; do
    [ -z "\$conn" ] && continue
    nmcli connection modify "\$conn" ipv4.dns "" 2>/dev/null || true
    nmcli connection modify "\$conn" ipv4.ignore-auto-dns no 2>/dev/null || true
    nmcli connection up "\$conn" 2>/dev/null || true
  done <<< "\$connections"
  return 0
}

# ── DNS via systemd-resolved (/etc/systemd/resolved.conf.d/) ─────────────────
activate_dns_resolved() {
  mkdir -p /etc/systemd/resolved.conf.d/
  printf '[Resolve]\\nDNS=%s %s\\n' "\$PRIMARY_DNS" "\$SECONDARY_DNS" \\
    > /etc/systemd/resolved.conf.d/quit-blocker.conf 2>/dev/null || true
  systemctl restart systemd-resolved 2>/dev/null || true
}

deactivate_dns_resolved() {
  rm -f /etc/systemd/resolved.conf.d/quit-blocker.conf
  systemctl restart systemd-resolved 2>/dev/null || true
}

# ── DNS fallback: /etc/resolv.conf directo ────────────────────────────────────
activate_dns_resolv() {
  [ -f /etc/resolv.conf.quit-backup ] || cp /etc/resolv.conf /etc/resolv.conf.quit-backup 2>/dev/null || true
  printf '# QUIT-BLOCKER\\nnameserver %s\\nnameserver %s\\n' \\
    "\$PRIMARY_DNS" "\$SECONDARY_DNS" > /etc/resolv.conf 2>/dev/null || true
}

deactivate_dns_resolv() {
  if [ -f /etc/resolv.conf.quit-backup ]; then
    cp /etc/resolv.conf.quit-backup /etc/resolv.conf 2>/dev/null || true
    rm -f /etc/resolv.conf.quit-backup
  fi
}

activate_dns() {
  if command -v nmcli &>/dev/null; then
    activate_dns_nm || activate_dns_resolv
  elif systemctl is-active systemd-resolved &>/dev/null 2>&1; then
    activate_dns_resolved
  else
    activate_dns_resolv
  fi
}

deactivate_dns() {
  if command -v nmcli &>/dev/null; then
    deactivate_dns_nm || deactivate_dns_resolv
  elif [ -f /etc/systemd/resolved.conf.d/quit-blocker.conf ]; then
    deactivate_dns_resolved
  else
    deactivate_dns_resolv
  fi
  flush_dns
}

# ── PAC — GNOME gsettings ─────────────────────────────────────────────────────
# gsettings precisa de correr como o utilizador original (nao root),
# com o DBUS_SESSION_BUS_ADDRESS correcto do utilizador.
activate_pac_gnome() {
  local real_user real_uid
  real_user="\${SUDO_USER:-\${PKEXEC_UID:+\$(id -nu "\$PKEXEC_UID")}}"
  real_user="\${real_user:-\$USER}"
  real_uid=\$(id -u "\$real_user" 2>/dev/null || true)
  [ -z "\$real_uid" ] && return 1
  sudo -u "\$real_user" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/\$real_uid/bus" \\
    gsettings set org.gnome.system.proxy mode 'auto' 2>/dev/null || true
  sudo -u "\$real_user" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/\$real_uid/bus" \\
    gsettings set org.gnome.system.proxy autoconfig-url "\$PAC_URL" 2>/dev/null || true
}

deactivate_pac_gnome() {
  local real_user real_uid
  real_user="\${SUDO_USER:-\${PKEXEC_UID:+\$(id -nu "\$PKEXEC_UID")}}"
  real_user="\${real_user:-\$USER}"
  real_uid=\$(id -u "\$real_user" 2>/dev/null || true)
  [ -z "\$real_uid" ] && return 1
  sudo -u "\$real_user" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/\$real_uid/bus" \\
    gsettings set org.gnome.system.proxy mode 'none' 2>/dev/null || true
}

# ── PAC — KDE kwriteconfig5 ───────────────────────────────────────────────────
activate_pac_kde() {
  local real_user
  real_user="\${SUDO_USER:-\${PKEXEC_UID:+\$(id -nu "\$PKEXEC_UID")}}"
  real_user="\${real_user:-\$USER}"
  sudo -u "\$real_user" kwriteconfig5 --file kioslaverc --group "Proxy Settings" \\
    --key ProxyType 2 2>/dev/null || true
  sudo -u "\$real_user" kwriteconfig5 --file kioslaverc --group "Proxy Settings" \\
    --key "Proxy Config Script" "\$PAC_URL" 2>/dev/null || true
}

deactivate_pac_kde() {
  local real_user
  real_user="\${SUDO_USER:-\${PKEXEC_UID:+\$(id -nu "\$PKEXEC_UID")}}"
  real_user="\${real_user:-\$USER}"
  sudo -u "\$real_user" kwriteconfig5 --file kioslaverc --group "Proxy Settings" \\
    --key ProxyType 0 2>/dev/null || true
}

activate_pac() {
  command -v gsettings &>/dev/null && activate_pac_gnome || true
  command -v kwriteconfig5 &>/dev/null && activate_pac_kde || true
}

deactivate_pac() {
  command -v gsettings &>/dev/null && deactivate_pac_gnome || true
  command -v kwriteconfig5 &>/dev/null && deactivate_pac_kde || true
}

# ── Apps via chmod a-x ────────────────────────────────────────────────────────
block_apps() {
  local app_path pname
  [ "\${#APP_PATHS[@]}" -eq 0 ] && return 0
  for app_path in "\${APP_PATHS[@]}"; do
    [ -f "\$app_path" ] || continue
    chmod a-x "\$app_path" 2>/dev/null || true
    pname=\$(basename "\$app_path")
    pkill -x "\$pname" 2>/dev/null || true
  done
}

unblock_apps() {
  local app_path
  [ "\${#APP_PATHS[@]}" -eq 0 ] && return 0
  for app_path in "\${APP_PATHS[@]}"; do
    [ -f "\$app_path" ] || continue
    chmod a+x "\$app_path" 2>/dev/null || true
  done
}

# ── Status ────────────────────────────────────────────────────────────────────
check_status() {
  local current_dns pac_mode real_user real_uid

  grep -q "\$MARKER_START" "\$HOSTS_PATH" 2>/dev/null && HOSTS_ACTIVE=true || true

  if command -v nmcli &>/dev/null; then
    current_dns=\$(nmcli dev show 2>/dev/null | grep -i "IP4.DNS" | head -1 || true)
  else
    current_dns=\$(cat /etc/resolv.conf 2>/dev/null || true)
  fi
  echo "\$current_dns" | grep -q "\$PRIMARY_DNS" && DNS_ACTIVE=true || true

  if command -v gsettings &>/dev/null; then
    real_user="\${SUDO_USER:-\${PKEXEC_UID:+\$(id -nu "\$PKEXEC_UID")}}"
    real_user="\${real_user:-\$USER}"
    real_uid=\$(id -u "\$real_user" 2>/dev/null || true)
    if [ -n "\$real_uid" ]; then
      pac_mode=\$(sudo -u "\$real_user" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/\$real_uid/bus" \\
        gsettings get org.gnome.system.proxy mode 2>/dev/null || true)
      echo "\$pac_mode" | grep -q "auto" && PAC_ACTIVE=true || true
    fi
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

printf '{"ok":%s,"hostsActive":%s,"dnsActive":%s,"pacActive":%s,"error":""}\n' \\
  "\$OK" "\$HOSTS_ACTIVE" "\$DNS_ACTIVE" "\$PAC_ACTIVE" > "\$RESULT_PATH" || true
`;
}

export async function runElevatedLinux(
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

  const elevMethod = detectElevationMethod();
  if (elevMethod === "none") {
    return { ok: false, error: "Nenhum método de elevação disponível (pkexec/gksudo/kdesudo)." };
  }

  return new Promise((resolve) => {
    // pkexec mostra diálogo polkit (equivalente ao UAC Windows).
    // gksudo/kdesudo mostram diálogos GTK/Qt alternativos.
    // Se utilizador cancelar → processo sai com código não-zero, sem RESULT_PATH.
    const proc = elevMethod === "pkexec"
      ? spawn("pkexec", ["bash", scriptPath, action])
      : spawn(elevMethod, ["bash", scriptPath, action]);

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
