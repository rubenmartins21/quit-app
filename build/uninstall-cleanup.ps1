# uninstall-cleanup.ps1
# Executado automaticamente pelo uninstaller do Quit antes de remover os ficheiros.
# Desfaz TODOS os bloqueios aplicados pelo Quit Blocker.
#
# Chamado pelo Electron Builder via NSIS hook:
#   !macro customUnInstall
#     ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File "$INSTDIR\resources\uninstall-cleanup.ps1"'
#   !macroend

$ErrorActionPreference = "SilentlyContinue"

# ── [1] Hosts file ─────────────────────────────────────────────────────────────
$file = "C:\Windows\System32\drivers\etc\hosts"
try {
  $content = [System.IO.File]::ReadAllText($file)
  $start = $content.IndexOf("# QUIT-BLOCKER-START")
  $end   = $content.IndexOf("# QUIT-BLOCKER-END")
  if ($start -ge 0 -and $end -ge 0) {
    $after   = $end + "# QUIT-BLOCKER-END".Length
    $content = $content.Substring(0, $start) + $content.Substring($after)
    $content = $content.TrimEnd() + "`r`n"
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::ASCII)
  }
} catch {}

# ── [2] DNS → DHCP ────────────────────────────────────────────────────────────
try {
  $adapters = (Get-NetAdapter | Where-Object { $_.Status -eq "Up" }).Name
  foreach ($a in $adapters) {
    netsh interface ip set dns "$a" dhcp 2>&1 | Out-Null
    netsh interface ipv6 set dns "$a" dhcp 2>&1 | Out-Null
  }
  ipconfig /flushdns 2>&1 | Out-Null
} catch {}

# ── [3] PAC proxy ─────────────────────────────────────────────────────────────
try {
  $reg = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
  Remove-ItemProperty -Path $reg -Name "AutoConfigURL" -ErrorAction SilentlyContinue
  Set-ItemProperty -Path $reg -Name "ProxyEnable" -Value 0
  # Notifica Windows que as definições de proxy mudaram
  Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class WinInet { [DllImport(`"wininet.dll`")] public static extern bool InternetSetOption(IntPtr h, int opt, IntPtr buf, int len); }"
  [WinInet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
  [WinInet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
} catch {}

# ── [4] IFEO app blocks ────────────────────────────────────────────────────────
try {
  $ifeo = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options"
  Get-ChildItem $ifeo | ForEach-Object {
    $dbg = (Get-ItemProperty $_.PSPath -Name "Debugger" -ErrorAction SilentlyContinue).Debugger
    if ($dbg -like "*ping.exe 0.0.0.0*") {
      Remove-ItemProperty -Path $_.PSPath -Name "Debugger" -ErrorAction SilentlyContinue
    }
  }
} catch {}

# ── [5] Estado da app ─────────────────────────────────────────────────────────
try {
  $appData = [System.Environment]::GetFolderPath("ApplicationData")
  $stateFile  = Join-Path $appData "quit-app\blocker-state.json"
  $customFile = Join-Path $appData "quit-app\custom-blocklist.json"
  if (Test-Path $stateFile)  { Remove-Item $stateFile  -Force }
  if (Test-Path $customFile) { Remove-Item $customFile -Force }
} catch {}

# Flush final
ipconfig /flushdns 2>&1 | Out-Null
