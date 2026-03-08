; installer.nsh — Quit Blocker NSIS hooks
;
; Localização: build/installer.nsh
; Incluído automaticamente pelo Electron Builder via nsis.include
;
; O que faz:
;   Instalação  → sobrescreve UninstallString para apontar para o Electron
;                 com a flag --uninstall (em vez do uninstaller real)
;   Desinstalação → o Electron já tratou da fricção; aqui só corre o cleanup
;                   e depois chama o uninstaller real

; ── Macro chamada NO FIM da instalação ───────────────────────────────────────
!macro customInstall
  ; Guarda o caminho do uninstaller real antes de o sobrescrever
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "UninstallString"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "RealUninstallString" "$0"

  ; Sobrescreve UninstallString para apontar para o Electron com --uninstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "UninstallString" '"$INSTDIR\Quit.exe" --uninstall'

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "QuietUninstallString" '"$INSTDIR\Quit.exe" --uninstall --quiet'
!macroend

; ── Macro chamada NO INÍCIO da desinstalação ─────────────────────────────────
!macro customUnInstall
  ; Corre o script de cleanup
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" \
    -ExecutionPolicy Bypass \
    -NonInteractive \
    -WindowStyle Hidden \
    -File "$INSTDIR\resources\uninstall-cleanup.ps1"'

  ; Restaura UninstallString original para o uninstaller real
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "RealUninstallString"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "UninstallString" "$0"
!macroend
