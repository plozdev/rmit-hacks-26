"use client";

import { useSession, PERSONAS } from "@/lib/auth/mockSession";

const PERSONA_CONFIG = [
  {
    key: "custodian",
    icon: "👤",
    bg: "rgba(0,196,167,0.1)",
    name: "Alex Chen",
    subtitle: "Evidence Custodian",
    roles: "_tide_case001.selfencrypt · appUser",
    description: "Can seal evidence. Cannot unseal until QEA grants decrypt.",
  },
  {
    key: "custodian_with_decrypt",
    icon: "🔓",
    bg: "rgba(59,130,246,0.1)",
    name: "Alex Chen — post-QEA",
    subtitle: "Evidence Custodian (after role change)",
    roles: "_tide_case001.selfencrypt · _tide_case001.selfdecrypt",
    description: "Same account after Admin A + B approved the role change via Tide QEA.",
  },
  {
    key: "admin_a",
    icon: "🛡️",
    bg: "rgba(245,158,11,0.1)",
    name: "Sam Rivera",
    subtitle: "Admin A — tide-realm-admin",
    roles: "tide-realm-admin · offline_access",
    description: "Proposes role change. First approval leaves QEA pending.",
  },
  {
    key: "admin_b",
    icon: "🛡️",
    bg: "rgba(245,158,11,0.1)",
    name: "Morgan Lee",
    subtitle: "Admin B — tide-realm-admin",
    roles: "tide-realm-admin · offline_access",
    description: "Independent approver. Second approval commits the role change.",
  },
];

export default function LoginScreen() {
  const { login } = useSession();

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">🌊</div>
        <h1 className="login-title">Proof/Gate</h1>
        <p className="login-sub">
          Cryptographic evidence custody protected by TideCloak.<br />
          Role changes require independent QEA quorum approval.
        </p>

        {/* Tide integration note */}
        <div className="alert alert-warn" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon">⚠</span>
          <div>
            <strong>Simulation mode</strong> — TideCloak not running.<br />
            In production, this button redirects to the Tide Secure Web Enclave (SWE)
            at <code>localhost:8080</code> for threshold authentication.
          </div>
        </div>

        {/* 
          PRODUCTION:
          <button onClick={() => login()}>Sign in with TideCloak</button>
          where login() comes from useTideCloak() hook.
          
          The SWE handles password hashing with threshold cryptography —
          the server never sees the password, and no single node can authenticate.
        */}
        <div style={{ marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.5rem", fontFamily: "var(--font-mono)" }}>
            SELECT PERSONA TO SIMULATE SIGN-IN:
          </p>
          <div className="persona-list">
            {PERSONA_CONFIG.map((p) => (
              <button
                key={p.key}
                id={`login-${p.key}`}
                className="persona-btn"
                onClick={() => login(p.key)}
              >
                <div
                  className="persona-icon"
                  style={{ background: p.bg }}
                >
                  {p.icon}
                </div>
                <div>
                  <div className="persona-name">{p.name}</div>
                  <div className="persona-roles">{p.roles}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Trust model:</strong> Tide JWT is threshold-signed across the ORK network.
          No single node can forge a token or extract keys. Role changes require QEA quorum —
          Admin A alone leaves it pending; Admin B commits it.
        </div>
      </div>
    </div>
  );
}
