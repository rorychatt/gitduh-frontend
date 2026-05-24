/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import "./App.css";
import { WorkflowCanvas } from "./components/WorkflowCanvas";
import { ConsoleTerminal } from "./components/ConsoleTerminal";
import { PermissionSettings } from "./components/PermissionSettings";
import { AgentChat } from "./components/AgentChat";
import { Login } from "./components/Login";
import { RegisterRepoModal } from "./components/RegisterRepoModal";
import { FileExplorer } from "./components/FileExplorer";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import type { Project, Repository, Workflow, StepRun, AuditLogEntry } from "./types";

const getSafe = <T,>(obj: Record<string, T> | undefined | null, key: string): T | undefined => {
  if (!obj || key === "__proto__" || key === "constructor" || key === "prototype") return undefined;
  const entry = Object.entries(obj).find(([k]) => k === key);
  return entry ? entry[1] : undefined;
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("gitduh_token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("gitduh_username"));
  const [activeTab, setActiveTab] = useState<"code" | "canvas" | "permissions">("code");
  const [currentView, setCurrentView] = useState<"dashboard" | "repository">("dashboard");
  const [explorerPath, setExplorerPath] = useState<string>("");
  const [isFileView, setIsFileView] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState<string>("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [rulesMetrics, setRulesMetrics] = useState({ allowed: 0, prompt: 0, blocked: 0 });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerRepoSearch, setDrawerRepoSearch] = useState<string>("");

  const handleLoginSuccess = (newToken: string, newUsername: string) => {
    localStorage.setItem("gitduh_token", newToken);
    localStorage.setItem("gitduh_username", newUsername);
    setToken(newToken);
    setUsername(newUsername);
    navigateTo("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("gitduh_token");
    localStorage.removeItem("gitduh_username");
    setToken(null);
    setUsername(null);
    navigateTo("dashboard");
  };

  const parseLocation = (path: string) => {
    const cleanPath = path.replace(/^\/+|\/+$/g, "");
    if (!cleanPath) {
      return { view: "dashboard", projectId: "", repoName: "", tab: "code" as const, path: "", isFile: false };
    }

    const segments = cleanPath.split("/");
    if (segments.length >= 2) {
      const projectId = segments[0];
      const repoName = segments[1];
      
      if (segments[2] === "settings" || segments[2] === "permissions") {
        return { view: "repository", projectId, repoName, tab: "permissions" as const, path: "", isFile: false };
      }
      
      if (segments[2] === "actions") {
        return { view: "repository", projectId, repoName, tab: "canvas" as const, path: "", isFile: false };
      }

      if (segments[2] === "blob" && segments[3] === "main") {
        const filePath = segments.slice(4).join("/");
        return { view: "repository", projectId, repoName, tab: "code" as const, path: filePath, isFile: true };
      }

      if (segments[2] === "tree" && segments[3] === "main") {
        const dirPath = segments.slice(4).join("/");
        return { view: "repository", projectId, repoName, tab: "code" as const, path: dirPath, isFile: false };
      }

      return { view: "repository", projectId, repoName, tab: "code" as const, path: "", isFile: false };
    }

    return { view: "dashboard", projectId: "", repoName: "", tab: "code" as const, path: "", isFile: false };
  };

  const navigateTo = (
    view: "dashboard" | "repository",
    projId?: string,
    rName?: string,
    t: "code" | "canvas" | "permissions" = "code",
    filePath: string = "",
    isFile: boolean = false
  ) => {
    if (view === "dashboard") {
      window.history.pushState(null, "", "/");
    } else if (projId && rName) {
      if (t === "permissions") {
        window.history.pushState(null, "", `/${projId}/${rName}/settings`);
      } else if (t === "canvas") {
        window.history.pushState(null, "", `/${projId}/${rName}/actions`);
      } else {
        if (filePath) {
          const mode = isFile ? "blob" : "tree";
          window.history.pushState(null, "", `/${projId}/${rName}/${mode}/main/${filePath}`);
        } else {
          window.history.pushState(null, "", `/${projId}/${rName}`);
        }
      }
    }
    resolveRoute();
  };

  const resolveRoute = () => {
    const parsed = parseLocation(window.location.pathname);
    if (parsed.view === "dashboard") {
      setCurrentView("dashboard");
      return;
    }

    const project = projects.find(
      (p) => p.id === parsed.projectId || p.name.toLowerCase() === parsed.projectId.toLowerCase()
    );
    if (!project) {
      if (projects.length > 0) {
        setCurrentView("dashboard");
      }
      return;
    }

    if (selectedProjectId !== project.id || repositories.length === 0 || repositories[0]?.project_id !== project.id) {
      setSelectedProjectId(project.id);
      void fetchRepositoriesAndResolve(project.id, parsed.repoName, parsed.tab, parsed.path, parsed.isFile);
      return;
    }

    const repo = repositories.find(
      (r) => r.name.toLowerCase() === parsed.repoName.toLowerCase() || r.id === parsed.repoName
    );
    if (repo) {
      setSelectedProjectId(project.id);
      setSelectedRepoId(repo.id);
      setCurrentView("repository");
      setActiveTab(parsed.tab);
      setExplorerPath(parsed.path);
      setIsFileView(parsed.isFile);
      void fetchWorkflows(repo.id);
    } else {
      if (repositories.length > 0) {
        setCurrentView("dashboard");
      }
    }
  };

  const fetchRepositoriesAndResolve = async (
    projId: string,
    repoName: string,
    tab: "code" | "canvas" | "permissions",
    filePath: string,
    isFile: boolean
  ) => {
    if (!projId) return;
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${projId}/repos`);
      if (res.ok) {
        const repos: Repository[] = await res.json();
        setRepositories(repos);
        
        const repo = repos.find(
          (r) => r.name.toLowerCase() === repoName.toLowerCase() || r.id === repoName
        );
        if (repo) {
          setSelectedRepoId(repo.id);
          setCurrentView("repository");
          setActiveTab(tab);
          setExplorerPath(filePath);
          setIsFileView(isFile);
          void fetchWorkflows(repo.id);
        } else {
          setCurrentView("dashboard");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjectsAndResolve = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/projects");
      if (res.ok) {
        const data: Project[] = await res.json();
        setProjects(data);
        
        const parsed = parseLocation(window.location.pathname);
        if (parsed.view === "repository" && data.length > 0) {
          const project = data.find(
            (p) => p.id === parsed.projectId || p.name.toLowerCase() === parsed.projectId.toLowerCase()
          );
          if (project) {
            setSelectedProjectId(project.id);
            void fetchRepositoriesAndResolve(project.id, parsed.repoName, parsed.tab, parsed.path, parsed.isFile);
            return;
          }
        }
        
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
          void fetchRepositories(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Data lists
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [workflows, setWorkflows] = useState<Record<string, Workflow>>({});

  // Selections
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [selectedWorkflowName, setSelectedWorkflowName] = useState<string>("");

  // Run states
  const [runStatus, setRunStatus] = useState<string>("Idle");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [stepRuns, setStepRuns] = useState<StepRun[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string>("");

  // Approval states
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [suspendedCommand, setSuspendedCommand] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const handleWsMessageRef = useRef<((msg: any) => void) | null>(null);

  useEffect(() => {
    if (token) {
      void fetchProjectsAndResolve();
    }
  }, [token]);

  useEffect(() => {
    const handlePopState = () => {
      resolveRoute();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [projects, repositories, selectedProjectId]);

  useEffect(() => {
    if (token && projects.length > 0) {
      resolveRoute();
    }
  }, [projects]);

  // Poll dashboard data
  useEffect(() => {
    if (token) {
      void fetchDashboardData();
      const interval = setInterval(() => {
        void fetchDashboardData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [token, currentView]);

  // Set up WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket("ws://localhost:8080/api/ws");

      ws.onopen = () => {
        console.log("WebSocket connected to GitDuh");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (handleWsMessageRef.current) {
            handleWsMessageRef.current(msg);
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3s...");
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    };

    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [token]);

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Assign ref
  handleWsMessageRef.current = handleWsMessage;

  function handleWsMessage(msg: any) {
    const { event_type, run_id, step_id, content } = msg;

    // Verify event matches current active run (or set it if none active)
    if (event_type === "workflow_started") {
      setActiveRunId(run_id);
      setRunStatus("Running");
      setIsSuspended(false);
      setTerminalLogs("");

      const steps = (content.steps || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        logs: s.logs || "",
        execution_type: s.execution_type,
      }));
      setStepRuns(steps);
      return;
    }

    if (event_type === "step_started" && step_id) {
      setActiveStepId(step_id);
      setStepRuns((prev) => prev.map((s) => (s.id === step_id ? { ...s, status: "Running" } : s)));
      return;
    }

    if (event_type === "step_logs" && step_id && content.logs) {
      setTerminalLogs((prev) => prev + content.logs);
      setStepRuns((prev) =>
        prev.map((s) => {
          if (s.id === step_id) {
            return { ...s, logs: s.logs + content.logs };
          }
          return s;
        }),
      );
      return;
    }

    if (event_type === "step_waiting_approval" && step_id && content.command) {
      setIsSuspended(true);
      setSuspendedCommand(content.command);
      setStepRuns((prev) =>
        prev.map((s) => (s.id === step_id ? { ...s, status: "WaitingApproval" } : s)),
      );
      return;
    }

    if (event_type === "step_finished" && step_id && content.status) {
      setActiveStepId(null);
      if (activeStepId === step_id) {
        setIsSuspended(false);
      }
      setStepRuns((prev) =>
        prev.map((s) =>
          s.id === step_id ? { ...s, status: content.status, logs: content.logs || s.logs } : s,
        ),
      );
      return;
    }

    if (event_type === "workflow_finished") {
      setRunStatus(content.status);
      setActiveStepId(null);
      setIsSuspended(false);

      // Update step runs to their final state
      if (content.steps) {
        const steps = content.steps.map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          logs: s.logs || "",
          execution_type: s.execution_type,
        }));
        setStepRuns(steps);
      }
    }
    void fetchDashboardData();
  }

  const fetchDashboardData = async () => {
    try {
      const runsRes = await fetch("http://localhost:8080/api/workflows/runs");
      if (runsRes.ok) {
        const runs = await runsRes.json();
        setWorkflowRuns(runs);
      }
      const logsRes = await fetch("http://localhost:8080/api/audit_logs");
      if (logsRes.ok) {
        const logs = await logsRes.json();
        setAuditLogs(logs);
      }

      // Compute rules counts across all projects and repositories
      const projRes = await fetch("http://localhost:8080/api/projects");
      if (projRes.ok) {
        const projs: Project[] = await projRes.json();
        let allowed = 0;
        let prompt = 0;
        let blocked = 0;

        for (const proj of projs) {
          const repoRes = await fetch(`http://localhost:8080/api/projects/${proj.id}/repos`);
          if (repoRes.ok) {
            const repos: Repository[] = await repoRes.json();
            for (const repo of repos) {
              const permRes = await fetch(`http://localhost:8080/api/repos/${repo.id}/permissions`);
              if (permRes.ok) {
                const permData = await permRes.json();
                const rules = permData.rules || [];
                rules.forEach((r: any) => {
                  if (r.status === "Allowed") allowed++;
                  else if (r.status === "Prompt") prompt++;
                  else if (r.status === "Blocked") blocked++;
                });
              }
            }
          }
        }
        setRulesMetrics({ allowed, prompt, blocked });
      }
    } catch (e) {
      console.error("Error fetching dashboard data", e);
    }
  };


  const fetchRepositories = async (projectId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${projectId}/repos`);
      if (res.ok) {
        const repos: Repository[] = await res.json();
        setRepositories(repos);
        if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
          void fetchWorkflows(repos[0].id);
        } else {
          setSelectedRepoId("");
          setWorkflows({});
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWorkflows = async (repoId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/repos/${repoId}/workflows`);
      if (res.ok) {
        const data: Record<string, Workflow> = await res.json();
        setWorkflows(data);
        const keys = Object.keys(data);
        if (keys.length > 0) {
          setSelectedWorkflowName(keys[0]);
          const wf = getSafe(data, keys[0]);
          if (wf) {
            initializeCanvasSteps(wf);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initializeCanvasSteps = (workflow: Workflow) => {
    // Create initial step status placeholders
    const steps: StepRun[] = [];
    Object.keys(workflow.jobs).forEach((jobId) => {
      const job = getSafe(workflow.jobs, jobId);
      if (job) {
        steps.push({
          id: jobId,
          name: job.name,
          status: "Queued",
          logs: "",
          execution_type: job.agent ? "agent" : "command",
        });
      }
    });
    setStepRuns(steps);
    setRunStatus("Idle");
    setTerminalLogs("");
    setIsSuspended(false);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    void fetchRepositories(projectId);
  };

  const handleWorkflowChange = (name: string) => {
    setSelectedWorkflowName(name);
    const wf = getSafe(workflows, name);
    if (wf) {
      initializeCanvasSteps(wf);
    }
  };

  const handleRunWorkflow = async () => {
    if (!selectedRepoId || !selectedWorkflowName) return;
    setRunStatus("Running");
    setTerminalLogs("Queueing pipeline run locally...\n");
    setIsSuspended(false);

    try {
      await fetch(
        `http://localhost:8080/api/repos/${selectedRepoId}/workflows/${selectedWorkflowName}/run`,
        {
          method: "POST",
        },
      );
    } catch (e) {
      console.error("Failed to run workflow", e);
      setTerminalLogs(
        (prev) => prev + "ERROR: Failed to trigger workflow run. Is backend alive?\n",
      );
      setRunStatus("Failed");
    }
  };

  const handlePermissionApproval = async (approved: boolean) => {
    if (!activeRunId || !activeStepId) return;

    try {
      const res = await fetch("http://localhost:8080/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: activeRunId,
          step_id: activeStepId,
          approved,
        }),
      });
      if (res.ok) {
        setIsSuspended(false);
      }
    } catch (e) {
      console.error("Failed to submit approval", e);
    }
  };

  const currentWorkflow = getSafe(workflows, selectedWorkflowName);
  const activeRepo = repositories.find((r) => r.id === selectedRepoId);

  // Helper calculations for Dashboard
  const mockCommits = [
    {
      id: "c1",
      repo: "gitduh-backend",
      author: "rorychatt",
      message: "feat: add interactive validation prompt for suspicious subprocesses",
      branch: "main",
    },
    {
      id: "c2",
      repo: "gitduh-frontend",
      author: "rorychatt",
      message: "style: improve nodes contrast and glow-cyan glassmorphism effects",
      branch: "main",
    },
    {
      id: "c3",
      repo: "gitduh-backend",
      author: "rorychatt",
      message: "refactor: simplify topological workflow DAG runner using oneshot channels",
      branch: "main",
    },
  ];

  // Format time utility
  const formatTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 0 || seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Merge runs, logs, and mock commits chronologically
  const feedItems = [
    ...workflowRuns.map((run) => ({
      id: run.id,
      type: "run",
      title: `Pipeline Run: ${run.workflow_name}`,
      details: `Status: ${run.status} | Run ID: ${run.id.slice(0, 8)}`,
      status: run.status,
      timestamp: new Date(run.start_time),
      repo: repositories.find((r) => r.id === run.repo_id)?.name || run.repo_id,
      repo_id: run.repo_id,
      workflow: run.workflow_name,
    })),
    ...auditLogs.map((log) => ({
      id: log.id,
      type: "audit",
      title: `Command Checked: ${log.details}`,
      details: `Action: ${log.action_type} | Outcome: ${log.status}`,
      status: log.status,
      timestamp: new Date(log.timestamp),
      repo: repositories.find((r) => r.id === log.repo_id)?.name || log.repo_id,
      repo_id: log.repo_id,
      workflow: null,
    })),
    ...mockCommits.map((c, idx) => ({
      id: c.id,
      type: "commit",
      title: `Local Commit: ${c.message}`,
      details: `Author: ${c.author} | Branch: ${c.branch}`,
      status: "Commit",
      timestamp: new Date(Date.now() - (idx + 1) * 30 * 60000), // simulated
      repo: c.repo,
      repo_id: repositories.find((r) => r.name === c.repo)?.id || "",
      workflow: null,
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Filter repositories based on search and selected project ID
  const filteredRepos = repositories.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(repoSearchQuery.toLowerCase());
    const matchesProject = selectedProjectId ? r.project_id === selectedProjectId : true;
    return matchesSearch && matchesProject;
  });

  // Calculate dynamic rules percentage metrics
  const totalRules = rulesMetrics.allowed + rulesMetrics.prompt + rulesMetrics.blocked;
  const percentAllowed = totalRules > 0 ? (rulesMetrics.allowed / totalRules) * 100 : 0;
  const percentPrompt = totalRules > 0 ? (rulesMetrics.prompt / totalRules) * 100 : 0;
  const percentBlocked = totalRules > 0 ? (rulesMetrics.blocked / totalRules) * 100 : 0;

  // Filter runs waiting for approval
  const runsWaitingApproval = workflowRuns.filter(
    (run) =>
      run.status === "WaitingApproval" ||
      run.steps.some((s: any) => s.status === "WaitingApproval"),
  );

  const approveDirectly = async (runId: string, stepId: string, approved: boolean) => {
    try {
      const res = await fetch("http://localhost:8080/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          step_id: stepId,
          approved,
        }),
      });
      if (res.ok) {
        void fetchDashboardData();
        // Also update local running state in case it matches active
        if (runId === activeRunId && stepId === activeStepId) {
          setIsSuspended(false);
        }
      }
    } catch (e) {
      console.error("Failed direct approval", e);
    }
  };

  const enterRepoView = (repo: Repository) => {
    setSelectedProjectId(repo.project_id);
    setSelectedRepoId(repo.id);
    setCurrentView("repository");
    setActiveTab("code");
    setExplorerPath("");
    setIsFileView(false);
    void fetchWorkflows(repo.id);
    navigateTo("repository", repo.project_id, repo.name, "code", "", false);
  };

  return (
    <div className="dashboard-grid">
      {/* Drawer Menu Overlay & Content */}
      <div
        className={`drawer-overlay ${isDrawerOpen ? "open" : ""}`}
        onClick={() => setIsDrawerOpen(false)}
      >
        <div className="drawer-content glassmorphism" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div className="logo-container">
              <span style={{ fontSize: "22px" }}>🛡️</span>
              <span className="logo-text">GitDuh</span>
            </div>
            <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>
              &times;
            </button>
          </div>

          <div className="drawer-body">
            <div className="drawer-nav-section">
              <div
                className={`drawer-nav-item ${currentView === "dashboard" ? "active" : ""}`}
                onClick={() => {
                  navigateTo("dashboard");
                  setIsDrawerOpen(false);
                }}
              >
                🏠 Dashboard Home
              </div>
              {currentView === "repository" && (
                <>
                  <div
                    className={`drawer-nav-item ${activeTab === "code" ? "active" : ""}`}
                    onClick={() => {
                      navigateTo("repository", selectedProjectId, activeRepo?.name, "code");
                      setIsDrawerOpen(false);
                    }}
                  >
                    📄 Source Code
                  </div>
                  <div
                    className={`drawer-nav-item ${activeTab === "canvas" ? "active" : ""}`}
                    onClick={() => {
                      navigateTo("repository", selectedProjectId, activeRepo?.name, "canvas");
                      setIsDrawerOpen(false);
                    }}
                  >
                    🛠️ Pipeline Canvas
                  </div>
                  <div
                    className={`drawer-nav-item ${activeTab === "permissions" ? "active" : ""}`}
                    onClick={() => {
                      navigateTo("repository", selectedProjectId, activeRepo?.name, "permissions");
                      setIsDrawerOpen(false);
                    }}
                  >
                    🛡️ Settings & Permissions
                  </div>
                </>
              )}
            </div>

            <div className="drawer-repos-section">
              <div className="drawer-repos-header">
                <span>Top repositories</span>
                <span className="search-icon-small">🔍</span>
              </div>

              <input
                type="text"
                placeholder="Search repositories..."
                value={drawerRepoSearch}
                onChange={(e) => setDrawerRepoSearch(e.target.value)}
                className="drawer-search-input"
              />

              <div className="drawer-repos-list">
                {repositories
                  .filter((r) => r.name.toLowerCase().includes(drawerRepoSearch.toLowerCase()))
                  .map((repo) => {
                    const isActive = repo.id === selectedRepoId && currentView === "repository";
                    return (
                      <div
                        key={repo.id}
                        onClick={() => {
                          enterRepoView(repo);
                          setIsDrawerOpen(false);
                        }}
                        className={`drawer-repo-item ${isActive ? "active" : ""}`}
                      >
                        <span className="repo-icon">📦</span>
                        <div className="drawer-repo-item-text">
                          <span className="repo-name-text">{repo.name}</span>
                          <span className="repo-project-text">
                            {projects.find((p) => p.id === repo.project_id)?.name || "Project"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {repositories.length === 0 && (
                  <div className="drawer-repo-empty">No repositories registered.</div>
                )}
              </div>
            </div>

            <div className="drawer-banner">
              <div className="drawer-banner-title">🛡️ Strict Sandbox Mode</div>
              <p className="drawer-banner-text">
                Local automation agents run in isolated sub-environments. Approvals are logged.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button className="drawer-toggle-btn" onClick={() => setIsDrawerOpen(true)}>
            ☰
          </button>
          <div
            className="logo-container"
            onClick={() => {
              navigateTo("dashboard");
              setIsDrawerOpen(false);
            }}
            style={{ cursor: "pointer" }}
          >
            <span style={{ fontSize: "22px" }}>🛡️</span>
            <span className="logo-text" style={{ fontSize: "18px" }}>
              GitDuh
            </span>
          </div>
        </div>

        <div className="repo-selector-container">
          {currentView === "repository" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div className="navbar-breadcrumbs">
                <span className="breadcrumb-link" onClick={() => navigateTo("dashboard")}>
                  Dashboard
                </span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-project">
                  {projects.find((p) => p.id === selectedProjectId)?.name || "Project"}
                </span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-repo">{activeRepo?.name || "Repository"}</span>
              </div>
              
              <div className="navbar-tabs" style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "16px" }}>
                <span
                  onClick={() => navigateTo("repository", selectedProjectId, activeRepo?.name, "code")}
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: activeTab === "code" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: activeTab === "code" ? "var(--accent-cyan)" : "var(--text-secondary)",
                    border: activeTab === "code" ? "1px solid var(--border-color)" : "1px solid transparent",
                    transition: "all 0.2s"
                  }}
                >
                  📄 Code
                </span>
                <span
                  onClick={() => navigateTo("repository", selectedProjectId, activeRepo?.name, "canvas")}
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: activeTab === "canvas" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: activeTab === "canvas" ? "var(--accent-cyan)" : "var(--text-secondary)",
                    border: activeTab === "canvas" ? "1px solid var(--border-color)" : "1px solid transparent",
                    transition: "all 0.2s"
                  }}
                >
                  ⚡ Actions
                </span>
                <span
                  onClick={() => navigateTo("repository", selectedProjectId, activeRepo?.name, "permissions")}
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: activeTab === "permissions" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: activeTab === "permissions" ? "var(--accent-cyan)" : "var(--text-secondary)",
                    border: activeTab === "permissions" ? "1px solid var(--border-color)" : "1px solid transparent",
                    transition: "all 0.2s"
                  }}
                >
                  ⚙️ Settings
                </span>
              </div>
            </div>
          ) : (
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Dashboard</span>
          )}
        </div>

        {/* Search Bar / Actions */}
        <div
          className="navbar-right-actions"
          style={{ display: "flex", alignItems: "center", gap: "16px" }}
        >
          <div className="navbar-search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Type / to search"
              className="navbar-search-input"
              disabled
            />
            <span className="kbd-shortcut">/</span>
          </div>

          {/* Plus action button */}
          <button
            className="navbar-icon-btn glow-cyan-hover"
            title="Register Repository"
            onClick={() => setShowRegisterModal(true)}
            style={{
              fontSize: "18px",
              color: "var(--text-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ➕
          </button>

          {/* Profile Avatar / Logout */}
          <div className="profile-avatar-container" style={{ position: "relative" }}>
            <div
              className="profile-avatar glow-purple-hover"
              onClick={handleLogout}
              title={`Sign out (${username})`}
              style={{ cursor: "pointer" }}
            >
              {username ? username[0].toUpperCase() : "U"}
            </div>
          </div>
        </div>
      </header>

      {currentView === "dashboard" ? (
        /* Three-Column Landing Page Dashboard */
        <div className="landing-dashboard">
          {/* Left Column: Repository list */}
          <div className="dashboard-col">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">Repositories</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowRegisterModal(true)}
              >
                + Register
              </Button>
            </div>

            <div className="project-filter-container">
              <label htmlFor="dashboard-proj-filter">Select Project Filter</label>
              <select
                id="dashboard-proj-filter"
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="project-select-filter"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="repo-search-container">
              <input
                type="text"
                placeholder="Search repositories..."
                value={repoSearchQuery}
                onChange={(e) => setRepoSearchQuery(e.target.value)}
                className="repo-search-input"
              />
            </div>

            <div className="repo-card-list">
              {filteredRepos.length > 0 ? (
                filteredRepos.map((repo) => {
                  const isSelected = repo.id === selectedRepoId;
                  return (
                    <div
                      key={repo.id}
                      onClick={() => enterRepoView(repo)}
                      className={`repo-card ${isSelected ? "glow-cyan" : ""}`}
                      style={{
                        borderColor: isSelected ? "var(--accent-cyan)" : "var(--border-color)",
                      }}
                    >
                      <div className="repo-card-header">
                        <span className="repo-card-name">📦 {repo.name}</span>
                        <span className="repo-card-project-badge">
                          {projects.find((p) => p.id === repo.project_id)?.name || "Project"}
                        </span>
                      </div>
                      <span className="repo-card-path">{repo.path}</span>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  No repositories found.
                </div>
              )}
            </div>
          </div>

          {/* Middle Column: Activity Feed */}
          <div
            className="dashboard-col"
            style={{
              borderLeft: "1px solid var(--border-color)",
              borderRight: "1px solid var(--border-color)",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">Local Activity Feed</h3>
            </div>

            <div className="activity-feed">
              {feedItems.length > 0 ? (
                feedItems.slice(0, 15).map((item) => {
                  let icon = "🛠️";
                  if (item.type === "audit") {
                    icon = "🛡️";
                  } else if (item.type === "commit") {
                    icon = "💻";
                  }

                  return (
                    <div key={item.id} className="feed-item">
                      <span className="feed-item-icon">{icon}</span>
                      <div className="feed-item-content">
                        <div className="feed-item-header">
                          <span className="feed-item-title">{item.title}</span>
                          <Badge
                            status={item.status as any}
                            style={{ transform: "scale(0.85)", transformOrigin: "right" }}
                          />
                        </div>
                        <span className="feed-item-meta">
                          repo: <strong>{item.repo}</strong> &bull; {formatTime(item.timestamp)}
                        </span>
                        <div className="feed-item-details">{item.details}</div>
                        {item.repo_id && (
                          <span
                            onClick={() => {
                              const repoObj = repositories.find((r) => r.id === item.repo_id);
                              if (repoObj) {
                                setSelectedProjectId(repoObj.project_id);
                                setSelectedRepoId(repoObj.id);
                                setCurrentView("repository");
                                void fetchWorkflows(repoObj.id);
                                if (item.workflow) {
                                  setSelectedWorkflowName(item.workflow);
                                  setActiveTab("canvas");
                                  navigateTo("repository", repoObj.project_id, repoObj.name, "canvas", "", false);
                                } else {
                                  setActiveTab("code");
                                  setExplorerPath("");
                                  setIsFileView(false);
                                  navigateTo("repository", repoObj.project_id, repoObj.name, "code", "", false);
                                }
                              }
                            }}
                            className="feed-item-action"
                          >
                            Go to Workspace &rarr;
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  No activities logged yet. Trigger a local workflow to populate feed.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Contextual actions & diagnostics */}
          <div className="dashboard-col">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">Diagnostics & Actions</h3>
            </div>

            <div className="diagnostic-metrics">
              {/* Health checks */}
              <div className="agent-health-card glassmorphism">
                <h4
                  style={{ margin: "0 0 10px 0", fontSize: "13px", color: "var(--text-primary)" }}
                >
                  🖥️ Local Agent Environment
                </h4>
                <div className="health-status-row">
                  <span className="health-status-label">Claude Engine</span>
                  <span className="health-status-value" style={{ color: "var(--accent-emerald)" }}>
                    🟢 Online
                  </span>
                </div>
                <div className="health-status-row">
                  <span className="health-status-label">Security Sandbox</span>
                  <span className="health-status-value" style={{ color: "var(--accent-cyan)" }}>
                    🟢 Strict
                  </span>
                </div>
                <div className="health-status-row">
                  <span className="health-status-label">Local Host Controller</span>
                  <span className="health-status-value">🟢 Active</span>
                </div>
                <div className="health-status-row">
                  <span className="health-status-label">Agentic API Latency</span>
                  <span className="health-status-value" style={{ fontFamily: "var(--font-mono)" }}>
                    14ms
                  </span>
                </div>
              </div>

              {/* Rules diagnostic count */}
              <div className="rules-diagnostic-card glassmorphism">
                <h4
                  style={{ margin: "0 0 10px 0", fontSize: "13px", color: "var(--text-primary)" }}
                >
                  🛡️ Pre-Approved Rules Audit
                </h4>
                <div className="rule-metric-row">
                  <span className="rule-metric-label">
                    <span style={{ color: "var(--accent-emerald)" }}>●</span> Allowed Commands
                  </span>
                  <div className="rule-metric-right">
                    <div className="rule-metric-bar-container">
                      <div
                        className="rule-metric-bar"
                        style={{
                          width: `${percentAllowed}%`,
                          backgroundColor: "var(--accent-emerald)",
                        }}
                      ></div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {rulesMetrics.allowed}
                    </span>
                  </div>
                </div>
                <div className="rule-metric-row">
                  <span className="rule-metric-label">
                    <span style={{ color: "var(--accent-orange)" }}>●</span> Prompt Consent
                  </span>
                  <div className="rule-metric-right">
                    <div className="rule-metric-bar-container">
                      <div
                        className="rule-metric-bar"
                        style={{
                          width: `${percentPrompt}%`,
                          backgroundColor: "var(--accent-orange)",
                        }}
                      ></div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {rulesMetrics.prompt}
                    </span>
                  </div>
                </div>
                <div className="rule-metric-row">
                  <span className="rule-metric-label">
                    <span style={{ color: "var(--accent-red)" }}>●</span> Blocked Execution
                  </span>
                  <div className="rule-metric-right">
                    <div className="rule-metric-bar-container">
                      <div
                        className="rule-metric-bar"
                        style={{
                          width: `${percentBlocked}%`,
                          backgroundColor: "var(--accent-red)",
                        }}
                      ></div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {rulesMetrics.blocked}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="dashboard-section-header" style={{ marginTop: "8px" }}>
                <h3
                  className="dashboard-section-title"
                  style={{ fontSize: "12px", color: "var(--accent-orange)" }}
                >
                  ⚠️ Pending Approval Alerts
                </h3>
              </div>

              <div
                className="pending-approvals-list"
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                {runsWaitingApproval.length > 0 ? (
                  runsWaitingApproval.map((run) => {
                    const step = run.steps.find((s: any) => s.status === "WaitingApproval");
                    if (!step) return null;
                    // Find the command if it was parsed (backend holds logs/details or we can fallback)
                    // Let's assume we can fetch it, or fallback to the running step name
                    const repoName =
                      repositories.find((r) => r.id === run.repo_id)?.name || run.repo_id;
                    return (
                      <div key={run.id} className="pending-approvals-dashboard glow-orange">
                        <span className="pending-card-title">
                          Repo: {repoName} ({run.workflow_name})
                        </span>
                        <div className="pending-card-cmd">{step.name} requires user consent</div>
                        <div className="pending-card-actions">
                          <Button
                            onClick={() => approveDirectly(run.id, step.id, true)}
                            variant="success"
                            size="sm"
                            style={{ flex: 1 }}
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => approveDirectly(run.id, step.id, false)}
                            variant="danger"
                            size="sm"
                            style={{ flex: 1 }}
                          >
                            Block
                          </Button>
                          <Button
                            onClick={() => {
                              const repoObj = repositories.find((r) => r.id === run.repo_id);
                              if (repoObj) {
                                setSelectedProjectId(repoObj.project_id);
                                setSelectedRepoId(repoObj.id);
                                setCurrentView("repository");
                                setSelectedWorkflowName(run.workflow_name);
                                setActiveTab("canvas");
                                void fetchWorkflows(repoObj.id);
                                navigateTo("repository", repoObj.project_id, repoObj.name, "canvas", "", false);
                              }
                            }}
                            variant="secondary"
                            size="sm"
                            style={{ flex: 1 }}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      padding: "16px",
                      border: "1px dashed var(--border-color)",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    No pending approval requests.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Repository Canvas / Settings workspace view */
        <>
          {/* Sidebar (Left) */}
          <aside className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">Repository Context</div>
              <div className="repo-info-card">
                <div className="info-item">
                  <span className="info-label">Branch</span>
                  <span className="info-val" style={{ color: "var(--accent-cyan)" }}>
                    main
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Commits</span>
                  <span className="info-val">4 ahead</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Staged Files</span>
                  <span className="info-val" style={{ color: "var(--accent-emerald)" }}>
                    2 modified
                  </span>
                </div>
                <div
                  className="info-item"
                  style={{ flexDirection: "column", gap: "2px", marginTop: "6px" }}
                >
                  <span className="info-label">Local path</span>
                  <span
                    className="info-val"
                    style={{
                      fontSize: "10px",
                      wordBreak: "break-all",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {activeRepo?.path || "/Users/rorychatt/git/rorychatt/"}
                  </span>
                </div>
              </div>
            </div>

            <div className="sidebar-section" style={{ flex: 1 }}>
              <div className="sidebar-title">Workflow Configurations</div>
              {Object.keys(workflows).map((name) => (
                <div
                  key={name}
                  onClick={() => handleWorkflowChange(name)}
                  className={`workflow-item ${selectedWorkflowName === name ? "glow-cyan" : ""}`}
                  style={{
                    borderColor:
                      selectedWorkflowName === name ? "var(--accent-cyan)" : "var(--border-color)",
                  }}
                >
                  <div className="workflow-item-left">
                    <span className="workflow-item-name">{getSafe(workflows, name)?.name}</span>
                    <span className="workflow-item-trigger">
                      on: [{(getSafe(workflows, name)?.on || []).join(", ")}]
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>yaml</span>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Content Area (Center) */}
          <main
            className="main-content"
            style={{
              display: "grid",
              gridTemplateColumns: activeTab === "canvas" ? "1fr 340px" : "1fr",
            }}
          >
            {activeTab === "canvas" ? (
              <>
                {/* Visual Workflow Canvas + Log Terminal */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    borderRight: "1px solid var(--border-color)",
                  }}
                >
                  {currentWorkflow ? (
                    <WorkflowCanvas
                      workflowName={selectedWorkflowName}
                      jobs={currentWorkflow.jobs}
                      activeStepId={activeStepId}
                      stepRuns={stepRuns}
                      runStatus={runStatus}
                      onRunWorkflow={handleRunWorkflow}
                    />
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Loading pipeline...
                    </div>
                  )}

                  <ConsoleTerminal
                    logs={terminalLogs}
                    runStatus={runStatus}
                    activeStepName={stepRuns.find((s) => s.id === activeStepId)?.name || ""}
                    onApprove={handlePermissionApproval}
                    isSuspended={isSuspended}
                    suspendedCommand={suspendedCommand}
                  />
                </div>

                {/* AI Agent Chat (Right side of canvas tab) */}
                <AgentChat
                  repoId={selectedRepoId}
                  onWorkflowCreated={() => fetchWorkflows(selectedRepoId)}
                />
              </>
            ) : activeTab === "code" ? (
              <FileExplorer
                repoId={selectedRepoId}
                repoName={activeRepo?.name || ""}
                projectId={selectedProjectId}
                currentPath={explorerPath}
                isFileView={isFileView}
                onNavigate={(path, isFile) => navigateTo("repository", selectedProjectId, activeRepo?.name, "code", path, isFile)}
              />
            ) : (
              /* Permissions & Settings Tab */
              <PermissionSettings
                repoId={selectedRepoId}
                repoName={activeRepo?.name || ""}
                projects={projects}
                selectedProjectId={selectedProjectId}
              />
            )}
          </main>
        </>
      )}

      {showRegisterModal && (
        <RegisterRepoModal
          projects={projects}
          defaultProjectId={selectedProjectId}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={(newRepo) => {
            setShowRegisterModal(false);
            // Refresh repos list for currently selected project
            if (newRepo.project_id === selectedProjectId) {
              void fetchRepositories(selectedProjectId);
            } else {
              setSelectedProjectId(newRepo.project_id);
              void fetchRepositories(newRepo.project_id);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
