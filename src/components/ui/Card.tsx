import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "cyan" | "emerald" | "purple" | "orange" | "red" | "none";
  glassmorphism?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glow = "none",
  glassmorphism = true,
  className = "",
  ...props
}) => {
  const glassClass = glassmorphism ? "glass" : "";
  const glowClass = glow !== "none" ? `glow-${glow}` : "";
  return (
    <div
      className={`card ${glassClass} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`card-header ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`card-body ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  );
};
