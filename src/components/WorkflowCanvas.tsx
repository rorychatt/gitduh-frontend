import React, { useState } from "react";
import type { Job, RunStatus, StepRun } from "../types";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface WorkflowCanvasProps {
  workflowName: string;
  jobs: Record<string, Job>;
  activeStepId: string | null;
  stepRuns: StepRun[];
  runStatus: string;
  onRunWorkflow: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflowName,
  jobs,
  activeStepId,
  stepRuns,
  runStatus,
  onRunWorkflow,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Layout parameters
  const colWidth = 260;
  const startX = 60;
  const startY = 120;

  // Let's compute job columns (topological levels)
  const computeLevels = (): Record<string, number> => {
    const levels: Record<string, number> = {};

    // First, triggers are level 0
    // In our simplified view, let's place nodes based on needs list length
    Object.keys(jobs).forEach((jobId) => {
      const job = jobs[jobId];
      if (!job.needs || job.needs.length === 0) {
        levels[jobId] = 1; // Level 1 is first action col
      } else {
        // Simple heuristic: level is max level of dependencies + 1
        levels[jobId] = Math.max(...job.needs.map((n) => levels[n] || 0)) + 1;
      }
    });

    return levels;
  };

  const levels = computeLevels();
  const maxLevel = Math.max(...Object.values(levels), 1);

  // Position nodes nicely
  // Map job_id -> {x, y}
  const positions: Record<string, { x: number; y: number }> = {};
  const levelCounts: Record<number, number> = {};

  // Initialize level counts
  for (let i = 0; i <= maxLevel + 1; i++) {
    levelCounts[i] = 0;
  }

  // Position trigger node at level 0
  const triggerNodeId = "trigger";
  positions[triggerNodeId] = { x: startX, y: startY + 50 };
  levelCounts[0] = 1;

  // Position all job nodes
  const orderedJobIds = Object.keys(jobs).sort((a, b) => (levels[a] || 0) - (levels[b] || 0));

  orderedJobIds.forEach((jobId) => {
    const lvl = levels[jobId] || 1;
    const indexInLvl = levelCounts[lvl];
    levelCounts[lvl] += 1;

    positions[jobId] = {
      x: startX + lvl * colWidth,
      y: startY + indexInLvl * 110,
    };
  });

  const getStepRunStatus = (jobId: string): RunStatus => {
    const run = stepRuns.find((s) => s.id === jobId);
    return run ? run.status : "Queued";
  };

  // Helper to render node borders
  const getNodeBorderClass = (jobId: string) => {
    const status = getStepRunStatus(jobId);
    if (jobId === activeStepId) {
      if (status === "WaitingApproval") return "glow-orange waiting-approval";
      return "glow-cyan running";
    }
    switch (status) {
      case "Running":
        return "glow-cyan running";
      case "Success":
        return "glow-emerald success";
      case "Failed":
        return "glow-red failed";
      case "WaitingApproval":
        return "glow-orange waiting-approval";
      default:
        return "";
    }
  };

  // Handle sidebar drawer content
  const selectedJob = selectedNodeId ? jobs[selectedNodeId] : null;
  const selectedJobStatus = selectedNodeId ? getStepRunStatus(selectedNodeId) : null;
  const selectedJobLogs = selectedNodeId
    ? stepRuns.find((s) => s.id === selectedNodeId)?.logs
    : null;

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDrawerOpen(true);
  };

  // Generate SVG path between coordinates
  const getCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="canvas-container">
      <div className="canvas-title">
        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
          Workflow: {workflowName}
        </span>
        <Badge status={runStatus as any} />
      </div>

      <div className="canvas-toolbar">
        <Button
          variant="primary"
          onClick={onRunWorkflow}
          className="pulse-running"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
          disabled={runStatus === "Running"}
          iconLeft={<span>⚡</span>}
        >
          {runStatus === "Running" ? "Executing Local..." : "Run Pipeline Locally"}
        </Button>
      </div>

      {/* SVG Connection Layer */}
      <svg className="workflow-svg-layer">
        <defs>
          <linearGradient id="cyan-purple-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="cyan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.2" />
          </linearGradient>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(255, 255, 255, 0.15)" />
          </marker>
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent-cyan)" />
          </marker>
        </defs>

        {/* Connect trigger node to level 1 jobs */}
        {Object.keys(jobs).map((jobId) => {
          const job = jobs[jobId];
          const startPos = positions[triggerNodeId];
          const endPos = positions[jobId];

          if (startPos && endPos && (!job.needs || job.needs.length === 0)) {
            const pathStr = getCurvePath(
              startPos.x + 180, // width of trigger card is 180
              startPos.y + 35, // height center
              endPos.x,
              endPos.y + 35,
            );

            const active = getStepRunStatus(jobId) === "Running" || activeStepId === jobId;
            return (
              <path
                key={`trigger-${jobId}`}
                d={pathStr}
                fill="none"
                stroke={active ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.1)"}
                strokeWidth={active ? 2 : 1.5}
                strokeDasharray={active ? "4, 4" : "none"}
                style={{ animation: active ? "dash 30s linear infinite" : "none" }}
                markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
              />
            );
          }
          return null;
        })}

        {/* Connect job dependencies */}
        {Object.keys(jobs).map((jobId) => {
          const job = jobs[jobId];
          if (!job.needs) return null;

          return job.needs.map((needId) => {
            const startPos = positions[needId];
            const endPos = positions[jobId];

            if (startPos && endPos) {
              const pathStr = getCurvePath(
                startPos.x + 180,
                startPos.y + 35,
                endPos.x,
                endPos.y + 35,
              );

              const needStatus = getStepRunStatus(needId);
              const jobStatus = getStepRunStatus(jobId);
              const active =
                needStatus === "Success" && (jobStatus === "Running" || activeStepId === jobId);

              return (
                <path
                  key={`${needId}-${jobId}`}
                  d={pathStr}
                  fill="none"
                  stroke={
                    active
                      ? "var(--accent-cyan)"
                      : needStatus === "Success"
                        ? "rgba(0, 230, 118, 0.3)"
                        : "rgba(255, 255, 255, 0.1)"
                  }
                  strokeWidth={active ? 2 : 1.5}
                  markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
                />
              );
            }
            return null;
          });
        })}
      </svg>

      {/* Render Node Cards */}
      <div className="node-group">
        {/* Trigger Node */}
        <div
          className="canvas-node selected"
          style={{
            position: "absolute",
            left: `${positions[triggerNodeId].x}px`,
            top: `${positions[triggerNodeId].y}px`,
          }}
          onClick={() => handleNodeClick(triggerNodeId)}
        >
          <div className="node-header">
            <span className="node-type-label node-type-trigger">Trigger</span>
            <span className="node-status-dot node-dot-success"></span>
          </div>
          <div className="node-name">Local Git Commit</div>
          <div className="node-detail">on: [commit, manual]</div>
        </div>

        {/* Job Nodes */}
        {Object.keys(jobs).map((jobId) => {
          const job = jobs[jobId];
          const pos = positions[jobId];
          if (!pos) return null;

          const status = getStepRunStatus(jobId);
          const isAgent = job.agent !== null && job.agent !== undefined;

          return (
            <div
              key={jobId}
              className={`canvas-node ${getNodeBorderClass(jobId)}`}
              style={{
                position: "absolute",
                left: `${pos.x}px`,
                top: `${pos.y}px`,
              }}
              onClick={() => handleNodeClick(jobId)}
            >
              <div className="node-header">
                <span
                  className={`node-type-label ${isAgent ? "node-type-agent" : "node-type-command"}`}
                >
                  {isAgent ? "Claude AI" : "Shell Exec"}
                </span>
                <span
                  className={`node-status-dot node-dot-${status.toLowerCase() === "waitingapproval" ? "waiting" : status.toLowerCase()}`}
                ></span>
              </div>
              <div className="node-name">{job.name}</div>
              <div className="node-detail">{isAgent ? `${job.agent?.skill} skill` : job.run}</div>
            </div>
          );
        })}
      </div>

      {/* Config Drawer */}
      <div className={`node-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h2 style={{ fontSize: "15px", fontWeight: 600 }}>Configure Node</h2>
          <Button variant="ghost" onClick={() => setDrawerOpen(false)} className="drawer-close">
            ✕
          </Button>
        </div>

        {selectedNodeId === triggerNodeId ? (
          <div className="drawer-body">
            <div className="form-group">
              <label>Trigger Source</label>
              <input type="text" value="Local Repository Commit" disabled />
            </div>
            <div className="form-group">
              <label>Events</label>
              <input type="text" value="commit, manual push" disabled />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value="Runs automatically on every local commit inside the workspace before remote push."
                rows={3}
                disabled
              />
            </div>
          </div>
        ) : selectedJob ? (
          <div className="drawer-body">
            <div className="form-group">
              <label>Node ID</label>
              <input type="text" value={selectedNodeId || ""} disabled />
            </div>
            <div className="form-group">
              <label>Step Name</label>
              <input type="text" value={selectedJob.name} disabled />
            </div>

            {selectedJob.run && (
              <div className="form-group">
                <label>Terminal Command</label>
                <input
                  type="text"
                  value={selectedJob.run}
                  disabled
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
            )}

            {selectedJob.agent && (
              <>
                <div className="form-group">
                  <label>Claude Skill Type</label>
                  <input type="text" value={selectedJob.agent.skill} disabled />
                </div>
                <div className="form-group">
                  <label>Target Files (glob)</label>
                  <input
                    type="text"
                    value={selectedJob.agent.target}
                    disabled
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Needs Dependencies</label>
              <input type="text" value={selectedJob.needs?.join(", ") || "None"} disabled />
            </div>

            <div className="form-group">
              <label>Current Status</label>
              <Badge status={selectedJobStatus as any || "neutral"} />
            </div>

            {selectedJobLogs && (
              <div className="form-group">
                <label>Execution Output Logs</label>
                <textarea
                  value={selectedJobLogs}
                  rows={8}
                  readOnly
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    backgroundColor: "#050608",
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="drawer-body">
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
              Select a node to configure or view status.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
