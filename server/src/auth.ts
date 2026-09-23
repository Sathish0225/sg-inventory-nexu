import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import { can, type Permission, type Role } from "@/lib/permissions";
import { prisma } from "./db";
import { AppError, forbidden } from "./errors";

export const SESSION_COOKIE = "inventrack_session";
const SESSION_HOURS = 12;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare module "fastify" {
  interface FastifyRequest {
    currentUser: SessionUser | null;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
  }
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Compared against when the email doesn't exist, so response time doesn't reveal valid accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
}

export async function startSession(app: FastifyInstance, reply: FastifyReply, user: SessionUser, secure: boolean) {
  const token = await reply.jwtSign({ sub: user.id }, { expiresIn: `${SESSION_HOURS}h` });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export const endSession = (reply: FastifyReply) => reply.clearCookie(SESSION_COOKIE, { path: "/" });

/**
 * Resolve the session cookie to a user on every request. The user row is re-read each time so
 * deactivating an account or changing a role takes effect immediately.
 */
export function registerSessionHook(app: FastifyInstance) {
  app.decorateRequest("currentUser", null);
  app.addHook("onRequest", async (request) => {
    request.currentUser = null;
    if (!request.cookies[SESSION_COOKIE]) return;
    try {
      const { sub } = await request.jwtVerify<{ sub: string }>({ onlyCookie: true });
      const user = await prisma.user.findUnique({ where: { id: sub } });
      if (user?.active) {
        request.currentUser = { id: user.id, email: user.email, name: user.name, role: user.role as Role };
      }
    } catch {
      // Expired or tampered token: treat as logged out.
    }
  });
}

export const requireUser = (request: FastifyRequest): SessionUser => {
  if (!request.currentUser) throw new AppError(401, "Please sign in.");
  return request.currentUser;
};

/** preHandler that requires a signed-in user holding every listed permission. */
export const guard =
  (...permissions: Permission[]): preHandlerAsyncHookHandler =>
  async (request) => {
    const user = requireUser(request);
    if (!permissions.every((p) => can(user.role, p))) throw forbidden();
  };
