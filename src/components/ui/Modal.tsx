import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  glow?: "cyan" | "emerald" | "purple" | "orange" | "red" | "none";
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  glow = "none",
  children,
}) => {
  if (!isOpen) return null;

  const glowClass = glow !== "none" ? `glow-${glow}` : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content glassmorphism ${glowClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body-wrapper" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {children}
        </div>
      </div>
    </div>
  );
};
