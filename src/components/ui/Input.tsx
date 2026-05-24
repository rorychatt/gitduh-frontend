import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  className = "",
  type = "text",
  ...props
}) => {
  return (
    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && <label htmlFor={id} style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{label}</label>}
      <input
        id={id}
        type={type}
        className={`modal-input ${className}`}
        style={{ borderColor: error ? "var(--accent-red)" : undefined }}
        {...props}
      />
      {error && <span style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "2px" }}>{error}</span>}
    </div>
  );
};
