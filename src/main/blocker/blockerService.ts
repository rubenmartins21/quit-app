/**
 * blockerService — orchestrates activation/deactivation of all blocking methods.
 * Called from IPC handlers. Never imported by renderer.
 */

import { app } from "electron";
import fs from "fs";
import path from "path";
import { runElevated } from "./elevatedHelper.js";

interface BlockerState {
  active: boolean;
  activatedAt: string | null;
  challengeId: string | null;
}

function getStatePath(): string {
  return path.join(app.getPath("userData"), "blocker-state.json");
}

export function loadBlockerState(): BlockerState {
  try {
    const raw = fs.readFileSync(getStatePath(), "utf-8");
    return JSON.parse(raw) as BlockerState;
  } catch {
    return { active: false, activatedAt: null, challengeId: null };
  }
}

function saveBlockerState(state: BlockerState): void {
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf-8");
}

export async function activateBlocker(challengeId: string): Promise<{ ok: boolean; error?: string }> {
  console.log("🔒 Activating blocker for challenge:", challengeId);

  const result = await runElevated("activate");

  if (result.ok) {
    saveBlockerState({
      active: true,
      activatedAt: new Date().toISOString(),
      challengeId,
    });
    console.log("✅ Blocker activated");
  } else {
    console.error("❌ Blocker activation failed:", result.error);
  }

  return result;
}

export async function deactivateBlocker(): Promise<{ ok: boolean; error?: string }> {
  console.log("🔓 Deactivating blocker...");

  const result = await runElevated("deactivate");

  if (result.ok) {
    saveBlockerState({ active: false, activatedAt: null, challengeId: null });
    console.log("✅ Blocker deactivated");
  } else {
    console.error("❌ Blocker deactivation failed:", result.error);
  }

  return result;
}

export async function getBlockerStatus(): Promise<{ active: boolean; hostsActive: boolean; dnsActive: boolean }> {
  const state = loadBlockerState();
  if (!state.active) return { active: false, hostsActive: false, dnsActive: false };

  const result = await runElevated("status");
  return {
    active: state.active,
    hostsActive: result.hostsActive ?? false,
    dnsActive: result.dnsActive ?? false,
  };
}
