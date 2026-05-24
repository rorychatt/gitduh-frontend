import React, { useState } from "react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { useTranslation } from "react-i18next";

interface PlannedStep {
  id: string;
  name: string;
  step_type: string;
  detail: string;
  pre_approved: boolean;
}

interface ProposedWorkflow {
  filename: string;
  content: string;
}

interface AgentPlan {
  plan_id: string;
  target_repo_id: string;
  text_response: string;
  missing_workflows: ProposedWorkflow[];
  planned_steps: PlannedStep[];
}

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  plan?: AgentPlan;
}

interface AgentChatProps {
  repoId: string;
  onWorkflowCreated: () => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({ repoId, onWorkflowCreated }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "agent",
      text: "Hello! I am Claude. I manage the GitDuh local automation skills for this repository. Tell me what you'd like to automate (e.g., 'do a release' or 'run integration tests').",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuery = query;
    setQuery("");
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8080/api/agent/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId, instruction: currentQuery }),
      });

      if (res.ok) {
        const plan: AgentPlan = await res.json();

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "agent",
          text: plan.text_response,
          plan: plan.planned_steps.length > 0 ? plan : undefined,
        };

        setMessages((prev) => [...prev, agentMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "agent",
            text: "I encountered an error processing your request. Please check that the Rust backend is running.",
          },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "agent",
          text: "Could not connect to the backend. Please verify your connection.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCreateWorkflow = async (workflow: ProposedWorkflow) => {
    try {
      const res = await fetch("http://localhost:8080/api/agent/create_workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_id: repoId,
          filename: workflow.filename,
          content: workflow.content,
        }),
      });

      if (res.ok) {
        // Notify parent to refresh workflows
        onWorkflowCreated();

        // Append response bubble
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "agent",
            text: `✓ Created \`.gitduh/workflows/${workflow.filename}\` workflow successfully. It has been mounted to your canvas. You can click 'Run Pipeline' in the canvas toolbar to execute it!`,
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to create workflow", e);
    }
  };

  return (
    <div className="agent-chat-container">
      <div className="chat-header">
        <span style={{ fontSize: "14px" }}>🤖</span>
        <span>{t("agentChat.consoleTitle")}</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-bubble chat-bubble-${msg.sender}`}>
            <div>{msg.text}</div>

            {msg.plan && (
              <div className="agent-plan-box">
                <div className="agent-plan-title">{t("agentChat.proposingSequence")}</div>

                {msg.plan.planned_steps.map((step) => (
                  <div key={step.id} className="agent-plan-step">
                    <span>{step.step_type === "agent" ? "🤖" : "⚙️"}</span>
                    <span>
                      <strong>{step.name}</strong> ({step.detail})
                    </span>
                    <Badge
                      status={step.pre_approved ? "PreApproved" : "Prompt"}
                      style={{ fontSize: "9px" }}
                    >
                      {step.pre_approved ? "Pre-Approved" : "Needs Approval"}
                    </Badge>
                  </div>
                ))}

                {msg.plan.missing_workflows.map((wf) => (
                  <div key={wf.filename} style={{ marginTop: "10px" }}>
                    <div
                      style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}
                    >
                      {t("agentChat.proposedConfigFile")}{wf.filename}`
                    </div>
                    <div className="yaml-diff-container">
                      <div className="diff-header">{wf.filename} (Suggested Additions)</div>
                      <div className="diff-code">{wf.content}</div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleCreateWorkflow(wf)}
                      style={{ padding: "6px 12px", fontSize: "12px", marginTop: "8px" }}
                    >
                      {t("agentChat.createWorkflowConfig")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="chat-bubble chat-bubble-agent" style={{ opacity: 0.6 }}>
            {t("agentChat.claudePlanning")}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Claude to do something (e.g. 'do a release')"
          className="chat-input"
          required
        />
        <Button type="submit" variant="primary" style={{ padding: "8px 14px" }}>
          {t("agentChat.askButton")}
        </Button>
      </form>
    </div>
  );
};
