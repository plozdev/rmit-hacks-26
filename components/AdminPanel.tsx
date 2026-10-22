"use client";

/**
 * AdminPanel — Visible only to tide-realm-admin role holders
 *
 * Shows all requests, explains QEA workflow, and links to Tide Console.
 * DOES NOT provide any role-grant API — that must go through QEA.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth/mockSession";

interface RequestRow {
  id: string;
  case_id: string;
  custodian: string;
  purpose: string;
  status: string;
  created_at: string;
}

export default function AdminPanel() {
  const { session, authFetch } = useSession();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = session?.roles.includes("tide-realm-admin");

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, isAdmin]);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) {
    return (
      <div className="alert alert-error animate-in">
        <span className="alert-icon">✗</span>
        <div>Access denied — this panel requires <code>tide-realm-admin</code> role.</div>
      </div>
    );
  }

  const qeaSteps = [
    {
      num: 1,
      title: "Custodian submits access request",
      desc: "Records intent/purpose in this app. Visible in Requests tab.",
      who: "Custodian",
    },
    {
      num: 2,
      title: "Admin A proposes role change in Tide Console",
      desc: "Go to Tide Admin Console → Realm: nextjs-test → Users → [custodian vuid] → Role Mappings → Add _tide_case001.selfdecrypt. This creates a QEA change request; it is NOT committed yet. Single admin = threshold 1, still pending.",
      who: "Admin A (Sam Rivera)",
    },
    {
      num: 3,
      title: "Three admins required for threshold ≥ 2",
      desc: "Tide's current QEA threshold is 1 with 2 admins. A third admin (Admin C) must be enrolled first. Then one approval stays pending and the second commits.",
      who: "Admin C (Enroll via Tide Console)",
    },
    {
      num: 4,
      title: "Admin B independently approves in Tide Console",
      desc: "Admin B goes to Tide Admin Panel → Pending Requests → Approve. This is independent — no coordination with Admin A. After both approvals, QEA commits the role.",
      who: "Admin B (Morgan Lee)",
    },
    {
      num: 5,
      title: "Custodian re-authenticates",
      desc: "The new role is in the next JWT. Custodian signs out and signs in again to get fresh token. The master realm cannot substitute — only QEA-governed Tide Console changes apply.",
      who: "Custodian (fresh sign-in)",
    },
    {
      num: 6,
      title: "Custodian unseals evidence",
      desc: "GET /api/cases/case-001/evidence now returns ciphertext. Browser calls doDecrypt() — plaintext never leaves the client.",
      who: "Custodian",
    },
  ];

  return (
    <div className="animate-in">
      {/* Admin identity */}
      <div className="alert alert-warn" style={{ marginBottom: "1.25rem" }}>
        <span className="alert-icon">🛡️</span>
        <div>
          Signed in as <strong>{session?.username}</strong> with{" "}
          <code>tide-realm-admin</code> role. You can view access requests and initiate
          role changes in <strong>Tide Console</strong>. You cannot approve your own
          proposals — a second independent admin is required (QEA quorum).
        </div>
      </div>

      {/* QEA Workflow */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-header">
          <div>
            <div className="card-title">🔐 QEA Role Grant Workflow</div>
            <div className="card-desc">
              How _tide_case001.selfdecrypt reaches the custodian's JWT
            </div>
          </div>
          <a
            href="https://docs.tide.org/Core-Concepts/iga-workflow"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            Tide QEA Docs ↗
          </a>
        </div>
        <div className="qea-steps">
          {qeaSteps.map((s) => (
            <div key={s.num} className="qea-step">
              <div className="qea-step-num">{s.num}</div>
              <div className="qea-step-body">
                <div className="qea-step-title">{s.title}</div>
                <div className="qea-step-desc">{s.desc}</div>
                <div style={{ marginTop: "0.25rem" }}>
                  <span className="badge badge-ghost" style={{ fontSize: "0.68rem" }}>
                    {s.who}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending requests */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">📋 Pending Access Requests</div>
            <div className="card-desc">All requests from all custodians</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            <span className="spinner" style={{ width: 20, height: 20 }} />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No requests submitted yet.
          </div>
        )}

        {requests.map((r) => (
          <div key={r.id} style={{ marginBottom: "1rem", padding: "1rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{r.case_id}</span>
                <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                  · {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <span className={`badge ${r.status === "approved" ? "badge-green" : r.status === "denied" ? "badge-red" : "badge-amber"}`}>
                {r.status}
              </span>
            </div>

            <div style={{ fontSize: "0.85rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Purpose</strong>
              <div style={{ marginTop: "0.25rem" }}>{r.purpose}</div>
            </div>

            <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              custodian vuid: {r.custodian}
            </div>

            <div className="alert alert-info" style={{ fontSize: "0.78rem" }}>
              <span className="alert-icon">🛡️</span>
              <div>
                To grant <code>_tide_case001.selfdecrypt</code>: open{" "}
                <strong>Tide Console</strong> at{" "}
                <code>localhost:8080/admin/nextjs-test/console</code> → Users →{" "}
                <code>{r.custodian.slice(0, 12)}…</code> → Role Mappings → Add role.
                <br />
                <strong>No shortcut exists here</strong> — QEA is enforced by Tide's
                threshold cryptography. A stolen API credential cannot approve role changes.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
