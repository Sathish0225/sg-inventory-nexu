import type { FastifyInstance } from "fastify";
import { authenticate, endSession, hashPassword, issueAppToken, requireUser, startSession, verifyPassword } from "../auth";
import { prisma } from "../db";
import { AppError, badRequest } from "../errors";
import { changePasswordSchema, loginSchema } from "../schemas";

export default async function authRoutes(app: FastifyInstance, opts: { secureCookies: boolean; loginRateLimit: number }) {
  app.post(
    "/auth/login",
    // Slow down password guessing (default 10 attempts per minute per IP).
    { config: { rateLimit: { max: opts.loginRateLimit, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { email, password, client } = loginSchema.parse(request.body);
      const found = await authenticate(email, password);
      if (!found) throw new AppError(401, "Incorrect email or password.");
      const { tokenVersion, ...user } = found;
      // Apps get a bearer token; browsers get an httpOnly cookie the page script can't read.
      if (client === "app") return { user, token: issueAppToken(app, found) };
      await startSession(app, reply, found, opts.secureCookies);
      return { user };
    },
  );

  app.post("/auth/logout", async (_request, reply) => {
    endSession(reply);
    return { ok: true };
  });

  app.get("/auth/me", async (request) => ({ user: requireUser(request) }));

  app.post("/auth/password", async (request, reply) => {
    const me = requireUser(request);
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw badRequest("Current password is incorrect.");
    // Signs the user out everywhere else, then re-issues credentials for this device.
    const updated = await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
    });
    if (request.headers.authorization) return { ok: true, token: issueAppToken(app, updated) };
    await startSession(app, reply, updated, opts.secureCookies);
    return { ok: true };
  });
}
