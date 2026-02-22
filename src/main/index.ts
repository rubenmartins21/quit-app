import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { loadSession } from "./services/session.js";
import { setToken } from "./services/apiClient.js";
import { getOrCreateDeviceId } from "./services/device.js";
import "./ipc/auth.ipc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!VITE_DEV_SERVER_URL;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960, height: 660, minWidth: 720, minHeight: 500,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#f9f9f8",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    },
    show: false
  });

  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });

  if (isDev) {
    win.loadURL(VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.on("ready", () => {
  getOrCreateDeviceId();
  const token = loadSession();
  if (token) { setToken(token); console.log("Sessao restaurada"); }
  createWindow();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
