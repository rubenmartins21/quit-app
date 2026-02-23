import React from "react";
import { AppScreen } from "../App";

interface Props {
  active: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside style={{
      width: "200px", flexShrink: 0, background: "var(--green)",
      padding: "52px 20px 28px", display: "flex", flexDirection: "column"
    }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--white)", marginBottom: "40px" }}>
        Quit
      </div>
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
        <NavItem label="Estado"    isActive={active === "dashboard"} onClick={() => onNavigate("dashboard")} />
        <NavItem label="Desafio"   isActive={active === "challenge"} onClick={() => onNavigate("challenge")} />
        <NavItem label="Histórico" isActive={active === "history"}   onClick={() => onNavigate("history")} />
      </nav>
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>v1.0.0</div>
    </aside>
  );
}

function NavItem({ label, isActive, onClick }: {
  label: string; isActive: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "9px 12px", borderRadius: "var(--radius-sm)",
        fontSize: "12px", letterSpacing: "0.04em",
        color: isActive ? "var(--white)" : "rgba(255,255,255,0.55)",
        background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
    </div>
  );
}
