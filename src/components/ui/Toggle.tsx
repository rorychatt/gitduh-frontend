import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <div className="logging-toggle-card glassmorphism" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px",
      borderRadius: "8px",
      border: "1px solid var(--border-color)",
      background: "rgba(255, 255, 255, 0.02)",
      opacity: disabled ? 0.6 : 1,
      pointerEvents: disabled ? "none" : "auto",
    }}>
      <div>
        {label && <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-primary)" }}>{label}</div>}
        {description && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{description}</span>}
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="slider"></span>
      </label>
    </div>
  );
};
