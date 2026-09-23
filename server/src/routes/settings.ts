import type { FastifyInstance } from "fastify";
import { guard, requireUser } from "../auth";
import { prisma } from "../db";
import * as s from "../serialize";
import { settingsSchema } from "../schemas";

/** Technicians are the active users with the TECHNICIAN role. */
export const technicianNames = async () =>
  (await prisma.user.findMany({ where: { role: "TECHNICIAN", active: true }, orderBy: { name: "asc" } })).map((u) => u.name);

export default async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings", async (request) => {
    requireUser(request);
    return s.settings(await prisma.settings.findUniqueOrThrow({ where: { id: 1 } }), await technicianNames());
  });

  app.put("/settings", { preHandler: guard("settings:write") }, async (request) => {
    const data = settingsSchema.parse(request.body);
    const row = await prisma.settings.update({ where: { id: 1 }, data });
    return s.settings(row, await technicianNames());
  });
}
