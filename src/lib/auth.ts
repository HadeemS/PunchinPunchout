import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Role, type User } from "@prisma/client";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "timeclock_session";
const BCRYPT_COST = 12;
const EMPLOYEE_SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours
const ADMIN_INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 hours inactivity

export type SessionPayload = {
  sub: string;
  username: string;
  role: Role;
  fullName: string;
  sessionVersion: number;
  mustChangePassword: boolean;
  lastActivity: number;
};

function getSessionSecret(): Uint8Array {
  // Lazy import keeps edge-free Node path; env validated at startup via instrumentation
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters. Refusing to start."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(
  user: Pick<
    User,
    | "id"
    | "username"
    | "role"
    | "fullName"
    | "sessionVersion"
    | "mustChangePassword"
  >
): Promise<void> {
  const now = Date.now();
  const maxAge =
    user.role === Role.ADMIN ? ADMIN_INACTIVITY_MS : EMPLOYEE_SESSION_MS;

  const token = await new SignJWT({
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
    lastActivity: now,
  } satisfies Omit<SessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(
      user.role === Role.ADMIN
        ? `${ADMIN_INACTIVITY_MS / 1000}s`
        : `${EMPLOYEE_SESSION_MS / 1000}s`
    )
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(maxAge / 1000),
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.fullName !== "string" ||
      typeof payload.sessionVersion !== "number" ||
      typeof payload.mustChangePassword !== "boolean" ||
      typeof payload.lastActivity !== "number"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role as Role,
      fullName: payload.fullName,
      sessionVersion: payload.sessionVersion,
      mustChangePassword: payload.mustChangePassword,
      lastActivity: payload.lastActivity,
    };
  } catch {
    return null;
  }
}

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  sessionVersion: number;
  mustChangePassword: boolean;
  active: boolean;
};

export async function getSessionUser(): Promise<AuthUser | null> {
  const token = await readSessionToken();
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  // Admin inactivity: reject if last activity > 8h ago.
  // Do not mutate cookies here — getSessionUser runs from Server Components.
  if (session.role === Role.ADMIN) {
    if (Date.now() - session.lastActivity > ADMIN_INACTIVITY_MS) {
      return null;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      sessionVersion: true,
      mustChangePassword: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    return null;
  }

  if (user.sessionVersion !== session.sessionVersion) {
    return null;
  }

  return user;
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    redirect("/clock");
  }
  return user;
}

export function generateTempPassword(length = 12): string {
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  // Ensure at least one letter and one number
  if (!/[a-zA-Z]/.test(result) || !/[0-9]/.test(result)) {
    return generateTempPassword(length);
  }
  return result;
}

export { COOKIE_NAME, EMPLOYEE_SESSION_MS, ADMIN_INACTIVITY_MS };
