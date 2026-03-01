import { ipcMain } from "electron";
import { z } from "zod";
import {
  activateBlocker,
  deactivateBlocker,
  getBlockerStatus,
  loadBlockerState,
  addToActiveBlocker,
} from "../blocker/blockerService.js";
import { getInstalledApps, loadCustomBlocklist } from "../blocker/customBlocklist.js";

ipcMain.handle("blocker:status", async () => {
  const state = loadBlockerState();
  const custom = loadCustomBlocklist();
  return {
    ok: true,
    active: state.active,
    challengeId: state.challengeId,
    blockReddit: custom?.blockReddit ?? false,
    blockTwitter: custom?.blockTwitter ?? false,
    blockedApps: custom?.blockedApps ?? [],
    blockedUrls: custom?.blockedUrls ?? [],
  };
});

ipcMain.handle("blocker:activate", async (_e, challengeId: unknown) => {
  if (typeof challengeId !== "string") return { error: "challengeId inválido" };
  const result = await activateBlocker(challengeId);
  return result.ok ? { ok: true } : { error: result.error ?? "Falha ao ativar bloqueio" };
});

ipcMain.handle("blocker:deactivate", async () => {
  const result = await deactivateBlocker();
  return result.ok ? { ok: true } : { error: result.error ?? "Falha ao desativar bloqueio" };
});

ipcMain.handle("blocker:full-status", async () => {
  const status = await getBlockerStatus();
  return { ok: true, ...status };
});

ipcMain.handle("blocker:installed-apps", async () => {
  const apps = getInstalledApps();
  return { ok: true, apps };
});

// Handler unificado — URL, app, Reddit toggle, Twitter toggle
ipcMain.handle("blocker:add", async (_e, payload: unknown) => {
  const schema = z.object({
    url:          z.string().min(3).max(200).optional(),
    app:          z.object({ name: z.string(), exePath: z.string() }).optional(),
    blockReddit:  z.boolean().optional(),
    blockTwitter: z.boolean().optional(),
  });
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "Payload inválido" };
  const result = await addToActiveBlocker(parsed.data);
  return result.ok ? { ok: true } : { error: result.error };
});
