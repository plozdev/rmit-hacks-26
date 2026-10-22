/**
 * GET /api/cases
 * ───────────────
 * Returns synthetic case metadata plus `sealed` flag.
 *
 * TideCloak integration:
 *   Auth: Tide JWT + DPoP (any authenticated user with appUser role)
 *   The ciphertext is NOT returned here — only metadata.
 *   Evidence ciphertext is fetched by GET /api/cases/[id]/evidence separately.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { listCases } from "@/lib/db/database";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req.headers.get("authorization"));

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const cases = listCases().map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    sealed: c.sealed === 1,
    // Only reveal custodian vuid to admins or the custodian themselves
    custodian:
      auth.session.roles.includes("tide-realm-admin") ||
      auth.session.sub === c.custodian
        ? c.custodian
        : "[redacted]",
    created_at: c.created_at,
  }));

  return NextResponse.json({ cases });
}
