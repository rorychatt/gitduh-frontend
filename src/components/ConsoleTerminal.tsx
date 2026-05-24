import React, { useEffect, useRef } from "react";
import { Button } from "./ui/Button";

interface ConsoleTerminalProps {
  logs: string;
  runStatus: string;
  activeStepName: string;
  onApprove: (approved: boolean) => void;
  isSuspended: boolean;
  suspendedCommand: string;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({
  logs,
  runStatus,
  activeStepName,
  onApprove,
  isSuspended,
  suspendedCommand,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll to bottom when logs change
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isSuspended]);

  // Colorize log lines
  const parseLogs = (logText: string) => {
    if (!logText)
      return (
        <span style={{ color: "var(--text-muted)" }}>
          Console idle. Trigger a workflow to start logging...
        </span>
      );

    return logText.split("\n").map((line, index) => {
      if (line.startsWith("[CLAUDE THINKING]")) {
        return (
          <div key={index} style={{ color: "var(--accent-orange)", marginBottom: "2px" }}>
            <span style={{ fontWeight: 600 }}>[AI AGENT THOUGHT]</span>{" "}
            {line.replace("[CLAUDE THINKING] ", "")}
          </div>
        );
      } else if (line.startsWith("ERROR:") || line.startsWith("✕")) {
        return (
          <div
            key={index}
            style={{ color: "var(--accent-red)", marginBottom: "2px", fontWeight: 500 }}
          >
            {line}
          </div>
        );
      } else if (line.startsWith("✓") || line.startsWith("SUCCESS:")) {
        return (
          <div
            key={index}
            style={{ color: "var(--accent-emerald)", marginBottom: "2px", fontWeight: 500 }}
          >
            {line}
          </div>
        );
      } else if (line.startsWith("SUSPENDED:")) {
        return (
          <div
            key={index}
            style={{ color: "var(--accent-orange)", marginBottom: "2px", fontWeight: 600 }}
          >
            {line}
          </div>
        );
      } else if (line.trim().startsWith("=== CLAUDE AGENT")) {
        return (
          <div
            key={index}
            style={{
              color: "var(--accent-purple)",
              fontWeight: 600,
              borderBottom: "1px dashed rgba(187, 134, 252, 0.3)",
              paddingBottom: "4px",
              margin: "8px 0",
            }}
          >
            {line}
          </div>
        );
      }
      return (
        <div key={index} style={{ color: "#fff", marginBottom: "1px" }}>
          {line}
        </div>
      );
    });
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: "var(--accent-red)",
              borderRadius: "50%",
            }}
          ></span>
          <span
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: "var(--accent-orange)",
              borderRadius: "50%",
            }}
          ></span>
          <span
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: "var(--accent-emerald)",
              borderRadius: "50%",
            }}
          ></span>
          <span className="terminal-title" style={{ marginLeft: "6px" }}>
            Terminal Console {activeStepName ? `• ${activeStepName}` : ""}
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          Status:{" "}
          <span
            style={{
              fontWeight: 600,
              color: runStatus === "Running" ? "var(--accent-cyan)" : "var(--text-secondary)",
            }}
          >
            {runStatus}
          </span>
        </div>
      </div>

      <div className="terminal-logs">
        {parseLogs(logs)}

        {isSuspended && (
          <div className="consent-panel">
            <div className="consent-header">
              <span>⚠️</span> Local Permission Approval Required
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px" }}>
              The GitDuh local runner has suspended execution. An agent/workflow is requesting
              authorization to execute a shell command:
            </p>
            <div className="consent-body">$ {suspendedCommand}</div>
            <div className="consent-actions">
              <Button
                variant="primary"
                onClick={() => onApprove(true)}
                style={{ padding: "6px 12px", fontSize: "12px" }}
              >
                Approve Execution
              </Button>
              <Button
                variant="danger"
                onClick={() => onApprove(false)}
                style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "transparent" }}
              >
                Deny & Abort
              </Button>
            </div>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
