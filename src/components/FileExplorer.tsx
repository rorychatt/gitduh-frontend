import React, { useState, useEffect } from "react";
import { Card, CardBody } from "./ui/Card";
import { Button } from "./ui/Button";
import { useTranslation } from "react-i18next";

interface FileEntry {
  name: string;
  is_dir: boolean;
  size: number;
}

interface FileExplorerProps {
  repoId: string;
  repoName: string;
  projectId: string;
  currentPath: string; // From route: e.g. "src/components" or "Cargo.toml"
  isFileView: boolean; // From route: true if segments contain "/blob/main/"
  onNavigate: (path: string, isFile: boolean) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  repoId,
  repoName,
  currentPath,
  isFileView,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ entries?: FileEntry[]; content?: string; name?: string; size?: number; type?: string } | null>(null);

  useEffect(() => {
    const fetchPathData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `http://localhost:8080/api/repos/${repoId}/files?path=${encodeURIComponent(currentPath)}`
        );
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          const txt = await res.text();
          setError(txt || "Failed to load files.");
        }
      } catch (err) {
        console.error(err);
        setError("Network error: Could not load repository files.");
      } finally {
        setLoading(false);
      }
    };

    fetchPathData();
  }, [repoId, currentPath]);

  const handleEntryClick = (entry: FileEntry) => {
    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    onNavigate(nextPath, !entry.is_dir);
  };

  const getParentPath = () => {
    if (!currentPath) return "";
    const parts = currentPath.split("/");
    parts.pop();
    return parts.join("/");
  };

  const handleBackClick = () => {
    const parent = getParentPath();
    onNavigate(parent, false);
  };

  // Helper to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        <span className="spinner-small" style={{ marginRight: "8px" }}></span> {t("fileExplorer.loadingFiles")}
      </div>
    );
  }

  if (error) {
    return (
      <Card glow="red" style={{ margin: "20px" }}>
        <CardBody>
          <div style={{ color: "var(--accent-red)", fontWeight: 600 }}>{t("fileExplorer.errorLoading")}</div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>{error}</p>
          <Button variant="secondary" onClick={handleBackClick} style={{ marginTop: "12px" }}>
            {t("fileExplorer.goBack")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Render file view
  if (isFileView || (data && data.type === "file")) {
    const fileContent = data?.content || "";
    const fileName = data?.name || currentPath.split("/").pop() || "";
    const fileSize = data?.size || 0;

    return (
      <div className="file-explorer-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Button variant="secondary" onClick={handleBackClick} size="sm">
              &larr; {t("common.back")}
            </Button>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              {repoName} / {currentPath}
            </span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {formatBytes(fileSize)}
          </span>
        </div>

        <Card glow="purple" style={{ overflow: "hidden" }}>
          <div className="file-viewer-header" style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border-color)",
            background: "rgba(255, 255, 255, 0.03)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>{fileName}</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {fileName.split(".").pop() || "text"}
            </span>
          </div>
          <CardBody style={{ padding: 0 }}>
            <pre style={{
              margin: 0,
              padding: "16px",
              overflowX: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "12.5px",
              lineHeight: "1.6",
              backgroundColor: "#050608",
              color: "#e6edf3",
              textAlign: "left"
            }}>
              <code>{fileContent}</code>
            </pre>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Render directory view
  const entries = data?.entries || [];

  return (
    <div className="file-explorer-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {currentPath && (
            <Button variant="secondary" onClick={handleBackClick} size="sm">
              &larr; {t("common.up")}
            </Button>
          )}
          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            {repoName} {currentPath ? `/ ${currentPath}` : ""}
          </span>
        </div>
      </div>

      <Card glow="cyan">
        <CardBody style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", background: "rgba(255, 255, 255, 0.02)" }}>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{t("common.name")}</th>
                <th style={{ padding: "12px 16px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>{t("common.size")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    {t("fileExplorer.emptyFolder")}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.name}
                    className="file-explorer-row"
                    onClick={() => handleEntryClick(entry)}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>{entry.is_dir ? "📁" : "📄"}</span>
                      <span className="file-entry-link" style={{ color: entry.is_dir ? "var(--accent-cyan)" : "var(--text-primary)", fontWeight: entry.is_dir ? 500 : 400 }}>
                        {entry.name}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-muted)", textAlign: "right" }}>
                      {entry.is_dir ? "--" : formatBytes(entry.size)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
};
