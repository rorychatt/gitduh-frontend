export type RunStatus = "Queued" | "Running" | "Success" | "Failed" | "WaitingApproval";

export interface StepRun {
  id: string;
  name: string;
  status: RunStatus;
  logs: string;
  execution_type: string;
}

export interface Job {
  name: string;
  needs?: string[];
  run?: string;
  agent?: {
    skill: string;
    target: string;
    prompt?: string;
  };
}

export interface Workflow {
  name: string;
  on: string[];
  jobs: Record<string, Job>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Repository {
  id: string;
  project_id: string;
  name: string;
  path: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  repo_id: string;
  action_type: string;
  details: string;
  status: string;
}

export interface LoggingSettings {
  permissions: boolean;
  secrets: boolean;
  workflows: boolean;
  actions: boolean;
  projects: boolean;
}

