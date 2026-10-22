"use client";

/**
 * CasePanel — Evidence management for case-001
 *
 * TideCloak integration points:
 *
 * SEAL (PUT /api/cases/case-001/evidence):
 *   - Real: call doEncrypt(plaintext) from @tidecloak/nextjs (browser-side)
 *     The SDK sends plaintext to Tide's threshold encryption service
 *     Only ciphertext leaves the browser → stored in SQLite
 *   - Simulated: we fake the ciphertext with a base64 "stub"
 *
 * UNSEAL (GET /api/cases/case-001/evidence):
 *   - Requires _tide_case001.selfdecrypt role in JWT
 *   - Role only present after QEA quorum (Admin A proposes, Admin B approves)
 *   - Real: call doDecrypt(ciphertext) from @tidecloak/nextjs
 *   - Simulated: we reverse the fake cipher
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth/mockSession";

const SAMPLE_EVIDENCE = `SYNTHETIC EVIDENCE RECORD — case-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: 2026-10-22  |  Classification: SYNTHETIC / DEMO ONLY
Custodian: Alex Chen (Evidence Custodian)

INCIDENT SUMMARY
On the morning of 22 October 2026, a simulated intrusion event was
recorded against network segment 192.168.14.0/24. This record is
entirely synthetic and contains no real personal or investigative data.

ARTEFACTS
  - Network packet capture (synthetic): 14,832 frames
  - System log excerpt (synthetic): 847 lines
  - Digital signature verification: PASSED (simulated)

CHAIN OF CUSTODY
  Received by:   Alex Chen — 2026-10-22T09:14:00Z
  Sealed by:     Alex Chen — (timestamp of this sealing)
  Encrypted with: Tide E2EE selfencrypt (threshold cryptography)

NOTE: All identifiers, timestamps, and data in this record are
fabricated for demonstration. This is Challenge 2, Tide UNLOCKED.`;

interface CaseData {
  id: string;
  title: string;
  description: string;
  sealed: boolean;
}

// Simulates doEncrypt from @tidecloak/nextjs
function simulateEncrypt(plaintext: string, sub: string): string {
  const payload = JSON.stringify({ plaintext, sub, ts: Date.now() });
  return `tide_ciphertext_sim::${btoa(payload)}`;
}

// Simulates doDecrypt from @tidecloak/nextjs
function simulateDecrypt(ciphertext: string): string {
  try {
    if (!ciphertext.startsWith("tide_ciphertext_sim::")) {
      throw new Error("Not a simulated Tide ciphertext");
    }
    const payload = JSON.parse(atob(ciphertext.replace("tide_ciphertext_sim::", "")));
    return payload.plaintext;
  } catch {
    return "[Decryption failed — not a valid simulated ciphertext]";
  }
}

export default function CasePanel() {
  const { session, authFetch } = useSession();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "info" | "success" | "error" | "warn"; text: string } | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [rawCiphertext, setRawCiphertext] = useState<string | null>(null);
  const [step, setStep] = useState<number>(0);

  const canEncrypt = session?.roles.includes("_tide_case001.selfencrypt");
  const canDecrypt = session?.roles.includes("_tide_case001.selfdecrypt");
  const isAdmin = session?.roles.includes("tide-realm-admin");

  const loadCase = useCallback(async () => {
    try {
      const res = await authFetch("/api/cases");
      const data = await res.json();
      if (data.cases?.length) {
        const c = data.cases[0];
        setCaseData(c);
        if (c.sealed) setStep(1);
      }
    } catch {}
  }, [authFetch]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  async function handleSeal() {
    if (!session) return;
    setLoading(true);
    setMessage(null);
    try {
      // Simulate doEncrypt() — in production: const ciphertext = await doEncrypt(SAMPLE_EVIDENCE);
      const ciphertext = simulateEncrypt(SAMPLE_EVIDENCE, session.sub);

      const res = await authFetch("/api/cases/case-001/evidence", {
        method: "PUT",
        body: JSON.stringify({ ciphertext }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to seal evidence" });
        return;
      }

      setMessage({
        type: "success",
        text: "Evidence sealed ✓ — Tide ciphertext stored. Server never saw plaintext.",
      });
      setRawCiphertext(ciphertext);
      setStep(1);
      loadCase();
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleUnseal() {
    if (!session) return;
    setLoading(true);
    setMessage(null);
    setDecryptedText(null);
    try {
      const res = await authFetch("/api/cases/case-001/evidence");
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setMessage({
            type: "error",
            text: `403 Forbidden — ${data.error}. Your JWT lacks _tide_case001.selfdecrypt. This role only appears after QEA quorum.`,
          });
        } else {
          setMessage({ type: "error", text: data.error || "Failed" });
        }
        return;
      }

      setRawCiphertext(data.ciphertext);
      // Simulate doDecrypt() — in production: const plain = await doDecrypt(data.ciphertext);
      const plaintext = simulateDecrypt(data.ciphertext);
      setDecryptedText(plaintext);
      setStep(2);
      setMessage({
        type: "success",
        text: "Evidence unsealed ✓ — Tide doDecrypt() ran in-browser. Server returned only ciphertext.",
      });
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
    } finally {
      setLoading(false);
    }
  }

  const demoSteps = [
    { label: "Seal evidence", done: step >= 1 },
    { label: "Request decrypt access", done: false },
    { label: "Admin proposes role (Tide Console)", done: false },
    { label: "Admin B approves — QEA commits", done: false },
    { label: "Re-sign in with fresh JWT", done: canDecrypt === true },
    { label: "Unseal evidence", done: step >= 2 },
  ];

  return (
    <div className="animate-in">
      {/* Demo progress */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Demo Success Criteria</div>
            <div className="card-desc">PROJECT_CONTEXT.md §Demo success criteria</div>
          </div>
          <span className={`badge ${step >= 2 ? "badge-green" : "badge-ghost"}`}>
            Step {step}/2 complete
          </span>
        </div>
        <div className="qea-steps">
          {demoSteps.map((s, i) => (
            <div
              key={i}
              className={`qea-step ${s.done ? "done" : i === (step === 0 ? 0 : step === 1 && !canDecrypt ? 1 : step === 1 && canDecrypt ? 4 : 5) ? "active" : ""}`}
            >
              <div className="qea-step-num">{s.done ? "✓" : i + 1}</div>
              <div className="qea-step-body">
                <div className="qea-step-title">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main case card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              {caseData ? caseData.title : "Loading…"}
            </div>
            <div className="card-desc">
              {caseData?.description || ""}
            </div>
          </div>
          <div>
            <span className={`badge ${caseData?.sealed ? "badge-amber" : "badge-ghost"}`}>
              <span className="badge-dot" />
              {caseData?.sealed ? "Sealed" : "Unsealed"}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`alert alert-${message.type === "success" ? "success" : message.type === "warn" ? "warn" : message.type === "info" ? "info" : "error"}`} style={{ marginBottom: "1rem" }}>
            <span className="alert-icon">
              {message.type === "success" ? "✓" : message.type === "warn" ? "⚠" : message.type === "info" ? "ℹ" : "✗"}
            </span>
            <div>{message.text}</div>
          </div>
        )}

        <hr className="divider" />

        {/* Seal section */}
        {canEncrypt && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div className="section-header">
              <div>
                <div className="section-title" style={{ fontSize: "0.95rem" }}>🔒 Seal Evidence</div>
                <div className="section-sub">
                  Encrypts with Tide selfencrypt (threshold E2EE) · Server stores ciphertext only
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "0.4rem" }}>
                SAMPLE EVIDENCE RECORD (synthetic — will be encrypted)
              </label>
              <div className="code-block" style={{ maxHeight: "140px" }}>
                {SAMPLE_EVIDENCE}
              </div>
            </div>

            <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
              <span className="alert-icon">ℹ</span>
              <div>
                <strong>E2EE boundary:</strong> In production, <code>doEncrypt()</code> from{" "}
                <code>@tidecloak/nextjs</code> runs in-browser. Only ciphertext reaches the API.
                The server has no key and never sees plaintext.
              </div>
            </div>

            <button
              id="btn-seal"
              className="btn btn-primary"
              onClick={handleSeal}
              disabled={loading || caseData?.sealed === true}
            >
              {loading ? <><span className="spinner" /> Sealing…</> : "🔒 Seal Evidence"}
            </button>

            {caseData?.sealed && (
              <span className="text-muted text-sm" style={{ marginLeft: "0.75rem" }}>
                Already sealed — cannot overwrite
              </span>
            )}
          </div>
        )}

        {/* Unseal section */}
        <div>
          <div className="section-header">
            <div>
              <div className="section-title" style={{ fontSize: "0.95rem" }}>🔓 Unseal Evidence</div>
              <div className="section-sub">
                Requires <code>_tide_case001.selfdecrypt</code> role · QEA-gated via Tide Console
              </div>
            </div>
            {canDecrypt ? (
              <span className="badge badge-green"><span className="badge-dot" /> Role present</span>
            ) : (
              <span className="badge badge-ghost">Role absent — QEA required</span>
            )}
          </div>

          {!canDecrypt && (
            <div className="alert alert-warn" style={{ marginBottom: "1rem" }}>
              <span className="alert-icon">🔐</span>
              <div>
                <strong>QEA gate:</strong> Your current JWT does not contain{" "}
                <code>_tide_case001.selfdecrypt</code>. An admin must propose this role in the{" "}
                Tide Console and a second independent admin must approve. Only then does your
                next sign-in carry the role. Switch to the <em>post-QEA custodian</em> persona
                to simulate this state.
              </div>
            </div>
          )}

          <button
            id="btn-unseal"
            className="btn btn-secondary"
            onClick={handleUnseal}
            disabled={loading || !caseData?.sealed}
            style={{ marginBottom: decryptedText ? "1rem" : 0 }}
          >
            {loading ? <><span className="spinner" /> Unsealing…</> : "🔓 Unseal Evidence"}
          </button>

          {!caseData?.sealed && (
            <span className="text-muted text-sm" style={{ marginLeft: "0.75rem" }}>
              Seal evidence first
            </span>
          )}

          {decryptedText && (
            <div style={{ marginTop: "1rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "0.4rem" }}>
                DECRYPTED PLAINTEXT (browser-side via Tide doDecrypt)
              </label>
              <div className="code-block animate-in" style={{ color: "var(--green-500)" }}>
                {decryptedText}
              </div>
            </div>
          )}
        </div>

        {/* Ciphertext inspector */}
        {rawCiphertext && (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="token-debug">
              <div className="token-debug-header">
                <span>SQLite evidence.ciphertext (Tide E2EE output)</span>
                <span className="badge badge-tide">Server-stored</span>
              </div>
              <div className="token-debug-body">
                <span className="token-str">{rawCiphertext}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role debug */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="token-debug">
          <div className="token-debug-header">
            <span>Simulated JWT payload (realm_access.roles)</span>
            <span className="badge badge-ghost">mock token</span>
          </div>
          <div className="token-debug-body" style={{ lineHeight: 2 }}>
            <span className="token-key">sub</span>:{" "}
            <span className="token-str">&quot;{session?.sub}&quot;</span>
            <br />
            <span className="token-key">realm_access.roles</span>:{" "}
            <span className="token-str">[{session?.roles.map(r => `"${r}"`).join(", ")}]</span>
            <br />
            <span className="token-key">azp</span>:{" "}
            <span className="token-str">&quot;myclient&quot;</span>
            <br />
            <span className="token-key">iss</span>:{" "}
            <span className="token-str">&quot;http://localhost:8080/realms/nextjs-test&quot;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
