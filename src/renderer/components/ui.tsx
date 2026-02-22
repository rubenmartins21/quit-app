import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
}

export function Button({ variant = "primary", loading = false, children, disabled, style, ...rest }: ButtonProps) {
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--green)", color: "var(--white)", border: "none" },
    ghost: { background: "transparent", color: "var(--gray-600)", border: "1px solid var(--gray-200)" },
    danger: { background: "transparent", color: "var(--red-muted)", border: "1px solid var(--red-muted)" }
  };
  return (
    <button {...rest} disabled={disabled || loading} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
      padding: "11px 24px", borderRadius: "var(--radius-sm)", fontFamily: "var(--mono)",
      fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase",
      transition: "opacity var(--transition)", cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled || loading ? 0.5 : 1, width: "100%",
      ...variants[variant], ...style
    }}>
      {loading ? <span style={{ display:"inline-block", width:"12px", height:"12px", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} /> : children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }

export function Input({ label, id, style, ...rest }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {label && <label htmlFor={id} style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gray-400)" }}>{label}</label>}
      <input id={id} {...rest} style={{ padding: "12px 14px", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--gray-800)", background: "var(--white)", outline: "none", width: "100%", ...style }}
        onFocus={e => { e.currentTarget.style.borderColor = "var(--green)"; rest.onFocus?.(e); }}
        onBlur={e => { e.currentTarget.style.borderColor = "var(--gray-200)"; rest.onBlur?.(e); }} />
    </div>
  );
}

export function ErrorMsg({ message }: { message: string }) {
  if (!message) return null;
  return <p style={{ fontSize: "11px", color: "var(--red-muted)", letterSpacing: "0.02em", lineHeight: "1.5" }}>{message}</p>;
}
