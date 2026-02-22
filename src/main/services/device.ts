import { app } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export function getOrCreateDeviceId(): string {
  const filePath = path.join(app.getPath("userData"), "device.json");
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (data.deviceId) return data.deviceId;
    }
  } catch {}
  const deviceId = crypto.randomUUID();
  fs.writeFileSync(filePath, JSON.stringify({ deviceId, createdAt: new Date().toISOString() }, null, 2));
  return deviceId;
}

export function getDevicePlatform(): "windows" | "mac" | "linux" {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "mac";
  return "linux";
}
