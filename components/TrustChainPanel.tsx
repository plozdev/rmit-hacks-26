"use client";

/**
 * TrustChainPanel — Visual explanation of the TideCloak trust architecture
 * Maps directly to PROJECT_CONTEXT.md §Trust boundaries
 */

export default function TrustChainPanel() {
  const boundaries = [
    {
      num: 1,
      icon: "🌐",
      bg: "rgba(0,196,167,0.12)",
      label: "Browser (Client)",
      status: "badge-tide",
      points: [
        "Tide login via Secure Web Enclave (SWE) — threshold PRISM, no server sees password",
        "selfencrypt: doEncrypt(plaintext) → ciphertext stays in browser until sent to API",
        "selfdecrypt: doDecrypt(ciphertext) → plaintext exists only here",
        "DPoP key pair generated in-browser; proofs attached by secureFetch()",
      ],
    },
    {
      num: 2,
      icon: "⚙️",
      bg: "rgba(59,130,246,0.12)",
      label: "Next.js API Routes (Server)",
      status: "badge-blue",
      points: [
        "Verifies Tide JWT signature using embedded JWK from adapter (local JWKS, no network call)",
        "Validates DPoP proof on every request (I-12 — lockstep requirement)",
        "Checks realm role in jwt.realm_access.roles before any data access",
        "Checks ownership: custodian.sub === caseRow.custodian",
        "Stores ONLY Tide ciphertext — never plaintext, never encryption keys",
      ],
    },
    {
      num: 3,
      icon: "🗄️",
      bg: "rgba(139,92,246,0.12)",
      label: "SQLite (app-data/gateway.sqlite)",
      status: "badge-ghost",
      points: [
        "case metadata, request purpose: stored in plaintext (not sensitive)",
        "evidence.ciphertext: Tide E2EE output — unreadable without user session + selfdecrypt role",
        "No TideCloak data stored here — that lives in TideCloak's H2 volume",
        "Separate from TideCloak's H2 volume — app data ≠ identity data",
      ],
    },
    {
      num: 4,
      icon: "🔐",
      bg: "rgba(245,158,11,0.12)",
      label: "TideCloak / QEA (localhost:8080)",
      status: "badge-amber",
      points: [
        "Controls identity (vuid), JWT signing (VVK — threshold across ORK network)",
        "Governed role changes: _tide_case001.selfdecrypt requires QEA quorum",
        "Admin A proposes role → pending (threshold 1 with 2 admins; 3 admins needed for threshold 2)",
        "Admin B independently approves → commits (no API shortcut, must use Tide Console)",
        "Master realm admin cannot substitute — only QEA-governed changes apply to custodian roles",
      ],
    },
    {
      num: 5,
      icon: "🌊",
      bg: "rgba(0,196,167,0.06)",
      label: "Tide Fabric (ORK Network)",
      status: "badge-tide",
      points: [
        "Provides threshold cryptography for authentication (PRISM) and JWT signing (VVK)",
        "selfencrypt/selfdecrypt bound to user's own identity — no cross-user sharing",
        "Keys never exist in whole form on any single node",
        "A compromised TideCloak server cannot forge tokens or decrypt evidence",
      ],
    },
  ];

  return (
    <div className="animate-in">
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-header">
          <div>
            <div className="card-title">🌊 TideCloak Trust Architecture</div>
            <div className="card-desc">
              Maps to PROJECT_CONTEXT.md §Trust boundaries — five layers, each enforcing a different property
            </div>
          </div>
          <a
            href="https://docs.tide.org/Core-Concepts/iga-workflow"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            Tide Docs ↗
          </a>
        </div>
      </div>

      <div className="trust-chain">
        {boundaries.map((b, i) => (
          <div key={b.num} className="trust-node">
            <div
              className="trust-icon"
              style={{ background: b.bg }}
            >
              {b.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  BOUNDARY {b.num}
                </span>
                <span className={`badge ${b.status}`}>{b.label}</span>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {b.points.map((p, j) => (
                  <li key={j} style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ color: "var(--tide-500)", flexShrink: 0, marginTop: "0.05rem" }}>›</span>
                    <span dangerouslySetInnerHTML={{ __html: p.replace(/_tide_case001\.\w+/g, m => `<code style="font-size:0.78em;color:var(--tide-400);background:rgba(0,196,167,0.08);padding:0.1em 0.3em;border-radius:3px">${m}</code>`) }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Key invariants */}
      <div className="card" style={{ marginTop: "1.25rem" }}>
        <div className="card-title" style={{ marginBottom: "1rem" }}>Key Security Invariants</div>
        <div className="grid-2">
          {[
            { icon: "✓", label: "No server-held plaintext", desc: "Server stores only Tide ciphertext. Decryption is browser-only." },
            { icon: "✓", label: "No approval shortcut", desc: "No API route grants roles. QEA requires Tide Console + quorum." },
            { icon: "✓", label: "Threshold JWT signing", desc: "Compromised TideCloak cannot forge tokens — VVK is distributed across ORKs." },
            { icon: "✓", label: "DPoP binding", desc: "Tokens are proof-of-possession; a stolen token cannot be replayed." },
            { icon: "✓", label: "Ownership enforcement", desc: "API checks custodian.sub === authenticated.sub on every evidence call." },
            { icon: "✓", label: "Same-user E2EE", desc: "selfencrypt/selfdecrypt is identity-bound. No cross-user key sharing in this scope." },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "0.75rem",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
            }}>
              <span style={{ color: "var(--green-500)", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: "0.83rem", fontWeight: 600, marginBottom: "0.2rem", color: "var(--text-primary)" }}>{item.label}</div>
                <div style={{ fontSize: "0.77rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Out of scope */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-title" style={{ marginBottom: "0.75rem" }}>Out of Scope (Future Work)</div>
        <div className="alert alert-info">
          <span className="alert-icon">ℹ</span>
          <div style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
            Per PROJECT_CONTEXT.md: Cross-user evidence sharing, time-limited warrants,
            per-field judicial scope, immutable app audit logs, and emergency overrides
            are <strong>not implemented</strong> and require separately verified policy/design.
            The MVP uses Tide Console for actual role changes and approval.
          </div>
        </div>
      </div>
    </div>
  );
}
