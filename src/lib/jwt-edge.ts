/**
 * Minimal HS256 JWT verify for Edge middleware (avoids jose Edge warnings).
 * Full auth still uses jose in Node server code.
 */

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

export type SoftJwtPayload = {
  sub: string;
  role: string;
  mustChangePassword: boolean;
};

export async function verifyHs256JwtSoft(
  token: string,
  secret: string
): Promise<SoftJwtPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
    const actual = base64UrlToBytes(sigB64);
    if (!timingSafeEqual(expected, actual)) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    if (typeof payload.exp === "number" && Date.now() / 1000 >= payload.exp) {
      return null;
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.mustChangePassword !== "boolean"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    };
  } catch {
    return null;
  }
}
