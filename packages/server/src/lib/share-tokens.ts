import * as jose from "jose";
import type {
  RevocableShareTokenSignInput,
  ShareTokenSignInput,
  VerifiedRevocableShareToken,
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
  linkGuid,
  subjectGuid,
  orgId,
  version,
  issuedAt,
  expiresAt,
  showsPrices,
  purpose,
}: ShareTokenSignInput): Promise<string> {
  const secret = shareTokenSecret();
  if (!secret) throw new Error("MONITOR_LINK_SECRET is not configured.");
  return new jose.SignJWT({
    org: orgId,
    ver: version,
    prices: showsPrices,
    ...(purpose === "trade" ? { purpose } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setSubject(subjectGuid)
    .setJti(linkGuid)
    .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);
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
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      return null;
    }
    return {
      subjectGuid: payload.sub,
      orgId: payload.org,
      version: payload.ver,
      expiresAt: new Date(payload.exp * 1000),
      issuedAt: new Date(payload.iat * 1000),
      showsPrices: payload.prices !== false,
      purpose: payload.purpose === "trade" ? "trade" : "view",
      linkGuid: typeof payload.jti === "string" ? payload.jti : null,
    };
  } catch {
    return null;
  }
}

export async function signRevocableShareToken({
  issuer,
  subjectGuid,
  orgId,
  version,
}: RevocableShareTokenSignInput): Promise<string> {
  const secret = shareTokenSecret();
  if (!secret) throw new Error("MONITOR_LINK_SECRET is not configured.");
  return new jose.SignJWT({ org: orgId, ver: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setSubject(subjectGuid)
    .sign(secret);
}

export async function verifyRevocableShareToken(
  issuer: string,
  token: string,
): Promise<VerifiedRevocableShareToken | null> {
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
      typeof payload.ver !== "number"
    ) {
      return null;
    }
    return {
      subjectGuid: payload.sub,
      orgId: payload.org,
      version: payload.ver,
    };
  } catch {
    return null;
  }
}
