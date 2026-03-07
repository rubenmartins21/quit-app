/**
 * CalendarView — heatmap anual de desafios.
 *
 * - Número do dia em cada célula (26×26px)
 * - Grid responsivo: 4 → 3 → 2 → 1 colunas via ResizeObserver
 * - Dropdown "Partilhar": Copiar imagem / Baixar PNG
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { ChallengeData } from "../lib/ipc";

interface Props {
  challenges: ChallengeData[];
  bestStreak?: number;
}

type DayState = "streak" | "relapse" | "empty";
interface DayInfo { state: DayState; challengeId?: string; tooltip?: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfDay(iso: string): Date { const d = new Date(iso); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function buildDayMap(challenges: ChallengeData[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();
  for (const c of challenges) {
    const start = startOfDay(c.startedAt);
    const endB  = c.cancelledAt ? startOfDay(c.cancelledAt) : c.completedAt ? startOfDay(c.completedAt) : startOfDay(c.endsAt);
    let cursor  = new Date(start);
    while (cursor < endB) {
      const key = toDateKey(cursor);
      if (!map.has(key) || map.get(key)!.state !== "relapse")
        map.set(key, { state: "streak", challengeId: c.id, tooltip: `Streak — ${c.durationDays} dias` });
      cursor = addDays(cursor, 1);
    }
    if (c.cancelledAt) map.set(toDateKey(startOfDay(c.cancelledAt)), { state: "relapse", challengeId: c.id, tooltip: "Recaída" });
  }
  return map;
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

interface MonthData { year: number; month: number; weeks: (Date | null)[][]; }

function buildMonth(year: number, month: number): MonthData {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startDow   = firstDay.getDay(); startDow = startDow === 0 ? 6 : startDow - 1;
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
  return { year, month, weeks };
}

const MONTH_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DOW_LABELS  = ["S","T","Q","Q","S","S","D"];
const CELL = 26;
const GAP  = 3;

// Width of one fully-rendered month column (7 cells + 6 gaps + some breathing room)
// 7*26 + 6*3 = 182 + some label padding ≈ 190
const MONTH_COL_WIDTH = 192;

// ── Responsive column count ───────────────────────────────────────────────────

function useColumns(containerRef: React.RefObject<HTMLDivElement | null>): number {
  const [cols, setCols] = useState(4);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = (w: number) => {
      // padding 24px each side = 48px total
      const available = w - 48;
      if (available >= MONTH_COL_WIDTH * 4 + 32 * 3) setCols(4);
      else if (available >= MONTH_COL_WIDTH * 3 + 32 * 2) setCols(3);
      else if (available >= MONTH_COL_WIDTH * 2 + 32) setCols(2);
      else setCols(1);
    };

    update(el.offsetWidth);

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) update(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return cols;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, x, y }: { text: string; x: number; y: number }) {
  return (
    <div style={{
      position: "fixed", left: x + 12, top: y - 8,
      background: "var(--gray-800)", color: "var(--white)",
      fontSize: "10px", letterSpacing: "0.06em",
      padding: "5px 10px", borderRadius: "3px",
      pointerEvents: "none", zIndex: 999, whiteSpace: "nowrap",
    }}>{text}</div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({ date, dayInfo, onHover, onLeave }: {
  date: Date | null; dayInfo: DayInfo | undefined;
  onHover: (e: React.MouseEvent, info: DayInfo, date: Date) => void;
  onLeave: () => void;
}) {
  if (!date) return <div style={{ width: CELL, height: CELL, flexShrink: 0 }} />;

  const state   = dayInfo?.state ?? "empty";
  const isToday = toDateKey(date) === toDateKey(new Date());

  const bg         = state === "streak" ? "var(--green)" : state === "relapse" ? "var(--red-muted)" : "var(--gray-200)";
  const textColor  = state !== "empty" ? "rgba(255,255,255,0.9)" : "var(--gray-400)";

  return (
    <div
      onMouseEnter={dayInfo ? (e) => onHover(e, dayInfo, date) : undefined}
      onMouseLeave={dayInfo ? onLeave : undefined}
      style={{
        width: CELL, height: CELL, borderRadius: 4, background: bg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        outline: isToday ? "2px solid var(--gray-600)" : "none", outlineOffset: "1px",
      }}
    >
      <span style={{ fontSize: "8px", fontFamily: "var(--mono)", color: textColor, lineHeight: 1, userSelect: "none" }}>
        {date.getDate()}
      </span>
    </div>
  );
}

// ── Month block ───────────────────────────────────────────────────────────────

function MonthBlock({ monthData, dayMap, onHover, onLeave }: {
  monthData: MonthData; dayMap: Map<string, DayInfo>;
  onHover: (e: React.MouseEvent, info: DayInfo, date: Date) => void;
  onLeave: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
      <p style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 3, fontFamily: "var(--mono)" }}>
        {MONTH_SHORT[monthData.month]}
      </p>
      <div style={{ display: "flex", gap: GAP }}>
        {DOW_LABELS.map((l, i) => (
          <div key={i} style={{ width: CELL, height: 12, fontSize: "7px", color: "var(--gray-400)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", flexShrink: 0 }}>
            {l}
          </div>
        ))}
      </div>
      {monthData.weeks.map((week, wi) => (
        <div key={wi} style={{ display: "flex", gap: GAP }}>
          {week.map((day, di) => {
            const key = day ? toDateKey(day) : null;
            return <DayCell key={di} date={day} dayInfo={key ? dayMap.get(key) : undefined} onHover={onHover} onLeave={onLeave} />;
          })}
        </div>
      ))}
    </div>
  );
}

// ── Year selector ─────────────────────────────────────────────────────────────

function YearSelector({ year, availableYears, onChange }: {
  year: number; availableYears: number[]; onChange: (y: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onChange(year - 1)} disabled={!availableYears.includes(year - 1)} style={navBtn}>←</button>
      <span style={{ fontSize: "11px", color: "var(--gray-800)", fontFamily: "var(--mono)", letterSpacing: "0.1em", minWidth: 36, textAlign: "center" }}>{year}</span>
      <button onClick={() => onChange(year + 1)} disabled={!availableYears.includes(year + 1)} style={navBtn}>→</button>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "none", border: "1px solid var(--gray-200)", borderRadius: 3,
  color: "var(--gray-600)", fontFamily: "var(--mono)", fontSize: "11px",
  padding: "3px 8px", cursor: "pointer", lineHeight: 1.4,
};

// ── Year stats ────────────────────────────────────────────────────────────────

function useYearStats(challenges: ChallengeData[], year: number) {
  return useMemo(() => {
    let streakDays = 0, relapses = 0;
    const sy = new Date(year, 0, 1), ey = new Date(year + 1, 0, 1);
    for (const c of challenges) {
      const start = startOfDay(c.startedAt);
      const endB  = c.cancelledAt ? startOfDay(c.cancelledAt) : c.completedAt ? startOfDay(c.completedAt) : startOfDay(c.endsAt);
      let cursor  = new Date(Math.max(start.getTime(), sy.getTime()));
      const end   = new Date(Math.min(endB.getTime(), ey.getTime()));
      while (cursor < end) { streakDays++; cursor = addDays(cursor, 1); }
      if (c.cancelledAt) { const rd = startOfDay(c.cancelledAt); if (rd >= sy && rd < ey) relapses++; }
    }
    return { streakDays, relapses };
  }, [challenges, year]);
}

// ── Export helpers ────────────────────────────────────────────────────────────

async function buildExportCanvas(
  calendarEl: HTMLElement,
  year: number, streakDays: number, relapses: number, bestStreak: number,
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;

  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed", top: "-9999px", left: "-9999px",
    background: "#ffffff", padding: "36px 40px 32px",
    fontFamily: "'DM Mono','Courier New',monospace",
    width: (calendarEl.offsetWidth + 80) + "px",
    boxSizing: "border-box",
  });

  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">
      <div>
        <div style="font-family:'DM Serif Display',Georgia,serif;font-size:24px;color:#1a3d2b;font-weight:400;line-height:1;margin-bottom:6px;">Quit</div>
        <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#9a9a94;">${year}</div>
      </div>
      ${bestStreak > 0 ? `
      <div style="text-align:right;">
        <div style="font-family:'DM Serif Display',Georgia,serif;font-size:32px;color:#1a3d2b;line-height:1;">${bestStreak}</div>
        <div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#9a9a94;margin-top:3px;">melhor streak</div>
      </div>` : ""}
    </div>
    <div style="display:flex;gap:24px;margin-bottom:20px;align-items:center;">
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="width:10px;height:10px;border-radius:2px;background:#1a3d2b;flex-shrink:0;"></div>
        <span style="font-size:11px;color:#9a9a94;font-family:'DM Mono',monospace;">
          <span style="color:#2a2a26;font-weight:500;">${streakDays}</span> dias de streak
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="width:10px;height:10px;border-radius:2px;background:#c0392b;flex-shrink:0;"></div>
        <span style="font-size:11px;color:#9a9a94;font-family:'DM Mono',monospace;">
          <span style="color:#2a2a26;font-weight:500;">${relapses}</span> recaída${relapses !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  `;

  const clone = calendarEl.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { padding: "0", border: "none", background: "transparent", boxShadow: "none" });
  // Hide controls row (first child = header with buttons/year selector)
  const firstChild = clone.firstElementChild as HTMLElement | null;
  if (firstChild) firstChild.style.display = "none";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    return await html2canvas(wrapper, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
  } finally {
    document.body.removeChild(wrapper);
  }
}

async function copyImageToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error("blob null")); return; }
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        resolve();
      } catch (e) { reject(e); }
    }, "image/png");
  });
}

async function downloadImage(canvas: HTMLCanvasElement, year: number): Promise<void> {
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return; }
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href = url; a.download = `quit-${year}.png`; a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

// ── Share dropdown ────────────────────────────────────────────────────────────

type ShareAction = "copy" | "download";
type ShareState  = "idle" | "loading" | "done" | "error";

function ShareDropdown({ onAction, disabled }: {
  onAction: (action: ShareAction) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 12px",
          border: "1px solid var(--gray-200)",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.08em",
          color: "var(--gray-600)", background: "transparent",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: "11px", lineHeight: 1 }}>⎘</span>
        Partilhar
        <span style={{ fontSize: "8px", lineHeight: 1, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0,
          background: "var(--white)",
          border: "1px solid var(--gray-200)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          minWidth: "160px", zIndex: 50,
          overflow: "hidden",
        }}>
          {([
            { action: "copy"     as ShareAction, icon: "⎘", label: "Copiar imagem" },
            { action: "download" as ShareAction, icon: "↓", label: "Baixar PNG"    },
          ] as const).map(({ action, icon, label }) => (
            <div
              key={action}
              onClick={() => { setOpen(false); onAction(action); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px", cursor: "pointer",
                fontSize: "11px", color: "var(--gray-700)",
                fontFamily: "var(--mono)", letterSpacing: "0.06em",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--gray-50)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "13px", lineHeight: 1, color: "var(--gray-400)" }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CalendarView({ challenges, bestStreak = 0 }: Props) {
  const today = new Date();

  const availableYears = useMemo(() => {
    const years = new Set<number>([today.getFullYear()]);
    for (const c of challenges) {
      years.add(new Date(c.startedAt).getFullYear());
      if (c.cancelledAt) years.add(new Date(c.cancelledAt).getFullYear());
      if (c.completedAt) years.add(new Date(c.completedAt).getFullYear());
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [challenges]);

  const [year, setYear]           = useState(() => availableYears[availableYears.length - 1] ?? today.getFullYear());
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [shareMsg, setShareMsg]     = useState("");
  const [tooltip, setTooltip]       = useState<{ text: string; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cols         = useColumns(containerRef);

  const dayMap = useMemo(() => buildDayMap(challenges), [challenges]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => buildMonth(year, m)), [year]);

  const yearChallenges = useMemo(() => {
    const s = new Date(year, 0, 1), e = new Date(year + 1, 0, 1);
    return challenges.filter(c => {
      const cs = new Date(c.startedAt);
      const ce = c.cancelledAt ? new Date(c.cancelledAt) : c.completedAt ? new Date(c.completedAt) : new Date(c.endsAt);
      return cs < e && ce >= s;
    });
  }, [challenges, year]);

  const { streakDays, relapses } = useYearStats(yearChallenges, year);

  function handleHover(e: React.MouseEvent, info: DayInfo, date: Date) {
    const label = date.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
    setTooltip({ text: `${label} — ${info.tooltip}`, x: e.clientX, y: e.clientY });
  }

  async function handleShare(action: ShareAction) {
    if (!containerRef.current) return;
    setShareState("loading");
    setShareMsg("");

    try {
      const canvas = await buildExportCanvas(containerRef.current, year, streakDays, relapses, bestStreak);

      if (action === "copy") {
        try {
          await copyImageToClipboard(canvas);
          setShareMsg("Copiado ✓");
        } catch {
          // Clipboard failed — fallback to download silently
          await downloadImage(canvas, year);
          setShareMsg("Baixado ✓");
        }
      } else {
        await downloadImage(canvas, year);
        setShareMsg("Baixado ✓");
      }

      setShareState("done");
      setTimeout(() => { setShareState("idle"); setShareMsg(""); }, 2500);
    } catch {
      setShareState("error");
      setShareMsg("Erro — tenta novamente");
      setTimeout(() => { setShareState("idle"); setShareMsg(""); }, 3000);
    }
  }

  // Gap between columns adapts to available space
  const colGap = cols >= 3 ? "28px 32px" : cols === 2 ? "24px 28px" : "20px";

  return (
    <div ref={containerRef} style={containerStyle}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={sectionLabel}>Calendário</p>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <StatPill label="dias de streak" value={streakDays} color="var(--green)" />
            <StatPill label="recaídas"       value={relapses}   color="var(--red-muted)" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Feedback label */}
          {shareMsg && (
            <span style={{
              fontSize: "10px", fontFamily: "var(--mono)",
              color: shareState === "error" ? "var(--red-muted)" : "var(--green)",
              letterSpacing: "0.06em",
            }}>
              {shareMsg}
            </span>
          )}
          <ShareDropdown onAction={handleShare} disabled={shareState === "loading"} />
          <YearSelector year={year} availableYears={availableYears} onChange={setYear} />
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <LegendItem color="var(--green)"     label="Dia de streak" />
        <LegendItem color="var(--red-muted)" label="Recaída" />
        <LegendItem color="var(--gray-200)"  label="Sem registo" />
        <span style={{ fontSize: "9px", color: "var(--gray-400)", fontFamily: "var(--mono)", opacity: 0.7 }}>· hoje com contorno</span>
      </div>

      {/* ── Month grid — responsive columns ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, auto)`,
        gap: colGap,
        justifyContent: "start",
      }}>
        {months.map((m) => (
          <MonthBlock key={m.month} monthData={m} dayMap={dayMap} onHover={handleHover} onLeave={() => setTooltip(null)} />
        ))}
      </div>

      {yearChallenges.length === 0 && (
        <p style={{ fontSize: "11px", color: "var(--gray-400)", marginTop: 16, fontFamily: "var(--mono)" }}>
          Nenhum desafio em {year}.
        </p>
      )}

      {tooltip && <Tooltip text={tooltip.text} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, opacity: 0.85, flexShrink: 0 }} />
      <span style={{ fontSize: "10px", color: "var(--gray-400)", fontFamily: "var(--mono)" }}>
        <span style={{ color: "var(--gray-800)", fontWeight: 500 }}>{value}</span>{" "}{label}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: color === "var(--gray-200)" ? 0.8 : 0.85, flexShrink: 0 }} />
      <span style={{ fontSize: "9px", color: "var(--gray-400)", fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: "20px 24px",
  border: "1px solid var(--gray-200)",
  borderRadius: "var(--radius-md)",
  background: "var(--gray-50)",
  position: "relative",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
  color: "var(--gray-400)", fontFamily: "var(--mono)", marginBottom: 6,
};
