import React, { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardBody } from "./ui/Card";
import { useTranslation } from "react-i18next";

interface LoginProps {
  onLoginSuccess: (token: string, username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.token, data.username);
      } else {
        const txt = await res.text();
        setError(txt || "Login failed. Please check credentials.");
      }
    } catch (e) {
      console.error(e);
      setError("Could not connect to authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        background: "radial-gradient(circle at center, #10121d 0%, #07080c 100%)",
        padding: "20px",
      }}
    >
      <Card
        glow="cyan"
        glassmorphism={true}
        style={{
          width: "400px",
          borderRadius: "12px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <CardBody style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "40px" }}>🛡️</span>
            <h1 className="logo-text" style={{ fontSize: "28px", margin: 0, fontWeight: 700 }}>
              {t("login.platformTitle")}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {t("login.accessWorkspace")}
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "var(--accent-red-bg)",
                color: "var(--accent-red)",
                border: "1px solid rgba(255, 23, 68, 0.2)",
                padding: "10px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Input
              id="username"
              label={t("login.usernameLabel")}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("login.usernamePlaceholder")}
              required
              autoFocus
            />

            <Input
              id="password"
              label={t("login.passwordLabel")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              style={{ marginTop: "8px", width: "100%" }}
            >
              {t("login.signInButton")}
            </Button>
          </form>

          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "16px",
            }}
          >
            {t("login.tagline")}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
