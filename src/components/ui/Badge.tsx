import React from "react";

export type BadgeStatus =
  | "Allowed"
  | "Blocked"
  | "Prompt"
  | "Success"
  | "Failed"
  | "Running"
  | "Queued"
  | "PreApproved"
  | "Approved"
  | "Denied"
  | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  glow?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status = "neutral",
  glow = false,
  className = "",
  ...props
}) => {
  const normStatus = status.toLowerCase();
  
  let statusClass = "badge-neutral";
  if (["allowed", "success", "preapproved", "approved"].includes(normStatus)) {
    statusClass = "badge-success";
  } else if (["blocked", "failed", "denied"].includes(normStatus)) {
    statusClass = "badge-failed";
  } else if (["running"].includes(normStatus)) {
    statusClass = "badge-running";
  } else if (["prompt", "waitingapproval"].includes(normStatus)) {
    statusClass = "badge-idle"; 
  } else if (normStatus === "queued") {
    statusClass = "badge-queued";
  }

  const glowClass = glow ? "badge-glow" : "";

  return (
    <span
      className={`canvas-status-badge ${statusClass} ${glowClass} ${className}`}
      {...props}
    >
      {children || status}
    </span>
  );
};
