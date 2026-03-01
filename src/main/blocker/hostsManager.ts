/**
 * hostsManager — modifies Windows hosts file to block adult domains.
 * Requires elevation. Called via the elevated helper.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  ADULT_DOMAINS,
  HOSTS_MARKER_START,
  HOSTS_MARKER_END,
} from "./blocklist.js";

const HOSTS_PATH = "C:\\Windows\\System32\\drivers\\etc\\hosts";

function readHosts(): string {
  return fs.readFileSync(HOSTS_PATH, "utf-8");
}

function writeHosts(content: string): void {
  fs.writeFileSync(HOSTS_PATH, content, "utf-8");
  // Flush DNS cache
  try { execSync("ipconfig /flushdns", { stdio: "ignore" }); } catch {}
}

function buildBlockEntries(): string {
  const lines: string[] = [HOSTS_MARKER_START];

  // Block adult domains
  for (const domain of ADULT_DOMAINS) {
    lines.push(`0.0.0.0 ${domain}`);
  }

  lines.push(HOSTS_MARKER_END);
  return lines.join("\n");
}

export function isBlockActive(): boolean {
  try {
    const content = readHosts();
    return content.includes(HOSTS_MARKER_START);
  } catch {
    return false;
  }
}

export function activateBlock(): { ok: boolean; error?: string } {
  try {
    let content = readHosts();

    // Remove any existing quit entries first
    content = removeQuitEntries(content);

    // Append new entries
    content = content.trimEnd() + "\n\n" + buildBlockEntries() + "\n";
    writeHosts(content);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function deactivateBlock(): { ok: boolean; error?: string } {
  try {
    let content = readHosts();
    content = removeQuitEntries(content);
    writeHosts(content);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function removeQuitEntries(content: string): string {
  const startIdx = content.indexOf(HOSTS_MARKER_START);
  const endIdx = content.indexOf(HOSTS_MARKER_END);

  if (startIdx === -1 || endIdx === -1) return content;

  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx + HOSTS_MARKER_END.length);

  return (before + after).replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
