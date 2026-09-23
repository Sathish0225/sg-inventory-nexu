import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import { can, type Permission, type Role } from "@/lib/permissions";
import { prisma } from "./db";
import { AppError, forbidden } from "./errors";

export const SESSION_COOKIE = "inventrack_session";
const SESSION_HOURS = 12;
/** Mobile / desktop apps keep technicians signed in longer; revocation still works via tokenVersion. */
const APP_TOKEN_DAYS = 30;

interface TokenPayload {
  sub: string;
  /** User.tokenVersion when issued; any bump revokes the token. */
  v: number;
}

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
    payload: TokenPayload;
  }
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Compared against when the email doesn't exist, so response time doesn't reveal valid accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function authenticate(email: string, password: string): Promise<(SessionUser & { tokenVersion: number }) | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role as Role, tokenVersion: user.tokenVersion };
}

/** Browser session: token in an httpOnly cookie. */
export async function startSession(
  app: FastifyInstance,
  reply: FastifyReply,
  user: { id: string; tokenVersion: number },
  secure: boolean,
) {
  const token = await reply.jwtSign({ sub: user.id, v: user.tokenVersion }, { expiresIn: `${SESSION_HOURS}h` });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export const endSession = (reply: FastifyReply) => reply.clearCookie(SESSION_COOKIE, { path: "/" });

/** Mobile / desktop app: bearer token the app keeps in secure storage and sends as Authorization. */
export const issueAppToken = (app: FastifyInstance, user: { id: string; tokenVersion: number }) =>
  app.jwt.sign({ sub: user.id, v: user.tokenVersion }, { expiresIn: `${APP_TOKEN_DAYS}d` });

const bearerToken = (request: FastifyRequest) => {
  const header = request.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
};

/**
 * Resolve the session cookie (web) or bearer token (apps) to a user on every request. The user
 * row is re-read each time, so deactivation, role changes and password resets apply immediately.
 */
export function registerSessionHook(app: FastifyInstance) {
  app.decorateRequest("currentUser", null);
  app.addHook("onRequest", async (request) => {
    request.currentUser = null;
    const token = bearerToken(request) ?? request.cookies[SESSION_COOKIE];
    if (!token) return;
    try {
      const { sub, v } = app.jwt.verify<TokenPayload>(token);
      const user = await prisma.user.findUnique({ where: { id: sub } });
      if (user?.active && user.tokenVersion === v) {
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
