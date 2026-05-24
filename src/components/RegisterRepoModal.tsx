import React, { useState } from "react";
import type { Project, Repository } from "../types";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";

interface RegisterRepoModalProps {
  projects: Project[];
  defaultProjectId: string;
  onClose: () => void;
  onSuccess: (newRepo: Repository) => void;
}

export const RegisterRepoModal: React.FC<RegisterRepoModalProps> = ({
  projects,
  defaultProjectId,
  onClose,
  onSuccess,
}) => {
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || "");
  const [name, setName] = useState("");
  const [path, setPath] = useState("/Users/rorychatt/git/rorychatt/");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Repository name is required.");
      return;
    }
    if (!path.trim()) {
      setError("Local filesystem path is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:8080/api/projects/${projectId}/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, path }),
      });

      if (res.ok) {
        const newRepo: Repository = await res.json();
        onSuccess(newRepo);
      } else {
        const txt = await res.text();
        setError(txt || "Failed to register repository.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error: Could not reach backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🛡️ Register New Repository"
      glow="purple"
    >
      <form onSubmit={handleSubmit} className="modal-form">
        {error && <div className="modal-error">{error}</div>}

        <Select
          id="modal-project"
          label="Target Project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <Input
          id="modal-name"
          label="Repository Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. gitduh-backend"
          required
        />

        <Input
          id="modal-path"
          label="Local Filesystem Path"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/Users/rorychatt/git/rorychatt/..."
          required
        />

        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Register Repository
          </Button>
        </div>
      </form>
    </Modal>
  );
};
