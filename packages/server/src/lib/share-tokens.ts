import * as jose from "jose";
import { ONE_DAY_MS } from "./constants/timing";
import type {
  ShareTokenSignInput,
  SignedShareToken,
  VerifiedShareToken,
} from "./interfaces/share-tokens";

function shareTokenSecret(): Uint8Array | null {
  const secret = process.env.MONITOR_LINK_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

export function isShareTokenConfigured(): boolean {
  return shareTokenSecret() !== null;
}

export async function signShareToken({
  issuer,
  subjectGuid,
  orgId,
  version,
  expiresInDays,
  showsPrices,
}: ShareTokenSignInput): Promise<SignedShareToken> {
  const secret = shareTokenSecret();
  if (!secret) throw new Error("MONITOR_LINK_SECRET is not configured.");
  const expiresAt = new Date(Date.now() + expiresInDays * ONE_DAY_MS);
  const token = await new jose.SignJWT({ org: orgId, ver: version, prices: showsPrices })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setSubject(subjectGuid)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);
  return { token, expiresAt };
}

export async function verifyShareToken(
  issuer: string,
  token: string,
): Promise<VerifiedShareToken | null> {
  const secret = shareTokenSecret();
  if (!secret) return null;
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer,
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.org !== "string" ||
      typeof payload.ver !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return {
      subjectGuid: payload.sub,
      orgId: payload.org,
      version: payload.ver,
      expiresAt: new Date(payload.exp * 1000),
      showsPrices: payload.prices !== false,
    };
  } catch {
    return null;
  }
}
