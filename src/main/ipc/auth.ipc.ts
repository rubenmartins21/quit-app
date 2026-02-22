import { ipcMain } from "electron";
import { z } from "zod";
import * as api from "../services/apiClient.js";
import { saveSession, clearSession } from "../services/session.js";
import { getOrCreateDeviceId, getDevicePlatform } from "../services/device.js";

ipcMain.handle("auth:request-otp", async (_e, email: unknown) => {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { error: "Email invalido" };
  const res = await api.requestOtp(parsed.data);
  return res.error ? { error: res.error } : { ok: true };
});

ipcMain.handle("auth:verify-otp", async (_e, payload: unknown) => {
  const parsed = z.object({ email: z.string().email(), code: z.string().length(6) }).safeParse(payload);
  if (!parsed.success) return { error: "Dados invalidos" };
  const res = await api.verifyOtp(parsed.data.email, parsed.data.code, getOrCreateDeviceId(), getDevicePlatform());
  if (res.error || !res.data) return { error: res.error ?? "Erro" };
  saveSession(res.data.token);
  api.setToken(res.data.token);
  return { ok: true, user: res.data.user };
});

ipcMain.handle("auth:me", async () => {
  const res = await api.getMe();
  if (res.error || !res.data) return { error: res.error ?? "Sessao invalida" };
  return { ok: true, user: res.data };
});

ipcMain.handle("auth:logout", async () => {
  clearSession();
  api.setToken(null);
  return { ok: true };
});
