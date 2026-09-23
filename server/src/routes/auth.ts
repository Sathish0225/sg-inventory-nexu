import type { FastifyInstance } from "fastify";
import { authenticate, endSession, hashPassword, requireUser, startSession, verifyPassword } from "../auth";
import { prisma } from "../db";
import { AppError, badRequest } from "../errors";
import { changePasswordSchema, loginSchema } from "../schemas";

export default async function authRoutes(app: FastifyInstance, opts: { secureCookies: boolean; loginRateLimit: number }) {
  app.post(
    "/auth/login",
    // Slow down password guessing (default 10 attempts per minute per IP).
    { config: { rateLimit: { max: opts.loginRateLimit, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { email, password } = loginSchema.parse(request.body);
      const user = await authenticate(email, password);
      if (!user) throw new AppError(401, "Incorrect email or password.");
      await startSession(app, reply, user, opts.secureCookies);
      return { user };
    },
  );

  app.post("/auth/logout", async (_request, reply) => {
    endSession(reply);
    return { ok: true };
  });

  app.get("/auth/me", async (request) => ({ user: requireUser(request) }));

  app.post("/auth/password", async (request) => {
    const me = requireUser(request);
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw badRequest("Current password is incorrect.");
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(newPassword) } });
    return { ok: true };
  });
}
