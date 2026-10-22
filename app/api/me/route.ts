/**
 * GET /api/me
 * ─────────────
 * Returns the verified subject (vuid) and current realm roles.
 *
 * TideCloak integration:
 *   Auth: Tide JWT + DPoP proof (simulated via mock token in dev)
 *   Real: secureFetch() on the client sends DPoP-bound Authorization header;
 *         requireAuth() verifies with verifyTideCloakToken() using embedded JWK.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req.headers.get("authorization"));

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { session } = auth;

  return NextResponse.json({
    sub: session.sub,
    username: session.username,
    roles: session.roles,
    // Flags used by the client to determine which UI sections to show
    canEncrypt: session.roles.includes("_tide_case001.selfencrypt"),
    canDecrypt: session.roles.includes("_tide_case001.selfdecrypt"),
    isAdmin: session.roles.includes("tide-realm-admin"),
  });
}
