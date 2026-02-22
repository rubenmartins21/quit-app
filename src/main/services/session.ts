import { app } from "electron";
import fs from "fs";
import path from "path";

const sessionFile = () => path.join(app.getPath("userData"), "session.json");

export function saveSession(token: string): void {
  fs.writeFileSync(sessionFile(), JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2));
}

export function loadSession(): string | null {
  try {
    if (!fs.existsSync(sessionFile())) return null;
    const data = JSON.parse(fs.readFileSync(sessionFile(), "utf-8"));
    return data.token ?? null;
  } catch { return null; }
}

export function clearSession(): void {
  if (fs.existsSync(sessionFile())) fs.unlinkSync(sessionFile());
}
