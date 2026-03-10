/**
 * CalendarView.tsx — Quit design system
 * Localização: src/renderer/components/CalendarView.tsx
 *
 * - Vista por ano completo (12 meses, 3 colunas)
 * - Cores: verde #1F3D2B (streak), vermelho #C44536 (recaída), cinza (vazio)
 * - Tipografia Inter
 * - Todos os textos via useI18n() → t.calendar.*
 * - Share/download mantido com textos traduzidos
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { ChallengeData } from "../lib/ipc";
import { useI18n } from "../lib/i18n";

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
        map.set(key, { state: "streak", challengeId: c.id });
      cursor = addDays(cursor, 1);
    }
    if (c.cancelledAt) map.set(toDateKey(startOfDay(c.cancelledAt)), { state: "relapse", challengeId: c.id });
  }
  return map;
}

// ── Month grid ────────────────────────────────────────────────────────────────

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

const CELL = 24;
const GAP  = 2;

// Month short names — localised via locale, but we keep a static fallback
const MONTH_SHORT_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"] as const;

// DOW: Mon→Sun (ISO week)
const DOW_LABELS = ["S","T","Q","Q","S","S","D"];

// ── Responsive columns ────────────────────────────────────────────────────────

function useColumns(containerRef: React.RefObject<HTMLDivElement | null>): number {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const MONTH_W = 7 * (CELL + GAP) + 16; // ~200px
    const update = (w: number) => {
      const avail = w - 32;
      if      (avail >= MONTH_W * 4 + 32 * 3) setCols(4);
      else if (avail >= MONTH_W * 3 + 32 * 2) setCols(3);
      else if (avail >= MONTH_W * 2 + 32)     setCols(2);
      else setCols(1);
    };
    update(el.offsetWidth);
    const ro = new ResizeObserver(entries => { for (const e of entries) update(e.contentRect.width); });
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
      background: "#1C1C1C",
      color: "#F7F9F8",
      fontSize: "11px",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "5px 10px",
      borderRadius: "4px",
      pointerEvents: "none",
      zIndex: 999,
      whiteSpace: "nowrap",
      boxShadow: "0 2px 8px rgba(0,0,0,.2)",
    }}>{text}</div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({ date, dayInfo, onHover, onLeave }: {
  date: Date | null;
  dayInfo: DayInfo | undefined;
  onHover: (e: React.MouseEvent, info: DayInfo, date: Date) => void;
  onLeave: () => void;
}) {
  if (!date) return <div style={{ width: CELL, height: CELL, flexShrink: 0 }} />;

  const state   = dayInfo?.state ?? "empty";
  const isToday = toDateKey(date) === toDateKey(new Date());

  const bg =
    state === "streak"  ? "#1F3D2B" :
    state === "relapse" ? "#FDECEA" :
    "#EEF2EF";

  const border =
    state === "relapse" ? "1px solid #f5c5c0" :
    state === "empty"   ? "1px solid #E4EBE7" :
    "none";

  const textColor =
    state === "streak"  ? "rgba(255,255,255,.85)" :
    state === "relapse" ? "#C44536" :
    "#B0BCB5";

  return (
    <div
      onMouseEnter={dayInfo ? (e) => onHover(e, dayInfo, date) : undefined}
      onMouseLeave={dayInfo ? onLeave : undefined}
      style={{
        width: CELL, height: CELL, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: bg,
        border: isToday ? "2px solid #1F3D2B" : border,
        borderRadius: "4px",
        outline: isToday && state !== "streak" ? "2px solid #1F3D2B" : "none",
        outlineOffset: "1px",
        transition: "opacity .12s",
        cursor: dayInfo ? "default" : "default",
      }}
    >
      <span style={{
        fontSize: "8px",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: state === "streak" ? 600 : 400,
        color: textColor,
        lineHeight: 1,
        userSelect: "none",
      }}>
        {date.getDate()}
      </span>
    </div>
  );
}

// ── Month block ───────────────────────────────────────────────────────────────

function MonthBlock({ monthData, dayMap, monthLabel, onHover, onLeave }: {
  monthData: MonthData;
  dayMap: Map<string, DayInfo>;
  monthLabel: string;
  onHover: (e: React.MouseEvent, info: DayInfo, date: Date) => void;
  onLeave: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
      <p style={{
        fontSize: "9px", fontWeight: 600,
        letterSpacing: ".12em", textTransform: "uppercase",
        color: "#6B8F7A",
        marginBottom: 5,
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        {monthLabel}
      </p>
      {/* DOW row */}
      <div style={{ display: "flex", gap: GAP, marginBottom: 2 }}>
        {DOW_LABELS.map((l, i) => (
          <div key={i} style={{
            width: CELL, height: 10,
            fontSize: "7px", fontWeight: 500,
            color: "#B0BCB5",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            flexShrink: 0,
          }}>
            {l}
          </div>
        ))}
      </div>
      {/* Weeks */}
      {monthData.weeks.map((week, wi) => (
        <div key={wi} style={{ display: "flex", gap: GAP }}>
          {week.map((day, di) => {
            const key = day ? toDateKey(day) : null;
            return (
              <DayCell
                key={di}
                date={day}
                dayInfo={key ? dayMap.get(key) : undefined}
                onHover={onHover}
                onLeave={onLeave}
              />
            );
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
  const btnStyle: React.CSSProperties = {
    width: 26, height: 26,
    background: "transparent",
    border: "1px solid #C8D8CE",
    borderRadius: "4px",
    color: "#6B6B6B",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "12px",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1,
    transition: "border-color .15s",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={() => onChange(year - 1)}
        disabled={!availableYears.includes(year - 1)}
        style={{ ...btnStyle, opacity: availableYears.includes(year - 1) ? 1 : .35 }}
      >
        ‹
      </button>
      <span style={{
        fontSize: "13px", fontWeight: 600,
        color: "#1C1C1C",
        fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: "-.2px",
        minWidth: 36, textAlign: "center",
      }}>
        {year}
      </span>
      <button
        onClick={() => onChange(year + 1)}
        disabled={!availableYears.includes(year + 1)}
        style={{ ...btnStyle, opacity: availableYears.includes(year + 1) ? 1 : .35 }}
      >
        ›
      </button>
    </div>
  );
}

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
  year: number, streakDays: number, relapses: number,
  bestStreak: number,
  streakLabel: string, relapsesLabel: string, disciplineLabel: string,
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed", top: "-9999px", left: "-9999px",
    background: "#F7F9F8",
    padding: "36px 40px 32px",
    fontFamily: "Inter, system-ui, sans-serif",
    width: (calendarEl.offsetWidth + 80) + "px",
    boxSizing: "border-box",
  });
  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;">
      <div>
        <div style="font-size:22px;font-weight:700;color:#1F3D2B;line-height:1;margin-bottom:6px;letter-spacing:-.5px;">Quit</div>
        <div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#6B8F7A;">${year} · ${disciplineLabel}</div>
      </div>
      ${bestStreak > 0 ? `
      <div style="text-align:right;">
        <div style="font-size:34px;font-weight:700;color:#1F3D2B;line-height:1;">${bestStreak}</div>
        <div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6B;margin-top:4px;">best streak</div>
      </div>` : ""}
    </div>
    <div style="display:flex;gap:20px;margin-bottom:20px;align-items:center;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:10px;height:10px;background:#1F3D2B;border-radius:2px;flex-shrink:0;"></div>
        <span style="font-size:11px;color:#6B6B6B;"><span style="color:#1C1C1C;font-weight:600;">${streakDays}</span> ${streakLabel}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:10px;height:10px;background:#FDECEA;border:1px solid #f5c5c0;border-radius:2px;flex-shrink:0;"></div>
        <span style="font-size:11px;color:#6B6B6B;"><span style="color:#C44536;font-weight:600;">${relapses}</span> ${relapsesLabel}</span>
      </div>
    </div>
  `;
  const clone = calendarEl.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { padding: "0", border: "none", background: "transparent", boxShadow: "none" });
  const firstChild = clone.firstElementChild as HTMLElement | null;
  if (firstChild) firstChild.style.display = "none";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  try {
    return await html2canvas(wrapper, { backgroundColor: "#F7F9F8", scale: 2, useCORS: true, logging: false });
  } finally {
    document.body.removeChild(wrapper);
  }
}

async function copyImageToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error("blob null")); return; }
      try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); resolve(); }
      catch (e) { reject(e); }
    }, "image/png");
  });
}

async function downloadImage(canvas: HTMLCanvasElement, year: number): Promise<void> {
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `quit-${year}.png`; a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

// ── Share dropdown ────────────────────────────────────────────────────────────

type ShareAction = "copy" | "download";
type ShareState  = "idle" | "loading" | "done" | "error";

function ShareDropdown({ onAction, disabled, shareLabel, copyLabel, downloadLabel }: {
  onAction: (action: ShareAction) => void;
  disabled: boolean;
  shareLabel: string;
  copyLabel: string;
  downloadLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "5px 11px",
    border: "1px solid #C8D8CE",
    borderRadius: "4px",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "10px", fontWeight: 600,
    letterSpacing: ".07em", textTransform: "uppercase",
    color: "#6B6B6B",
    background: "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .5 : 1,
    transition: "border-color .15s",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => !disabled && setOpen(o => !o)} disabled={disabled} style={btnStyle}>
        <span style={{ fontSize: "11px", lineHeight: 1 }}>⎘</span>
        {shareLabel}
        <span style={{ fontSize: "7px", opacity: .6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "#fff",
          border: "1px solid #E4EBE7",
          borderRadius: "5px",
          boxShadow: "0 4px 16px rgba(0,0,0,.08)",
          minWidth: "160px",
          zIndex: 50,
          overflow: "hidden",
        }}>
          {([
            { action: "copy"     as ShareAction, icon: "⎘", label: copyLabel     },
            { action: "download" as ShareAction, icon: "↓", label: downloadLabel },
          ]).map(({ action, icon, label }) => (
            <div
              key={action}
              onClick={() => { setOpen(false); onAction(action); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "Inter, system-ui, sans-serif",
                color: "#1C1C1C",
                transition: "background .1s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F7F9F8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ fontSize: "13px", lineHeight: 1, color: "#6B8F7A" }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Legend item ───────────────────────────────────────────────────────────────

function LegendItem({ bg, border, label }: { bg: string; border?: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 10, height: 10, flexShrink: 0,
        background: bg,
        border: border || "none",
        borderRadius: "2px",
      }} />
      <span style={{
        fontSize: "10px",
        color: "#6B6B6B",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        {label}
      </span>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label, isStreak }: { value: number; label: string; isStreak: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 10, height: 10, flexShrink: 0, borderRadius: "2px",
        background: isStreak ? "#1F3D2B" : "#FDECEA",
        border: isStreak ? "none" : "1px solid #f5c5c0",
      }} />
      <span style={{ fontSize: "12px", color: "#6B6B6B", fontFamily: "Inter, system-ui, sans-serif" }}>
        <span style={{ color: isStreak ? "#1F3D2B" : "#C44536", fontWeight: 600 }}>{value}</span>
        {" "}{label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CalendarView({ challenges, bestStreak = 0 }: Props) {
  const { t, lang } = useI18n();
  const tc = t.calendar;
  const today = new Date();

  // Month labels localised
  const MONTH_SHORT = useMemo(() =>
    Array.from({ length: 12 }, (_, m) =>
      new Date(2024, m, 1).toLocaleString(lang === "pt" ? "pt-PT" : lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : lang === "it" ? "it-IT" : "en-GB", { month: "short" })
        .replace(".", "")
        .toUpperCase()
    )
  , [lang]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([today.getFullYear()]);
    for (const c of challenges) {
      years.add(new Date(c.startedAt).getFullYear());
      if (c.cancelledAt) years.add(new Date(c.cancelledAt).getFullYear());
      if (c.completedAt) years.add(new Date(c.completedAt).getFullYear());
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [challenges]);

  const [year,       setYear]       = useState(() => availableYears[availableYears.length - 1] ?? today.getFullYear());
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [shareMsg,   setShareMsg]   = useState("");
  const [tooltip,    setTooltip]    = useState<{ text: string; x: number; y: number } | null>(null);

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
    const locale = lang === "pt" ? "pt-PT" : lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : lang === "it" ? "it-IT" : "en-GB";
    const label = date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    const stateLabel = info.state === "streak" ? tc.streakDay : tc.relapse;
    setTooltip({ text: `${label} — ${stateLabel}`, x: e.clientX, y: e.clientY });
  }

  async function handleShare(action: ShareAction) {
    if (!containerRef.current) return;
    setShareState("loading");
    setShareMsg("");
    try {
      const canvas = await buildExportCanvas(
        containerRef.current, year, streakDays, relapses, bestStreak,
        tc.streakDays, tc.relapses, tc.disciplineDays,
      );
      if (action === "copy") {
        try { await copyImageToClipboard(canvas); setShareMsg(tc.copied); }
        catch { await downloadImage(canvas, year); setShareMsg(tc.downloaded); }
      } else {
        await downloadImage(canvas, year);
        setShareMsg(tc.downloaded);
      }
      setShareState("done");
      setTimeout(() => { setShareState("idle"); setShareMsg(""); }, 2500);
    } catch {
      setShareState("error");
      setShareMsg(tc.shareError);
      setTimeout(() => { setShareState("idle"); setShareMsg(""); }, 3000);
    }
  }

  const colGap = cols >= 3 ? "24px 28px" : cols === 2 ? "20px 24px" : "20px";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, gap: 12, flexWrap: "wrap",
      }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <StatPill value={streakDays} label={tc.streakDays} isStreak />
          <StatPill value={relapses}  label={tc.relapses}   isStreak={false} />
        </div>
        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {shareMsg && (
            <span style={{
              fontSize: "11px",
              fontFamily: "Inter, system-ui, sans-serif",
              color: shareState === "error" ? "#C44536" : "#1F3D2B",
              letterSpacing: ".04em",
            }}>
              {shareMsg}
            </span>
          )}
          <ShareDropdown
            onAction={handleShare}
            disabled={shareState === "loading"}
            shareLabel={tc.share}
            copyLabel={tc.copyImage}
            downloadLabel={tc.downloadPng}
          />
          <YearSelector year={year} availableYears={availableYears} onChange={setYear} />
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <LegendItem bg="#1F3D2B" label={tc.streakDay} />
        <LegendItem bg="#FDECEA" border="1px solid #f5c5c0" label={tc.relapse} />
        <LegendItem bg="#EEF2EF" border="1px solid #E4EBE7" label={tc.noRecord} />
        <span style={{
          fontSize: "10px",
          color: "#B0BCB5",
          fontFamily: "Inter, system-ui, sans-serif",
          marginLeft: 2,
        }}>
          {tc.todayOutline}
        </span>
      </div>

      {/* ── Month grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, auto)`,
        gap: colGap,
        justifyContent: "start",
      }}>
        {months.map((m) => (
          <MonthBlock
            key={m.month}
            monthData={m}
            dayMap={dayMap}
            monthLabel={MONTH_SHORT[m.month]}
            onHover={handleHover}
            onLeave={() => setTooltip(null)}
          />
        ))}
      </div>

      {yearChallenges.length === 0 && (
        <p style={{
          fontSize: "13px",
          color: "#6B6B6B",
          fontFamily: "Inter, system-ui, sans-serif",
          fontStyle: "italic",
          marginTop: 16,
        }}>
          {tc.noChallenges(year)}
        </p>
      )}

      {tooltip && <Tooltip text={tooltip.text} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}
