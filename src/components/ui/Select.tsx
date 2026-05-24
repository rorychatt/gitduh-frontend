import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  id,
  className = "",
  children,
  value,
  onChange,
  required,
  disabled,
  name,
  style,
  onFocus,
  onBlur,
}) => {
  return (
    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && <label htmlFor={id} style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{label}</label>}
      <select
        id={id}
        className={`modal-input ${className}`}
        style={{ ...style, borderColor: error ? "var(--accent-red)" : undefined, cursor: "pointer" }}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        name={name}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {children}
      </select>
      {error && <span style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "2px" }}>{error}</span>}
    </div>
  );
};
