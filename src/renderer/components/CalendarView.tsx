import React, { useMemo, useState } from "react";
import { ChallengeData } from "../lib/ipc";

interface Props {
  challenges: ChallengeData[];
}

type DayState = "streak" | "relapse" | "empty";

interface DayInfo {
  state: DayState;
  challengeId?: string;
  tooltip?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
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

/**
 * Builds a map of YYYY-MM-DD → DayInfo from all challenges.
 * - Each day within a challenge's active streak = "streak"
 * - The day of cancelledAt = "relapse"
 */
function buildDayMap(challenges: ChallengeData[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();

  for (const c of challenges) {
    const start = startOfDay(c.startedAt);
    const endBoundary = c.cancelledAt
      ? startOfDay(c.cancelledAt)
      : c.completedAt
        ? startOfDay(c.completedAt)
        : startOfDay(c.endsAt);

    // Fill streak days (start → day before end / cancellation)
    let cursor = new Date(start);
    while (cursor < endBoundary) {
      const key = toDateKey(cursor);
      // Don't overwrite a relapse marker with a streak from another challenge
      if (!map.has(key) || map.get(key)!.state !== "relapse") {
        map.set(key, {
          state: "streak",
          challengeId: c.id,
          tooltip: `Streak — ${c.durationDays} dias`,
        });
      }
      cursor = addDays(cursor, 1);
    }

    // Mark relapse day
    if (c.cancelledAt) {
      const key = toDateKey(startOfDay(c.cancelledAt));
      map.set(key, {
        state: "relapse",
        challengeId: c.id,
        tooltip: `Recaída`,
      });
    }
  }

  return map;
}

// ── Calendar grid logic ───────────────────────────────────────────────────────

interface MonthData {
  year: number;
  month: number; // 0-indexed
  weeks: (Date | null)[][];
}

function buildMonth(year: number, month: number): MonthData {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start week on Monday (ISO)
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

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

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const DOW_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, x, y }: { text: string; x: number; y: number }) {
  return (
    <div style={{
      position: "fixed",
      left: x + 12,
      top: y - 8,
      background: "var(--gray-800)",
      color: "var(--white)",
      fontSize: "10px",
      letterSpacing: "0.06em",
      padding: "5px 10px",
      borderRadius: "3px",
      pointerEvents: "none",
      zIndex: 999,
      whiteSpace: "nowrap",
    }}>
      {text}
    </div>
  );
}

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({
  date,
  dayInfo,
  onHover,
  onLeave,
}: {
  date: Date | null;
  dayInfo: DayInfo | undefined;
  onHover: (e: React.MouseEvent, info: DayInfo, date: Date) => void;
  onLeave: () => void;
}) {
  if (!date) {
    return <div style={{ width: 14, height: 14 }} />;
  }

  const state = dayInfo?.state ?? "empty";
  const isToday = toDateKey(date) === toDateKey(new Date());

  const bg =
    state === "streak"  ? "var(--green)" :
    state === "relapse" ? "var(--red-muted)" :
    "var(--gray-200)";

  const opacity =
    state === "streak"  ? 0.85 :
    state === "relapse" ? 0.9 :
    0.35;

  return (
    <div
      onMouseEnter={dayInfo ? (e) => onHover(e, dayInfo, date) : undefined}
      onMouseLeave={dayInfo ? onLeave : undefined}
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        background: bg,
        opacity,
        cursor: dayInfo ? "default" : "default",
        outline: isToday ? "1.5px solid var(--gray-800)" : "none",
        outlineOffset: "1px",
        transition: "opacity 0.1s",
        flexShrink: 0,
      }}
    />
  );
}

// ── Month block ───────────────────────────────────────────────────────────────

function MonthBlock({
  monthData,
  dayMap,
  onHover,
  onLeave,
}: {
  monthData: MonthData;
  dayMap: Map<string, DayInfo>;
  onHover: (e: React.MouseEvent, info: DayInfo, date: Date) => void;
  onLeave: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p style={{
        fontSize: "9px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--gray-400)",
        marginBottom: 2,
        fontFamily: "var(--mono)",
      }}>
        {MONTH_NAMES[monthData.month]}
      </p>

      {/* Day-of-week header */}
      <div style={{ display: "flex", gap: 2 }}>
        {DOW_LABELS.map((l, i) => (
          <div key={i} style={{
            width: 14, height: 10,
            fontSize: "8px",
            color: "var(--gray-400)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--mono)",
            flexShrink: 0,
          }}>
            {l}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {monthData.weeks.map((week, wi) => (
        <div key={wi} style={{ display: "flex", gap: 2 }}>
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

function YearSelector({
  year,
  availableYears,
  onChange,
}: {
  year: number;
  availableYears: number[];
  onChange: (y: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => onChange(year - 1)}
        disabled={!availableYears.includes(year - 1)}
        style={navBtn}
      >
        ←
      </button>
      <span style={{
        fontSize: "11px",
        color: "var(--gray-800)",
        fontFamily: "var(--mono)",
        letterSpacing: "0.1em",
        minWidth: 36,
        textAlign: "center",
      }}>
        {year}
      </span>
      <button
        onClick={() => onChange(year + 1)}
        disabled={!availableYears.includes(year + 1)}
        style={navBtn}
      >
        →
      </button>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--gray-200)",
  borderRadius: 3,
  color: "var(--gray-600)",
  fontFamily: "var(--mono)",
  fontSize: "11px",
  padding: "3px 8px",
  cursor: "pointer",
  lineHeight: 1.4,
  transition: "opacity 0.15s",
};

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ challenges, year }: { challenges: ChallengeData[]; year: number }) {
  const stats = useMemo(() => {
    let streakDays = 0;
    let relapses = 0;
    const startOfYear = new Date(year, 0, 1);
    const endOfYear   = new Date(year + 1, 0, 1);

    for (const c of challenges) {
      const start = startOfDay(c.startedAt);
      const endBoundary = c.cancelledAt
        ? startOfDay(c.cancelledAt)
        : c.completedAt
          ? startOfDay(c.completedAt)
          : startOfDay(c.endsAt);

      // Count streak days in this year
      let cursor = new Date(Math.max(start.getTime(), startOfYear.getTime()));
      const end  = new Date(Math.min(endBoundary.getTime(), endOfYear.getTime()));
      while (cursor < end) {
        streakDays++;
        cursor = addDays(cursor, 1);
      }

      // Count relapses in this year
      if (c.cancelledAt) {
        const rd = startOfDay(c.cancelledAt);
        if (rd >= startOfYear && rd < endOfYear) relapses++;
      }
    }

    return { streakDays, relapses };
  }, [challenges, year]);

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
      <StatPill label="dias de streak" value={stats.streakDays} color="var(--green)" />
      <StatPill label="recaídas" value={stats.relapses} color="var(--red-muted)" />
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: 2,
        background: color, opacity: 0.85, flexShrink: 0,
      }} />
      <span style={{ fontSize: "10px", color: "var(--gray-400)", fontFamily: "var(--mono)" }}>
        <span style={{ color: "var(--gray-800)", fontWeight: 500 }}>{value}</span>
        {" "}{label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CalendarView({ challenges }: Props) {
  const today = new Date();

  // Derive available years from challenge data (+ current year always)
  const availableYears = useMemo(() => {
    const years = new Set<number>([today.getFullYear()]);
    for (const c of challenges) {
      years.add(new Date(c.startedAt).getFullYear());
      if (c.cancelledAt)  years.add(new Date(c.cancelledAt).getFullYear());
      if (c.completedAt)  years.add(new Date(c.completedAt).getFullYear());
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [challenges]);

  const [year, setYear] = useState(() =>
    availableYears[availableYears.length - 1] ?? today.getFullYear()
  );

  const dayMap = useMemo(() => buildDayMap(challenges), [challenges]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, m) => buildMonth(year, m)),
    [year],
  );

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    text: string; x: number; y: number;
  } | null>(null);

  function handleHover(e: React.MouseEvent, info: DayInfo, date: Date) {
    const label = date.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
    setTooltip({
      text: `${label} — ${info.tooltip}`,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function handleLeave() {
    setTooltip(null);
  }

  // Filter challenges that overlap with the current year
  const yearChallenges = useMemo(() => {
    const start = new Date(year, 0, 1);
    const end   = new Date(year + 1, 0, 1);
    return challenges.filter(c => {
      const cs = new Date(c.startedAt);
      const ce = c.cancelledAt
        ? new Date(c.cancelledAt)
        : c.completedAt
          ? new Date(c.completedAt)
          : new Date(c.endsAt);
      return cs < end && ce >= start;
    });
  }, [challenges, year]);

  return (
    <div style={container}>
      {/* Header row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20,
      }}>
        <div>
          <p style={sectionLabel}>Calendário</p>
          <StatsBar challenges={yearChallenges} year={year} />
        </div>
        <YearSelector
          year={year}
          availableYears={availableYears}
          onChange={setYear}
        />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
        <LegendItem color="var(--green)" label="Dia de streak" />
        <LegendItem color="var(--red-muted)" label="Recaída" />
        <LegendItem color="var(--gray-200)" label="Sem registo" />
      </div>

      {/* Month grid — 4 rows × 3 cols */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, auto)",
        gap: "24px 28px",
        justifyContent: "start",
      }}>
        {months.map((m) => (
          <MonthBlock
            key={m.month}
            monthData={m}
            dayMap={dayMap}
            onHover={handleHover}
            onLeave={handleLeave}
          />
        ))}
      </div>

      {yearChallenges.length === 0 && (
        <p style={{
          fontSize: "11px", color: "var(--gray-400)",
          marginTop: 16, fontFamily: "var(--mono)",
        }}>
          Nenhum desafio em {year}.
        </p>
      )}

      {tooltip && (
        <Tooltip text={tooltip.text} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{
        width: 10, height: 10, borderRadius: 2,
        background: color, opacity: color === "var(--gray-200)" ? 0.8 : 0.85,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: "9px", color: "var(--gray-400)", fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

const container: React.CSSProperties = {
  padding: "20px 24px",
  border: "1px solid var(--gray-200)",
  borderRadius: "var(--radius-md)",
  background: "var(--gray-50)",
  position: "relative",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--gray-400)",
  fontFamily: "var(--mono)",
  marginBottom: 6,
};
