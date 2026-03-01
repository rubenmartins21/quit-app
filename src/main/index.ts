import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { loadSession } from "./services/session.js";
import { setToken, getActiveChallenge } from "./services/apiClient.js";
import { getOrCreateDeviceId } from "./services/device.js";
import {
  loadBlockerState,
  loadAndRestoreInterceptor,
  deactivateBlocker,
} from "./blocker/blockerService.js";

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

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
