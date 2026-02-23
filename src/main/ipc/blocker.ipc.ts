import { ipcMain } from "electron";
import { activateBlocker, deactivateBlocker, getBlockerStatus, loadBlockerState } from "../blocker/blockerService.js";

// Get current blocker state (fast, no elevation needed)
ipcMain.handle("blocker:status", async () => {
  const state = loadBlockerState();
  return { ok: true, active: state.active, challengeId: state.challengeId };
});

// Activate — triggers UAC prompt
ipcMain.handle("blocker:activate", async (_e, challengeId: unknown) => {
  if (typeof challengeId !== "string") return { error: "challengeId inválido" };
  const result = await activateBlocker(challengeId);
  return result.ok ? { ok: true } : { error: result.error ?? "Falha ao ativar bloqueio" };
});

// Deactivate — triggers UAC prompt
ipcMain.handle("blocker:deactivate", async () => {
  const result = await deactivateBlocker();
  return result.ok ? { ok: true } : { error: result.error ?? "Falha ao desativar bloqueio" };
});

// Full status check (with elevation for accurate hosts/DNS state)
ipcMain.handle("blocker:full-status", async () => {
  const status = await getBlockerStatus();
  return { ok: true, ...status };
});
