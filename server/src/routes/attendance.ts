import type { FastifyInstance } from "fastify";
import { can } from "@/lib/permissions";
import { guard, requireUser } from "../auth";
import { prisma } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import * as s from "../serialize";
import { checkInSchema, checkOutSchema } from "../schemas";

export default async function attendanceRoutes(app: FastifyInstance) {
  app.get("/attendance", async (request) => {
    const user = requireUser(request);
    if (can(user.role, "attendance:read")) {
      return (await prisma.attendanceRecord.findMany({ orderBy: { checkIn: "desc" }, take: 5000 })).map(s.attendance);
    }
    if (can(user.role, "attendance:self")) {
      return (
        await prisma.attendanceRecord.findMany({ where: { technician: user.name }, orderBy: { checkIn: "desc" }, take: 1000 })
      ).map(s.attendance);
    }
    throw forbidden();
  });

  app.post("/attendance/check-in", async (request) => {
    const user = requireUser(request);
    const { jobId, technician, location } = checkInSchema.parse(request.body);
    const onBehalf = technician !== user.name;
    if (onBehalf ? !can(user.role, "attendance:manage") : !can(user.role, "attendance:self") && !can(user.role, "attendance:manage")) {
      throw forbidden(onBehalf ? "You can only check yourself in." : undefined);
    }
    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { id: jobId } });
      if (!job) throw notFound("Job");
      if (job.status === "Completed" || job.status === "Cancelled") {
        throw badRequest(`Job ${job.jobNumber} is ${job.status.toLowerCase()}.`);
      }
      const open = await tx.attendanceRecord.findFirst({ where: { technician, checkOut: null }, include: { job: true } });
      if (open) throw conflict(`${technician} is still checked in to ${open.job.jobNumber}. Check out first.`);
      // A partial unique index also rejects a second open visit if two check-ins race.
      const record = await tx.attendanceRecord.create({
        data: {
          jobId,
          technician,
          userId: user.id,
          checkIn: new Date(),
          checkInLat: location?.lat,
          checkInLng: location?.lng,
        },
      });
      if (job.status === "Scheduled") await tx.serviceJob.update({ where: { id: jobId }, data: { status: "In Progress" } });
      return s.attendance(record);
    });
  });

  app.post<{ Params: { id: string } }>("/attendance/:id/check-out", async (request) => {
    const user = requireUser(request);
    const { notes, location } = checkOutSchema.parse(request.body);
    const record = await prisma.attendanceRecord.findUnique({ where: { id: request.params.id } });
    if (!record) throw notFound("Attendance record");
    const own = record.technician === user.name && can(user.role, "attendance:self");
    if (!own && !can(user.role, "attendance:manage")) throw forbidden("You can only check yourself out.");
    const { count } = await prisma.attendanceRecord.updateMany({
      where: { id: record.id, checkOut: null },
      data: {
        checkOut: new Date(),
        checkOutLat: location?.lat,
        checkOutLng: location?.lng,
        ...(notes ? { notes } : {}),
      },
    });
    if (count === 0) throw conflict("Already checked out.");
    return s.attendance(await prisma.attendanceRecord.findUniqueOrThrow({ where: { id: record.id } }));
  });

  app.delete<{ Params: { id: string } }>("/attendance/:id", { preHandler: guard("attendance:manage") }, async (request) => {
    await prisma.attendanceRecord.delete({ where: { id: request.params.id } });
    return { ok: true };
  });
}
