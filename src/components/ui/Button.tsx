import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  iconLeft,
  iconRight,
  className = "",
  disabled,
  type = "button",
  onClick,
  style,
  title,
  id,
  tabIndex,
}) => {
  const baseClass = "btn";
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const loadingClass = loading ? "btn-loading" : "";

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${loadingClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      title={title}
      id={id}
      tabIndex={tabIndex}
    >
      {loading && <span className="spinner-small"></span>}
      {!loading && iconLeft && <span className="btn-icon-left">{iconLeft}</span>}
      <span className="btn-content">{children}</span>
      {!loading && iconRight && <span className="btn-icon-right">{iconRight}</span>}
    </button>
  );
};
