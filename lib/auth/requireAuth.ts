import { createHash } from "node:crypto";
import { calculateJwkThumbprint, compactVerify, importJWK } from "jose";
import { verifyTideCloakToken } from "@tidecloak/nextjs/server";
import tidecloakConfig from "@/data/tidecloak.json";

export interface Session {
  sub: string;
  username: string;
  roles: string[];
}

type AuthCheck =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403; message: string };

const seenProofs = new Map<string, number>();

async function validDpopProof(request: Request, token: string, thumbprint: string): Promise<boolean> {
  const proof = request.headers.get("dpop");
  if (!proof) return false;
  try {
    const [headerPart] = proof.split(".");
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    if (header.typ !== "dpop+jwt" || header.alg !== "ES256" || !header.jwk ||
        ["d", "p", "q", "dp", "dq", "qi", "k"].some((field) => field in header.jwk)) return false;
    const key = await importJWK(header.jwk, "ES256");
    const { payload: bytes } = await compactVerify(proof, key, { algorithms: ["ES256"] });
    const claims = JSON.parse(Buffer.from(bytes).toString("utf8"));
    const url = new URL(request.url);
    const expectedHtu = `${url.origin}${url.pathname}`;
    const expectedAth = createHash("sha256").update(token).digest("base64url");
    const now = Math.floor(Date.now() / 1000);
    const jkt = await calculateJwkThumbprint(header.jwk, "sha256");
    if (jkt !== thumbprint || claims.htm !== request.method || claims.htu !== expectedHtu ||
        claims.ath !== expectedAth || typeof claims.jti !== "string" || !claims.jti ||
        typeof claims.iat !== "number" || Math.abs(now - claims.iat) > 60) return false;

    for (const [id, expires] of seenProofs) if (expires <= now) seenProofs.delete(id);
    const replayKey = `${jkt}:${claims.jti}`;
    if (seenProofs.has(replayKey)) return false;
    seenProofs.set(replayKey, now + 120);
    return true;
  } catch {
    return false;
  }
}

export async function requireAuth(request: Request, requiredRoles: string[] = []): Promise<AuthCheck> {
  const authorization = request.headers.get("authorization");
  const match = /^DPoP (\S+)$/.exec(authorization ?? "");
  if (!match) return { ok: false, status: 401, message: "A DPoP access token is required" };

  const token = match[1];
  const payload = await verifyTideCloakToken(tidecloakConfig, token);
  if (!payload || typeof payload.sub !== "string" || !payload.sub) {
    return { ok: false, status: 401, message: "Invalid TideCloak access token" };
  }
  const cnf = payload.cnf as { jkt?: unknown } | undefined;
  if (typeof cnf?.jkt !== "string" || !(await validDpopProof(request, token, cnf.jkt))) {
    return { ok: false, status: 401, message: "Invalid DPoP proof" };
  }

  const roles = payload.realm_access?.roles ?? [];
  if (!requiredRoles.every((role) => roles.includes(role))) {
    return { ok: false, status: 403, message: `Missing role: ${requiredRoles.join(", ")}` };
  }
  return {
    ok: true,
    session: {
      sub: payload.sub,
      username: typeof payload.preferred_username === "string" ? payload.preferred_username : payload.sub,
      roles,
    },
  };
}
