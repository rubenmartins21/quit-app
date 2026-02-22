import { ipcMain } from "electron";
import { z } from "zod";
import * as api from "../services/apiClient.js";

const CreateSchema = z.object({ durationDays: z.number().int().min(7), reason: z.string().min(10).max(500).trim() });
const QuitRequestSchema = z.object({ id: z.string(), feeling: z.string().min(5).max(1000).trim() });

ipcMain.handle("challenge:create", async (_e, payload: unknown) => {
  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  const res = await api.createChallenge(parsed.data.durationDays, parsed.data.reason);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:active", async () => {
  const res = await api.getActiveChallenge();
  return res.error ? { error: res.error } : { ok: true, challenge: res.data?.challenge ?? null };
});

ipcMain.handle("challenge:cancel", async (_e, id: unknown) => {
  if (typeof id !== "string") return { error: "ID inválido" };
  const res = await api.cancelChallenge(id);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:quit-request:create", async (_e, payload: unknown) => {
  const parsed = QuitRequestSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  const res = await api.createQuitRequest(parsed.data.id, parsed.data.feeling);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:quit-request:cancel", async (_e, id: unknown) => {
  if (typeof id !== "string") return { error: "ID inválido" };
  const res = await api.cancelQuitRequest(id);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:history", async () => {
  const res = await api.getChallengeHistory();
  return res.error ? { error: res.error } : { ok: true, challenges: res.data?.challenges ?? [] };
});
