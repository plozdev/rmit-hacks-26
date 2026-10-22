/**
 * POST /api/requests  — Custodian submits an access request
 * GET  /api/requests  — Custodian sees own requests; admin sees all
 *
 * TideCloak integration:
 *   Auth: Tide JWT + DPoP (any authenticated user)
 *
 * IMPORTANT: This access request row is app-level context information.
 * It is NOT a QEA change request. The actual QEA change request is submitted
 * by an admin in the Tide Console (Tide Admin Panel), not by this app.
 *
 * The flow is:
 *   1. Custodian uses this endpoint to record intent and purpose
 *   2. Admin reviews the request in this app's admin panel (GET /api/requests)
 *   3. Admin goes to Tide Console to propose/approve the selfdecrypt role change
 *   4. After QEA quorum, the custodian's next JWT contains selfdecrypt
 *   5. Custodian re-signs in to get fresh token, then GET /api/cases/[id]/evidence succeeds
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth/requireAuth";
import { listRequests, createRequest, getCaseById } from "@/lib/db/database";

// ── GET /api/requests ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req.headers.get("authorization"));

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  // Admins see all; custodians see only their own
  const isAdmin = auth.session.roles.includes("tide-realm-admin");
  const requests = isAdmin
    ? listRequests()
    : listRequests(auth.session.sub);

  return NextResponse.json({ requests });
}

// ── POST /api/requests ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req.headers.get("authorization"));

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: { caseId?: string; purpose?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { caseId, purpose } = body;

  if (!caseId || !purpose) {
    return NextResponse.json(
      { error: "Missing required fields: caseId, purpose" },
      { status: 400 }
    );
  }

  // Verify case exists and is sealed (no point requesting if not sealed)
  const caseRow = getCaseById(caseId);
  if (!caseRow) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (caseRow.sealed !== 1) {
    return NextResponse.json(
      { error: "Evidence is not yet sealed — seal it first" },
      { status: 409 }
    );
  }

  // Custodian must own the case
  if (auth.session.sub !== caseRow.custodian) {
    return NextResponse.json(
      { error: "Forbidden — you are not the custodian of this case" },
      { status: 403 }
    );
  }

  const request = createRequest(
    randomUUID(),
    caseId,
    auth.session.sub,
    purpose.slice(0, 500) // cap length
  );

  return NextResponse.json({
    ok: true,
    request,
    note: "This records your intent. An admin must submit the actual role change via Tide Console (QEA). Your new role will appear after signing in again once the quorum approves.",
  });
}
