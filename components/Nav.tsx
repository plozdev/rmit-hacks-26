"use client";

import { useSession } from "@/lib/auth/mockSession";

export default function Nav() {
  const { session, logout } = useSession();

  if (!session) return null;

  const isAdmin = session.roles.includes("tide-realm-admin");
  const canDecrypt = session.roles.includes("_tide_case001.selfdecrypt");

  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="nav-logo">PG</div>
        <div>
          <div className="nav-title">Proof/Gate</div>
          <div className="nav-subtitle">TideCloak Evidence Portal</div>
        </div>
      </div>

      <div className="nav-actions">
        {/* Role badges — reflect Tide JWT claims */}
        <div className="flex gap-2 flex-wrap" style={{ justifyContent: "flex-end" }}>
          {session.roles.map((role) => {
            let cls = "badge-ghost";
            if (role === "_tide_case001.selfencrypt") cls = "badge-tide";
            if (role === "_tide_case001.selfdecrypt") cls = "badge-green";
            if (role === "tide-realm-admin") cls = "badge-amber";
            return (
              <span key={role} className={`badge ${cls}`}>
                <span className="badge-dot" />
                {role.replace("_tide_case001.", "")}
              </span>
            );
          })}
        </div>

        <div style={{ height: "24px", width: "1px", background: "var(--border)", margin: "0 0.25rem" }} />

        {/* User identity — Tide vuid */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {session.username}
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              maxWidth: "180px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={`Tide vuid: ${session.sub}`}
          >
            {session.sub.slice(0, 16)}…
          </div>
        </div>

        <button
          id="nav-logout"
          className="btn btn-ghost btn-sm"
          onClick={logout}
          title="Sign out (simulated — real: TideCloakProvider.logout())"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
