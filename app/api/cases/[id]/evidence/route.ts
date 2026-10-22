/**
 * PUT  /api/cases/[id]/evidence  — Save Tide-encrypted ciphertext (once only)
 * GET  /api/cases/[id]/evidence  — Return ciphertext for browser-side decryption
 *
 * TideCloak integration:
 *   PUT: requires _tide_case001.selfencrypt role (user sealed evidence in browser)
 *   GET: requires _tide_case001.selfdecrypt role (QEA-gated — only works after quorum)
 *
 * Trust boundary:
 *   - The server stores ONLY Tide ciphertext produced by doEncrypt() in the browser.
 *   - Decryption happens in the browser via doDecrypt() using the user's Tide session.
 *   - The server never holds the plaintext or the encryption key.
 *   - The GET route returns ciphertext only — the browser calls doDecrypt() locally.
 *
 * QEA enforcement:
 *   - The selfdecrypt role appears in the JWT only AFTER Admin A proposes and Admin B
 *     approves the role change in the Tide Console. There is no server-side shortcut.
 *   - The mock simulates this: the `custodian_with_decrypt` mock token carries the role.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getCaseById, getEvidence, saveEvidence } from "@/lib/db/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── GET /api/cases/[id]/evidence ─────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Requires decrypt role — only present after QEA quorum
  const auth = await requireAuth(req.headers.get("authorization"), [
    "_tide_case001.selfdecrypt",
  ]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  // Ownership check: custodian can only read their own case
  const caseRow = getCaseById(id);
  if (!caseRow) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (
    auth.session.sub !== caseRow.custodian &&
    !auth.session.roles.includes("tide-realm-admin")
  ) {
    return NextResponse.json({ error: "Forbidden — not your case" }, { status: 403 });
  }

  const evidence = getEvidence(id);
  if (!evidence) {
    return NextResponse.json({ error: "No evidence sealed yet" }, { status: 404 });
  }

  // Return ciphertext — client calls doDecrypt() from @tidecloak/nextjs
  return NextResponse.json({
    case_id: id,
    ciphertext: evidence.ciphertext,
    sealed_at: evidence.sealed_at,
    // Hint: client must call doDecrypt(ciphertext) from the Tide SDK
    decryption: "browser-side via Tide doDecrypt()",
  });
}

// ── PUT /api/cases/[id]/evidence ─────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Requires encrypt role
  const auth = await requireAuth(req.headers.get("authorization"), [
    "_tide_case001.selfencrypt",
  ]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  // Ownership check
  const caseRow = getCaseById(id);
  if (!caseRow) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (auth.session.sub !== caseRow.custodian) {
    return NextResponse.json({ error: "Forbidden — not your case" }, { status: 403 });
  }

  // Cannot re-seal already sealed evidence
  if (caseRow.sealed === 1) {
    return NextResponse.json(
      { error: "Evidence already sealed — cannot overwrite" },
      { status: 409 }
    );
  }

  let body: { ciphertext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.ciphertext || typeof body.ciphertext !== "string") {
    return NextResponse.json({ error: "Missing ciphertext field" }, { status: 400 });
  }

  // Save Tide ciphertext — server never decrypts this
  saveEvidence(id, body.ciphertext);

  return NextResponse.json({
    ok: true,
    case_id: id,
    sealed: true,
    message: "Evidence sealed — ciphertext stored, plaintext never reaches server",
  });
}
