import React, { useState, useEffect, useCallback } from "react";
import type { Project, LoggingSettings } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Card, CardBody } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Toggle } from "./ui/Toggle";
import { useTranslation } from "react-i18next";

interface Rule {
  id: string;
  repo_id: string;
  pattern: string;
  status: "Allowed" | "Blocked" | "Prompt";
}

interface Secret {
  id: string;
  repo_id: string;
  key: string;
  value: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  repo_id: string;
  action_type: string;
  details: string;
  status: string;
}

interface PermissionSettingsProps {
  repoId: string;
  repoName: string;
  projects: Project[];
  selectedProjectId: string;
}

export const PermissionSettings: React.FC<PermissionSettingsProps> = ({
  repoId,
  repoName,
  projects,
  selectedProjectId,
}) => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loggingSettings, setLoggingSettings] = useState<LoggingSettings>({
    permissions: true,
    secrets: true,
    workflows: true,
    actions: true,
    projects: true,
  });
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterOutcome, setFilterOutcome] = useState<string>("all");

  // Form states
  const [newPattern, setNewPattern] = useState("");
  const [newStatus, setNewStatus] = useState<"Allowed" | "Blocked" | "Prompt">("Prompt");
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretVal, setNewSecretVal] = useState("");

  // Project/Repo Scoping info
  const project = projects.find((p) => p.id === selectedProjectId);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/repos/${repoId}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setSecrets(data.secrets || []);
        setAuditLogs(data.audit_logs || []);
      }
      
      const settingsRes = await fetch(`http://localhost:8080/api/repos/${repoId}/logging_settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setLoggingSettings(settingsData);
      }
    } catch (e) {
      console.error("Failed to fetch permissions", e);
    } finally {
      setIsLoading(false);
    }
  }, [repoId]);

  const handleToggleLogging = async (key: keyof LoggingSettings) => {
    const allowedKeys: (keyof LoggingSettings)[] = [
      "permissions",
      "secrets",
      "workflows",
      "actions",
      "projects",
    ];
    if (!allowedKeys.includes(key)) {
      return;
    }
    const updatedSettings = { ...loggingSettings };
    if (key === "permissions") {
      updatedSettings.permissions = !loggingSettings.permissions;
    } else if (key === "secrets") {
      updatedSettings.secrets = !loggingSettings.secrets;
    } else if (key === "workflows") {
      updatedSettings.workflows = !loggingSettings.workflows;
    } else if (key === "actions") {
      updatedSettings.actions = !loggingSettings.actions;
    } else if (key === "projects") {
      updatedSettings.projects = !loggingSettings.projects;
    }
    setLoggingSettings(updatedSettings);

    try {
      await fetch(`http://localhost:8080/api/repos/${repoId}/logging_settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      void fetchPermissions();
    } catch (e) {
      console.error("Failed to update logging settings", e);
    }
  };

  useEffect(() => {
    if (repoId) {
      void fetchPermissions();
    }
  }, [repoId, fetchPermissions]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim()) return;

    try {
      const res = await fetch(`http://localhost:8080/api/repos/${repoId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: newPattern, status: newStatus }),
      });
      if (res.ok) {
        setNewPattern("");
        void fetchPermissions();
      }
    } catch (e) {
      console.error("Failed to add rule", e);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/repos/${repoId}/permissions/${ruleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        void fetchPermissions();
      }
    } catch (e) {
      console.error("Failed to delete rule", e);
    }
  };

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretKey.trim() || !newSecretVal.trim()) return;

    try {
      const res = await fetch(`http://localhost:8080/api/repos/${repoId}/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newSecretKey, value: newSecretVal }),
      });
      if (res.ok) {
        setNewSecretKey("");
        setNewSecretVal("");
        void fetchPermissions();
      }
    } catch (e) {
      console.error("Failed to add secret", e);
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/repos/${repoId}/secrets/${secretId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        void fetchPermissions();
      }
    } catch (e) {
      console.error("Failed to delete secret", e);
    }
  };

  return (
    <div className="settings-container animate-fade-in">
      <div className="settings-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="project-badge">{t("permissions.projectLabel")} {project?.name || "Local"}</span>
          <span
            className="project-badge"
            style={{ backgroundColor: "rgba(0, 210, 255, 0.1)", color: "var(--accent-cyan)" }}
          >
            {t("permissions.repoLabel")} {repoName}
          </span>
        </div>
        <h1 className="settings-title" style={{ marginTop: "8px" }}>
          {t("permissions.securityManagement")}
        </h1>
        <p className="settings-desc">
          {t("permissions.securitySubtitle")}
        </p>
      </div>

      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          {t("permissions.loadingSettings")}
        </div>
      ) : (
        <>
          {/* Rules Card */}
          <Card glow="cyan" className="settings-section-card" style={{ marginBottom: "24px" }}>
            <CardBody>
              <h2 className="section-card-title">
                <span style={{ color: "var(--accent-cyan)", marginRight: "8px" }}>🔒</span> {t("permissions.commandRulesPolicies")}
              </h2>
              <p className="section-card-desc">
                {t("permissions.policyDescription")}
              </p>

              <form onSubmit={handleAddRule} className="inline-form" style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    placeholder={t("permissions.commandPatternPlaceholder")}
                    required
                  />
                </div>
                <div>
                  <Select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Rule["status"])}
                    style={{ width: "130px" }}
                  >
                    <option value="Allowed">{t("common.allowed")}</option>
                    <option value="Prompt">{t("common.prompt")}</option>
                    <option value="Blocked">{t("common.blocked")}</option>
                  </Select>
                </div>
                <Button type="submit" variant="primary">
                  {t("permissions.addPolicy")}
                </Button>
              </form>

              <table className="permission-rules-table">
                <thead>
                  <tr>
                    <th>{t("permissions.commandPattern")}</th>
                    <th>{t("permissions.behaviorStatus")}</th>
                    <th style={{ width: "80px", textAlign: "right" }}>{t("permissions.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}
                      >
                        {t("permissions.noRulesDefined")}
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id}>
                        <td>
                          <span className="rule-pattern-badge">{rule.pattern}</span>
                        </td>
                        <td>
                          <Badge status={rule.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Button
                            onClick={() => handleDeleteRule(rule.id)}
                            variant="danger"
                            size="sm"
                          >
                            {t("common.delete")}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {/* Secrets Card */}
          <Card glow="purple" className="settings-section-card" style={{ marginBottom: "24px" }}>
            <CardBody>
              <h2 className="section-card-title">
                <span style={{ color: "var(--accent-purple)", marginRight: "8px" }}>🔑</span> {t("permissions.credentialsSecretsKeys")}
              </h2>
              <p className="section-card-desc">
                {t("permissions.secretsDescription")}
              </p>

              <form onSubmit={handleAddSecret} className="inline-form" style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={newSecretKey}
                    onChange={(e) => setNewSecretKey(e.target.value)}
                    placeholder={t("permissions.secretKeyPlaceholder")}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    type="password"
                    value={newSecretVal}
                    onChange={(e) => setNewSecretVal(e.target.value)}
                    placeholder={t("permissions.secretValuePlaceholder")}
                    required
                  />
                </div>
                <Button type="submit" variant="primary">
                  {t("permissions.addSecret")}
                </Button>
              </form>

              <div className="secrets-list">
                {secrets.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: "20px",
                      border: "1px dashed var(--border-color)",
                      borderRadius: "6px",
                    }}
                  >
                    {t("permissions.noSecretsRegistered")}
                  </div>
                ) : (
                  secrets.map((secret) => (
                    <div key={secret.id} className="secret-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                      <div>
                        <span className="secret-key" style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{secret.key}</span>
                        <span className="secret-val" style={{ marginLeft: "24px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                          {secret.value}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleDeleteSecret(secret.id)}
                        variant="danger"
                        size="sm"
                      >
                        {t("common.remove")}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          {/* Logging Settings Card */}
          <Card glow="emerald" className="settings-section-card" style={{ marginBottom: "24px" }}>
            <CardBody>
              <h2 className="section-card-title">
                <span style={{ color: "var(--accent-emerald)", marginRight: "8px" }}>⚙️</span> {t("permissions.activityLoggingSettings")}
              </h2>
              <p className="section-card-desc">
                {t("permissions.auditTrailDescription")}
              </p>

              <div className="logging-settings-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "16px",
                marginTop: "20px"
              }}>
                <Toggle
                  checked={loggingSettings.permissions}
                  onChange={() => handleToggleLogging("permissions")}
                  label={t("permissions.permissionsLogging")}
                  description={t("permissions.permissionsLoggingDesc")}
                />

                <Toggle
                  checked={loggingSettings.secrets}
                  onChange={() => handleToggleLogging("secrets")}
                  label={t("permissions.secretsLogging")}
                  description={t("permissions.secretsLoggingDesc")}
                />

                <Toggle
                  checked={loggingSettings.workflows}
                  onChange={() => handleToggleLogging("workflows")}
                  label={t("permissions.workflowsLogging")}
                  description={t("permissions.workflowsLoggingDesc")}
                />

                <Toggle
                  checked={loggingSettings.actions}
                  onChange={() => handleToggleLogging("actions")}
                  label={t("permissions.actionsLogging")}
                  description={t("permissions.actionsLoggingDesc")}
                />

                <Toggle
                  checked={loggingSettings.projects}
                  onChange={() => handleToggleLogging("projects")}
                  label={t("permissions.projectsLogging")}
                  description={t("permissions.projectsLoggingDesc")}
                />
              </div>
            </CardBody>
          </Card>

          {/* Audit Logs Card */}
          <Card glow="orange" className="settings-section-card" style={{ marginBottom: "24px" }}>
            <CardBody>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h2 className="section-card-title" style={{ margin: 0 }}>
                    <span style={{ color: "var(--accent-orange)", marginRight: "8px" }}>📋</span> {t("permissions.securityAuditTrail")}
                  </h2>
                  <p className="section-card-desc" style={{ margin: "4px 0 0 0" }}>
                    {t("permissions.auditLogDescription")}
                  </p>
                </div>
                
                {/* Filters */}
                <div className="filter-controls" style={{ display: "flex", gap: "12px" }}>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ minWidth: "160px" }}
                  >
                    <option value="all">{t("permissions.allCategories")}</option>
                    <option value="permissions">{t("permissions.permissionsCategory")}</option>
                    <option value="secrets">{t("permissions.secretsCategory")}</option>
                    <option value="workflows">{t("permissions.workflowsCategory")}</option>
                    <option value="command">{t("permissions.actionsCategory")}</option>
                    <option value="projects">{t("permissions.projectsCategory")}</option>
                  </Select>

                  <Select
                    value={filterOutcome}
                    onChange={(e) => setFilterOutcome(e.target.value)}
                    style={{ minWidth: "150px" }}
                  >
                    <option value="all">{t("permissions.allOutcomes")}</option>
                    <option value="allowed">{t("permissions.allowedApproved")}</option>
                    <option value="blocked">{t("permissions.blockedDenied")}</option>
                  </Select>
                </div>
              </div>

              <table className="permission-rules-table" style={{ marginTop: "16px" }}>
                <thead>
                  <tr>
                    <th>{t("common.timestamp")}</th>
                    <th>{t("permissions.actionType")}</th>
                    <th>{t("permissions.executionDetail")}</th>
                    <th>{t("permissions.authorizedOutcome")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = auditLogs.filter((log) => {
                      const matchesCategory = filterCategory === "all" || log.action_type === filterCategory;
                      
                      let matchesOutcome = true;
                      if (filterOutcome === "allowed") {
                        matchesOutcome = ["preapproved", "approved", "allowed", "success", "started"].includes(log.status.toLowerCase());
                      } else if (filterOutcome === "blocked") {
                        matchesOutcome = ["blocked", "denied", "failed"].includes(log.status.toLowerCase());
                      }
                      
                      return matchesCategory && matchesOutcome;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={4}
                            style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}
                          >
                            {t("permissions.noLogsFound")}
                          </td>
                        </tr>
                      );
                    }

                    return [...filtered].reverse().map((log) => (
                      <tr key={log.id}>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ textTransform: "capitalize", fontWeight: 500 }}>
                          {log.action_type === "command" ? "action" : log.action_type}
                        </td>
                        <td>
                          <span className="rule-pattern-badge" style={{ fontSize: "11px" }}>
                            {log.details}
                          </span>
                        </td>
                        <td>
                          <Badge status={log.status as any} />
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};
