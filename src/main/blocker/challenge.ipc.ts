import { ipcMain } from "electron";
import { z } from "zod";
import * as api from "../services/apiClient.js";
import { activateBlocker, deactivateBlocker, loadBlockerState } from "../blocker/blockerService.js";

const CreateSchema = z.object({
  durationDays: z.number().int().min(7),
  reason: z.string().min(10).max(500).trim(),
});
const QuitRequestSchema = z.object({
  id: z.string(),
  feeling: z.string().min(5).max(1000).trim(),
});

/**
 * Verifica se o bloqueio deve ser desativado com base no estado do desafio.
 * Chamado sempre que buscamos o desafio ativo.
 * Se não há desafio ativo (null) e o bloqueio está ativo → desativa.
 */
async function syncBlockerWithChallengeState(challenge: api.ChallengeData | null): Promise<void> {
  const blockerState = loadBlockerState();

  if (!blockerState.active) return; // bloqueio já inativo, nada a fazer

  if (challenge === null) {
    // Sem desafio ativo (completado, cancelado, ou nunca existiu)
    // → desativar bloqueio
    console.log("🔓 No active challenge detected — deactivating blocker automatically");
    await deactivateBlocker();
    return;
  }

  if (challenge.status !== "active") {
    // Desafio existe mas não está ativo (cancelled, completed)
    console.log(`🔓 Challenge status is '${challenge.status}' — deactivating blocker`);
    await deactivateBlocker();
  }
}

// Create challenge + activate blocker
ipcMain.handle("challenge:create", async (_e, payload: unknown) => {
  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const res = await api.createChallenge(parsed.data.durationDays, parsed.data.reason);
  if (res.error || !res.data) return { error: res.error ?? "Erro ao criar desafio" };

  console.log("🔒 Challenge created, activating blocker...");
  const blockerResult = await activateBlocker(res.data.id);
  if (!blockerResult.ok) console.warn("⚠️  Blocker activation failed:", blockerResult.error);

  return { ok: true, challenge: res.data, blockerActive: blockerResult.ok };
});

// Get active challenge + sync blocker state
ipcMain.handle("challenge:active", async () => {
  const res = await api.getActiveChallenge();
  if (res.error) return { error: res.error };

  const challenge = res.data?.challenge ?? null;

  // Always sync blocker state with reality
  await syncBlockerWithChallengeState(challenge);

  return { ok: true, challenge };
});

// Cancel challenge + deactivate blocker
ipcMain.handle("challenge:cancel", async (_e, id: unknown) => {
  if (typeof id !== "string") return { error: "ID inválido" };

  const res = await api.cancelChallenge(id);
  if (res.error || !res.data) return { error: res.error ?? "Erro ao cancelar" };

  console.log("🔓 Challenge cancelled, deactivating blocker...");
  await deactivateBlocker();

  return { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:quit-request:create", async (_e, payload: unknown) => {
  const parsed = QuitRequestSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const res = await api.createQuitRequest(parsed.data.id, parsed.data.feeling);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});

// Cancel quit request — blocker stays active (challenge resumes)
ipcMain.handle("challenge:quit-request:cancel", async (_e, id: unknown) => {
  if (typeof id !== "string") return { error: "ID inválido" };
  const res = await api.cancelQuitRequest(id);
  return res.error ? { error: res.error } : { ok: true, challenge: res.data };
});

ipcMain.handle("challenge:history", async () => {
  const res = await api.getChallengeHistory();
  return res.error ? { error: res.error } : { ok: true, challenges: res.data?.challenges ?? [] };
});
