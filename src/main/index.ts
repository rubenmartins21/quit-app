import { app, BrowserWindow, shell, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { loadSession } from "./services/session.js";
import { setToken, getActiveChallenge } from "./services/apiClient.js";
import { getOrCreateDeviceId } from "./services/device.js";
import {
  loadBlockerState,
  loadAndRestoreInterceptor,
  deactivateBlocker,
} from "./blocker/blockerService.js";
import { stopWatchdog } from "./blocker/blockerWatchdog.js";

const IS_UNINSTALL = process.argv.includes("--uninstall");
const IS_QUIET_UNINSTALL = process.argv.includes("--quiet");

import "./ipc/auth.ipc.js";
import "./ipc/challenge.ipc.js";
import "./ipc/blocker.ipc.js";

import fs from "fs";
const logFile = path.join(app.getPath("userData"), "blocker-debug.log");
const logStream = fs.createWriteStream(logFile, { flags: "a" });
const origLog = console.log.bind(console);
console.log = (...args) => {
  origLog(...args);
  logStream.write(args.join(" ") + "\n");
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const BLOCKER_SYNC_INTERVAL_MS = 5 * 60 * 1000;

async function syncBlockerInBackground(): Promise<void> {
  const state = loadBlockerState();
  if (!state.active) return;

  const session = loadSession();
  if (!session) {
    // Sem sessão — não conseguimos verificar o backend → mantém bloqueio
    console.log("⏰ Sync: no session — keeping blocker active");
    return;
  }

  try {
    const res = await getActiveChallenge();

    if (res.error) {
      // Erro de rede — mantém bloqueio por segurança
      console.warn("⏰ Sync: backend unreachable, keeping blocker active");
      return;
    }

    const challenge = res.data?.challenge ?? null;

    if (challenge === null || challenge.status !== "active") {
      console.log("⏰ Sync: no active challenge — deactivating blocker");
      await deactivateBlocker();
    }
  } catch (err) {
    console.warn("⏰ Sync failed:", err);
  }
}

// ── Uninstall flow ────────────────────────────────────────────────────────────

function createUninstallWindow(): void {
  const win = new BrowserWindow({
    width: 480,
    height: 520,
    resizable: false,
    maximizable: false,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#fafaf9",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false,
  });

  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => win.show());

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + "?screen=uninstall");
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"), {
      query: { screen: "uninstall" },
    });
  }
}

// IPC: utilizador confirmou desinstalação no ecrã de fricção
import { ipcMain } from "electron";

ipcMain.handle("app:confirm-uninstall", async () => {
  console.log("🗑️  Uninstall confirmed by user");

  // 1. Corre cleanup (hosts, DNS, PAC, IFEO)
  try {
    const cleanupScript = path.join(
      process.resourcesPath ?? app.getAppPath(),
      "uninstall-cleanup.ps1"
    );
    execSync(
      `powershell -ExecutionPolicy Bypass -NonInteractive -WindowStyle Hidden -File "${cleanupScript}"`,
      { stdio: "ignore" }
    );
  } catch (err) {
    console.warn("⚠️  Cleanup script failed:", err);
  }

  // 2. Lê o RealUninstallString do registry e corre o uninstaller real
  try {
    const { execSync: exec } = await import("child_process");
    const realUninstaller = exec(
      `reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${app.getName()}" /v RealUninstallString`,
      { encoding: "utf-8" }
    );
    const match = realUninstaller.match(/RealUninstallString\s+REG_SZ\s+(.+)/);
    if (match) {
      const cmd = match[1].trim();
      exec(`${cmd} /S`, { stdio: "ignore" } as any);
    }
  } catch {
    // Fallback: procura o uninstaller na pasta de instalação
    try {
      const uninstallerPath = path.join(
        path.dirname(process.execPath),
        "Uninstall Quit.exe"
      );
      execSync(`"${uninstallerPath}" /S`, { stdio: "ignore" });
    } catch {}
  }

  app.quit();
});

ipcMain.handle("app:cancel-uninstall", () => {
  // Fecha a janela de desinstalação sem fazer nada
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.close();
  }
});

// ── App ready ─────────────────────────────────────────────────────────────────

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 720,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#f9f9f8",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false,
  });

  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.on("ready", async () => {
  // ── Modo desinstalação ────────────────────────────────────────────────────
  if (IS_UNINSTALL) {
    if (IS_QUIET_UNINSTALL) {
      // Desinstalação silenciosa (ex: via script) — só cleanup, sem UI
      ipcMain.emit("app:confirm-uninstall");
    } else {
      // Mostra ecrã de fricção
      createUninstallWindow();
    }
    return;
  }

  // ── Modo normal ───────────────────────────────────────────────────────────
  getOrCreateDeviceId();

  const token = loadSession();
  if (token) {
    setToken(token);
    console.log("✅ Session restored");
  }

  // Restaura PAC server + interceptor se bloqueio estava ativo
  await loadAndRestoreInterceptor();

  // Sync imediato ao arrancar — remove bloqueio órfão se desafio já terminou
  await syncBlockerInBackground();

  // Sync periódico a cada 5 minutos
  setInterval(syncBlockerInBackground, BLOCKER_SYNC_INTERVAL_MS);

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Despersuadir saída com desafio activo
app.on("before-quit", (e) => {
  const state = loadBlockerState();
  if (!state.active) return; // sem desafio activo, sai normalmente

  // Notifica o renderer para mostrar aviso (se janela estiver aberta)
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("app:before-quit", {});
    }
  }

  // Mostra diálogo nativo de confirmação
  e.preventDefault();

  dialog.showMessageBox({
    type: "warning",
    title: "Desafio activo",
    message: "Tens um desafio activo",
    detail:
      "Se fechares o Quit, o bloqueio mantém-se activo no teu sistema — nada muda. " +
      "Podes reabrir o Quit a qualquer momento para gerir o teu desafio.\n\n" +
      "Tens a certeza que queres fechar?",
    buttons: ["Fechar mesmo assim", "Manter aberto"],
    defaultId: 1,     // foco no "Manter aberto"
    cancelId: 1,
    noLink: true,
  }).then(({ response }) => {
    if (response === 0) {
      // Utilizador confirmou saída
      stopWatchdog();
      app.quit();
    }
    // response === 1 → não faz nada, app continua
  });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
