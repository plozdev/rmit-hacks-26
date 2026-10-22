"use client";

/**
 * RequestsPanel — Submit and view access requests
 *
 * TideCloak integration:
 *   - POST /api/requests records purpose; admin reviews here
 *   - The actual QEA role change is SEPARATE — done in Tide Console
 *   - This panel's "submit" is NOT the QEA change request
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

export default function RequestsPanel() {
  const { session, authFetch } = useSession();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = session?.roles.includes("tide-realm-admin");
  const canEncrypt = session?.roles.includes("_tide_case001.selfencrypt");

  const load = useCallback(async () => {
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
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({ caseId: "case-001", purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed" });
        return;
      }
      setMessage({ type: "success", text: data.note || "Request submitted" });
      setPurpose("");
      load();
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-in">
      {/* Submit form (custodians only) */}
      {canEncrypt && !isAdmin && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-header">
            <div>
              <div className="card-title">📋 Request Decrypt Access</div>
              <div className="card-desc">
                Records your intent and purpose. An admin must separately submit the role
                change via Tide Console for QEA governance.
              </div>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
            <span className="alert-icon">ℹ</span>
            <div>
              <strong>Important:</strong> This form creates an app-level record.{" "}
              The actual <code>_tide_case001.selfdecrypt</code> role grant is a separate
              QEA change request submitted in the Tide Admin Console. Only after Admin A
              proposes AND Admin B independently approves does the role appear in your JWT.
            </div>
          </div>

          {message && (
            <div className={`alert alert-${message.type === "success" ? "success" : "error"}`} style={{ marginBottom: "1rem" }}>
              <span className="alert-icon">{message.type === "success" ? "✓" : "✗"}</span>
              <div>{message.text}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="purpose-input">Purpose / Justification</label>
              <textarea
                id="purpose-input"
                className="textarea"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="State the operational reason for requesting decrypt access to this evidence record…"
                required
                maxLength={500}
              />
            </div>
            <button
              type="submit"
              id="btn-submit-request"
              className="btn btn-primary"
              disabled={submitting || !purpose.trim()}
            >
              {submitting ? <><span className="spinner" /> Submitting…</> : "📋 Submit Request"}
            </button>
          </form>
        </div>
      )}

      {/* Request list */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              {isAdmin ? "All Access Requests" : "Your Requests"}
            </div>
            <div className="card-desc">
              {isAdmin
                ? "Admins see all requests — use Tide Console to action role changes"
                : "Requests you have submitted for this portal"}
            </div>
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
            No requests yet.
            {!isAdmin && canEncrypt && " Seal the evidence and submit a request above."}
          </div>
        )}

        {requests.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: "0.75rem", background: "var(--bg-surface)" }}>
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: "0.5rem" }}>
              <div>
                <span className="mono text-sm" style={{ color: "var(--text-secondary)" }}>
                  {r.case_id}
                </span>
              </div>
              <span className={`badge ${r.status === "approved" ? "badge-green" : r.status === "denied" ? "badge-red" : "badge-ghost"}`}>
                {r.status}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem", lineHeight: 1.5 }}>
              {r.purpose}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {isAdmin && <span>custodian: {r.custodian.slice(0, 16)}… · </span>}
              {new Date(r.created_at).toLocaleString()}
            </div>

            {isAdmin && r.status === "pending" && (
              <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                <div className="alert alert-info" style={{ marginBottom: "0.5rem" }}>
                  <span className="alert-icon">🛡️</span>
                  <div style={{ fontSize: "0.78rem" }}>
                    To grant <code>_tide_case001.selfdecrypt</code>: go to <strong>Tide Console</strong>{" "}
                    → Users → {r.custodian.slice(0, 8)}… → Role Mappings → Add Role → Submit.
                    A second admin must then approve in the Tide Admin Panel.
                    No API shortcut exists — QEA is enforced by Tide's threshold cryptography.
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
