import type { FastifyInstance } from "fastify";
import { guard, hashPassword, requireUser } from "../auth";
import { prisma } from "../db";
import { badRequest } from "../errors";
import { userCreateSchema, userUpdateSchema } from "../schemas";

const publicUser = { id: true, email: true, name: true, role: true, active: true, createdAt: true } as const;

export default async function userRoutes(app: FastifyInstance) {
  const admin = { preHandler: guard("users:manage") };

  app.get("/users", admin, async () => prisma.user.findMany({ select: publicUser, orderBy: { name: "asc" } }));

  app.post("/users", admin, async (request) => {
    const { password, ...data } = userCreateSchema.parse(request.body);
    return prisma.user.create({ data: { ...data, passwordHash: await hashPassword(password) }, select: publicUser });
  });

  app.patch<{ Params: { id: string } }>("/users/:id", admin, async (request) => {
    const me = requireUser(request);
    const { password, ...patch } = userUpdateSchema.parse(request.body);
    // Stop admins from locking everyone out by demoting or disabling themselves.
    if (request.params.id === me.id && (patch.active === false || (patch.role && patch.role !== "ADMIN"))) {
      throw badRequest("You can't disable your own account or remove your own admin role.");
    }
    return prisma.user.update({
      where: { id: request.params.id },
      data: { ...patch, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
      select: publicUser,
    });
  });
}
