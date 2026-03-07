/**
 * CalendarView — heatmap anual de desafios.
 *
 * Novidades:
 *  - Número do dia visível em cada célula (quadradinhos 26×26px)
 *  - Botão "Copiar imagem" — gera PNG via html2canvas e copia para clipboard
 *    A imagem inclui: logo "Quit", stats do ano, melhor streak, calendário
 *
 * Dependência: html2canvas  →  npm install html2canvas
 */

import React, { useMemo, useState, useRef } from "react";
import { ChallengeData } from "../lib/ipc";

interface Props {
  challenges: ChallengeData[];
  bestStreak?: number;
}

type DayState = "streak" | "relapse" | "empty";

interface DayInfo {
  state: DayState;
  challengeId?: string;
  tooltip?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildDayMap(challenges: ChallengeData[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();
  for (const c of challenges) {
    const start = startOfDay(c.startedAt);
    const endBoundary = c.cancelledAt
      ? startOfDay(c.cancelledAt)
      : c.completedAt ? startOfDay(c.completedAt) : startOfDay(c.endsAt);

    let cursor = new Date(start);
    while (cursor < endBoundary) {
      const key = toDateKey(cursor);
      if (!map.has(key) || map.get(key)!.state !== "relapse") {
        map.set(key, { state: "streak", challengeId: c.id, tooltip: `Streak — ${c.durationDays} dias` });
      }
      cursor = addDays(cursor, 1);
    }
    if (c.cancelledAt) {
      const key = toDateKey(startOfDay(c.cancelledAt));
      map.set(key, { state: "relapse", challengeId: c.id, tooltip: "Recaída" });
    }
  }
  return map;
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

interface MonthData { year: number; month: number; weeks: (Date | null)[][]; }

function buildMonth(year: number, month: number): MonthData {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return { year, month, weeks };
}

const MONTH_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DOW_LABELS  = ["S","T","Q","Q","S","S","D"];
const CELL = 26;
const GAP  = 3;

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, x, y }: { text: string; x: number; y: number }) {
  return (
    <div style={{
      position: "fixed", left: x + 12, top: y - 8,
      background: "var(--gray-800)", color: "var(--white)",
      fontSize: "10px", letterSpacing: "0.06em",
      padding: "5px 10px", borderRadius: "3px",
      pointerEvents: "none", zIndex: 999, whiteSpace: "nowrap",
    }}>
      {text}
    </div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({ date, dayInfo, onHover, onLeave }: {
  date: Date | null;
  dayInfo: DayInfo | undefined;
  onHover: (e: React.MouseEvent, info: DayInfo, date: Date) => void;
  onLeave: () => void;
}) {
  if (!date) return <div style={{ width: CELL, height: CELL }} />;

  const state   = dayInfo?.state ?? "empty";
  const isToday = toDateKey(date) === toDateKey(new Date());

  const bg =
    state === "streak"  ? "var(--green)" :
    state === "relapse" ? "var(--red-muted)" :
    "var(--gray-200)";

  const textColor =
    state === "streak"  ? "rgba(255,255,255,0.9)" :
    state === "relapse" ? "rgba(255,255,255,0.95)" :
    "var(--gray-400)";

  return (
    <div
      onMouseEnter={dayInfo ? (e) => onHover(e, dayInfo, date) : undefined}
      onMouseLeave={dayInfo ? onLeave : undefined}
      style={{
        width: CELL, height: CELL, borderRadius: 4,
        background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        outline: isToday ? "2px solid var(--gray-600)" : "none",
        outlineOffset: "1px", flexShrink: 0,
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
  monthData: MonthData;
  dayMap: Map<string, DayInfo>;
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
      let cursor = new Date(Math.max(start.getTime(), sy.getTime()));
      const end  = new Date(Math.min(endB.getTime(), ey.getTime()));
      while (cursor < end) { streakDays++; cursor = addDays(cursor, 1); }
      if (c.cancelledAt) {
        const rd = startOfDay(c.cancelledAt);
        if (rd >= sy && rd < ey) relapses++;
      }
    }
    return { streakDays, relapses };
  }, [challenges, year]);
}

// ── Export via html2canvas ────────────────────────────────────────────────────

async function exportCalendarImage(
  calendarEl: HTMLElement,
  year: number,
  streakDays: number,
  relapses: number,
  bestStreak: number,
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;

  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed",
    top: "-9999px",
    left: "-9999px",
    background: "#ffffff",
    padding: "36px 40px 32px",
    fontFamily: "'DM Mono','Courier New',monospace",
    width: (calendarEl.offsetWidth + 80) + "px",
    boxSizing: "border-box",
  });

  // Header: logo Quit + ano + melhor streak
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

  // Clone do calendário sem chrome (padding, borda, fundo)
  const clone = calendarEl.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { padding: "0", border: "none", background: "transparent", boxShadow: "none" });

  // Remove o header de controlos (ano selector + botão copiar) do clone
  // — é sempre o primeiro filho do container
  const firstChild = clone.firstElementChild as HTMLElement | null;
  if (firstChild) firstChild.style.display = "none";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    await new Promise<void>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(); return; }
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        } catch {
          // Fallback: download directo
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `quit-${year}.png`; a.click();
          URL.revokeObjectURL(url);
        }
        resolve();
      }, "image/png");
    });
  } finally {
    document.body.removeChild(wrapper);
  }
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
  const [copyState, setCopyState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [tooltip, setTooltip]     = useState<{ text: string; x: number; y: number } | null>(null);
  const containerRef              = useRef<HTMLDivElement>(null);

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

  async function handleCopyImage() {
    if (!containerRef.current) return;
    setCopyState("loading");
    try {
      await exportCalendarImage(containerRef.current, year, streakDays, relapses, bestStreak);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  const copyLabel =
    copyState === "loading" ? "A gerar…" :
    copyState === "done"    ? "Copiado ✓" :
    copyState === "error"   ? "Erro, tenta novamente" :
    "Copiar imagem";

  const copyBorderColor =
    copyState === "done"  ? "var(--green)" :
    copyState === "error" ? "var(--red-muted)" :
    "var(--gray-200)";

  const copyTextColor =
    copyState === "done"  ? "var(--green)" :
    copyState === "error" ? "var(--red-muted)" :
    "var(--gray-600)";

  return (
    <div ref={containerRef} style={containerStyle}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={sectionLabel}>Calendário</p>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <StatPill label="dias de streak" value={streakDays} color="var(--green)" />
            <StatPill label="recaídas"       value={relapses}   color="var(--red-muted)" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleCopyImage}
            disabled={copyState === "loading"}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px",
              border: `1px solid ${copyBorderColor}`,
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.08em",
              color: copyTextColor, background: "transparent",
              cursor: copyState === "loading" ? "wait" : "pointer",
              opacity: copyState === "loading" ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "11px", lineHeight: 1 }}>
              {copyState === "done" ? "✓" : copyState === "loading" ? "…" : "⎘"}
            </span>
            {copyLabel}
          </button>
          <YearSelector year={year} availableYears={availableYears} onChange={setYear} />
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
        <LegendItem color="var(--green)"     label="Dia de streak" />
        <LegendItem color="var(--red-muted)" label="Recaída" />
        <LegendItem color="var(--gray-200)"  label="Sem registo" />
        <span style={{ fontSize: "9px", color: "var(--gray-400)", fontFamily: "var(--mono)", opacity: 0.7 }}>
          · hoje com contorno
        </span>
      </div>

      {/* ── Month grid 4×3 ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, auto)",
        gap: "28px 32px",
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
