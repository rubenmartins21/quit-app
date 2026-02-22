import { ipcMain } from "electron";
import { z } from "zod";
import * as api from "../services/apiClient.js";

const CreateSchema = z.object({
  durationDays: z.number().int().min(7),
  reason: z.string().min(10).max(500).trim(),
});

ipcMain.handle("challenge:create", async (_e, payload: unknown) => {
  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Dados invalidos";
    return { error: msg };
  }
  const res = await api.createChallenge(parsed.data.durationDays, parsed.data.reason);
  if (res.error || !res.data) return { error: res.error ?? "Erro ao criar desafio" };
  return { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:active", async () => {
  const res = await api.getActiveChallenge();
  if (res.error) return { error: res.error };
  return { ok: true, challenge: res.data?.challenge ?? null };
});

ipcMain.handle("challenge:cancel", async (_e, id: unknown) => {
  if (typeof id !== "string") return { error: "ID invalido" };
  const res = await api.cancelChallenge(id);
  if (res.error || !res.data) return { error: res.error ?? "Erro ao cancelar" };
  return { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:history", async () => {
  const res = await api.getChallengeHistory();
  if (res.error) return { error: res.error };
  return { ok: true, challenges: res.data?.challenges ?? [] };
});
