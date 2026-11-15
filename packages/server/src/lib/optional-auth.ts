import type { RequestTokenVerifier } from "./interfaces/auth";

export function bearerTokenFromHeader(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function optionalVerifiedUserId(
  authorizationHeader: string | undefined,
  verifyRequestToken: RequestTokenVerifier,
): Promise<string | null> {
  const token = bearerTokenFromHeader(authorizationHeader);
  if (!token) return null;
  try {
    const payload = await verifyRequestToken(token);
    return payload?.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
