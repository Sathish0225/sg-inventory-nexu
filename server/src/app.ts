import path from "path";
import fs from "fs";
import Fastify, { type FastifyError } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { registerSessionHook, SESSION_COOKIE } from "./auth";
import type { Env } from "./env";
import { AppError } from "./errors";
import attendanceRoutes from "./routes/attendance";
import authRoutes from "./routes/auth";
import customerRoutes from "./routes/customers";
import inventoryRoutes from "./routes/inventory";
import invoiceRoutes from "./routes/invoices";
import jobRoutes from "./routes/jobs";
import quotationRoutes from "./routes/quotations";
import salesOrderRoutes from "./routes/salesOrders";
import settingsRoutes from "./routes/settings";
import userRoutes from "./routes/users";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : { level: env.NODE_ENV === "production" ? "info" : "debug" },
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 1024 * 1024,
  });

  await app.register(cookie);
  // Only the app origins may call cross-origin, and without credentials: apps send a bearer
  // token, so the browser session cookie is never usable from another site.
  await app.register(cors, {
    origin: env.APP_ORIGINS,
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
  await app.register(jwt, { secret: env.JWT_SECRET, cookie: { cookieName: SESSION_COOKIE, signed: false } });
  await app.register(rateLimit, { global: false });
  registerSessionHook(app);

  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const field = issue.path.join(".");
      return reply.status(400).send({ error: field ? `${field}: ${issue.message}` : issue.message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = (error.meta?.target as string[] | string | undefined)?.toString() ?? "value";
        return reply.status(409).send({ error: `That ${target} is already in use.` });
      }
      if (error.code === "P2003") return reply.status(409).send({ error: "This record is referenced by other records." });
      if (error.code === "P2025") return reply.status(404).send({ error: "Record not found." });
    }
    const status = "statusCode" in error && error.statusCode ? error.statusCode : 500;
    if (status >= 500) request.log.error(error);
    return reply.status(status).send({ error: status >= 500 ? "Something went wrong." : error.message });
  });

  app.get("/api/health", async () => ({ ok: true }));

  const secureCookies = env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : env.NODE_ENV === "production";
  await app.register(
    async (api) => {
      await api.register(authRoutes, { secureCookies, loginRateLimit: env.LOGIN_RATE_LIMIT });
      await api.register(userRoutes);
      await api.register(settingsRoutes);
      await api.register(customerRoutes);
      await api.register(inventoryRoutes);
      await api.register(jobRoutes);
      await api.register(attendanceRoutes);
      await api.register(quotationRoutes);
      await api.register(salesOrderRoutes);
      await api.register(invoiceRoutes);
    },
    { prefix: "/api" },
  );

  // In production the API also serves the built web app, with client-side routing fallback.
  if (env.WEB_DIST && fs.existsSync(env.WEB_DIST)) {
    await app.register(fastifyStatic, { root: path.resolve(env.WEB_DIST), wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === "GET" && !request.url.startsWith("/api/")) return reply.sendFile("index.html");
      return reply.status(404).send({ error: "Not found." });
    });
  } else {
    app.setNotFoundHandler((_request, reply) => reply.status(404).send({ error: "Not found." }));
  }

  return app;
}
