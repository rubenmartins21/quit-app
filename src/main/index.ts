import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { loadSession } from "./services/session.js";
import { setToken } from "./services/apiClient.js";
import { getOrCreateDeviceId } from "./services/device.js";

// Register IPC handlers
import "./ipc/auth.ipc.js";
import "./ipc/challenge.ipc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 720,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#f9f9f8",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,   // REQUIRED — renderer can't access Node
      nodeIntegration: false,   // REQUIRED — no Node in renderer
      sandbox: true,            // Extra isolation
      webSecurity: true,
    },
    show: false, // Prevent white flash
  });

  // Hide menu bar
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in browser, not in app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isDev && url.startsWith("http://localhost:5173")) return;
    event.preventDefault();
  });

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.on("ready", async () => {
  // Ensure deviceId exists from first launch
  getOrCreateDeviceId();

  // Restore session if available
  const token = loadSession();
  if (token) {
    setToken(token);
    console.log("✅  Session restored from disk");
  }

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
