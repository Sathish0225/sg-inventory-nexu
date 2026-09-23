import type { FastifyInstance } from "fastify";
import { addDays, attendanceHours, roundMoney, todayISO } from "@/lib/calc";
import { can } from "@/lib/permissions";
import type { AttendanceRecord } from "@/types";
import { guard, requireUser, type SessionUser } from "../auth";
import { prisma, type Tx } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import * as s from "../serialize";
import { jobCreateSchema, jobUpdateSchema, type PartInput } from "../schemas";
import { nextNumber } from "../services/numbering";
import { deductAll } from "../services/stock";

const partRows = (parts: PartInput[]) =>
  parts.map((p, position) => ({ itemId: p.itemId, name: p.item, quantity: p.quantity, cost: p.cost, position }));

const loadJob = async (tx: Tx, id: string) =>
  s.job(await tx.serviceJob.findUniqueOrThrow({ where: { id }, include: s.jobInclude }));

/** Fields a technician may change on a job assigned to them. */
const TECHNICIAN_FIELDS = new Set(["status", "notes", "partsUsed", "customerSignature", "photos"]);

/** Keys whose submitted value differs from what's stored (forms send every field). */
function changedKeys(job: Record<string, unknown>, patch: Record<string, unknown>): string[] {
  return Object.entries(patch)
    .filter(([key, value]) => {
      if (value === undefined || key === "partsUsed") return false;
      const current = job[key];
      if (current instanceof Date) return s.isoDate(current) !== value;
      if (current !== null && typeof current === "object") return Number(current) !== value; // Decimal
      return current !== value;
    })
    .map(([key]) => key);
}

function checkJobAccess(user: SessionUser, job: Record<string, unknown> & { technician: string }, patch: Record<string, unknown>) {
  if (can(user.role, "jobs:manage")) return;
  if (job.technician !== user.name) throw forbidden("You can only update jobs assigned to you.");
  const blocked = changedKeys(job, patch).filter((k) => !TECHNICIAN_FIELDS.has(k));
  if (blocked.length) throw forbidden(`Technicians can't change: ${blocked.join(", ")}.`);
}

export default async function jobRoutes(app: FastifyInstance) {
  app.get("/jobs", { preHandler: guard("jobs:read") }, async () =>
    (await prisma.serviceJob.findMany({ include: s.jobInclude, orderBy: { dateScheduled: "desc" } })).map(s.job),
  );

  app.post("/jobs", { preHandler: guard("jobs:manage") }, async (request) => {
    const { jobNumber, partsUsed, dateScheduled, ...data } = jobCreateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.create({
        data: {
          ...data,
          dateScheduled: s.toDate(dateScheduled),
          jobNumber: jobNumber?.trim() || (await nextNumber(tx, "serviceJob")),
          parts: { create: partRows(partsUsed) },
        },
      });
      return loadJob(tx, job.id);
    });
  });

  app.patch<{ Params: { id: string } }>("/jobs/:id", { preHandler: guard("jobs:write") }, async (request) => {
    const user = requireUser(request);
    const { partsUsed, dateScheduled, ...patch } = jobUpdateSchema.parse(request.body);
    const id = request.params.id;

    return prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({ where: { id }, include: { parts: true } });
      if (!job) throw notFound("Job");
      checkJobAccess(user, job, { ...patch, ...(dateScheduled ? { dateScheduled } : {}) });
      if (partsUsed && job.partsDeducted) {
        throw conflict("Parts were already deducted from stock when the job was completed.");
      }
      if (partsUsed) {
        await tx.jobPart.deleteMany({ where: { jobId: id } });
        await tx.jobPart.createMany({ data: partRows(partsUsed).map((p) => ({ ...p, jobId: id })) });
      }
      await tx.serviceJob.update({
        where: { id },
        data: { ...patch, ...(dateScheduled ? { dateScheduled: s.toDate(dateScheduled) } : {}) },
      });

      // Deduct parts exactly once when the job is completed. Claiming the flag first makes a
      // second concurrent "complete" a no-op instead of a double deduction.
      if (patch.status === "Completed") {
        const { count } = await tx.serviceJob.updateMany({ where: { id, partsDeducted: false }, data: { partsDeducted: true } });
        if (count === 1) {
          const parts = await tx.jobPart.findMany({ where: { jobId: id } });
          await deductAll(
            tx,
            parts.map((p) => ({ itemId: p.itemId, quantity: Number(p.quantity) })),
            job.jobNumber,
            "Used on service job",
            user.id,
          );
        }
      }
      return loadJob(tx, id);
    });
  });

  app.delete<{ Params: { id: string } }>("/jobs/:id", { preHandler: guard("jobs:manage") }, async (request) => {
    const live = await prisma.invoice.count({ where: { serviceJobId: request.params.id, status: { not: "Void" } } });
    if (live) throw conflict("This job has been invoiced and cannot be deleted.");
    await prisma.serviceJob.delete({ where: { id: request.params.id } });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/jobs/:id/invoice", { preHandler: guard("invoices:write") }, async (request) =>
    prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({
        where: { id: request.params.id },
        include: { parts: true, attendance: true, invoices: { where: { status: { not: "Void" } } } },
      });
      if (!job) throw notFound("Job");
      if (job.invoices.length) throw conflict(`${job.jobNumber} has already been invoiced.`);
      const hours = roundMoney(
        job.attendance.filter((a) => a.checkOut).reduce((sum, a) => sum + attendanceHours(s.attendance(a) as AttendanceRecord), 0),
      );
      const lines = [...job.parts]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({ itemId: p.itemId, description: p.name, quantity: Number(p.quantity), unitPrice: Number(p.cost), discountPct: 0 }));
      if (hours > 0) {
        lines.push({
          itemId: null,
          description: `Labour - ${job.serviceType} (${job.site})`,
          quantity: hours,
          unitPrice: Number(job.labourRate),
          discountPct: 0,
        });
      }
      if (!lines.length) throw badRequest("Nothing to bill: no parts recorded and no completed attendance for this job.");
      const settings = await tx.settings.findUniqueOrThrow({ where: { id: 1 } });
      const today = todayISO();
      const invoice = await tx.invoice.create({
        data: {
          number: await nextNumber(tx, "invoice"),
          customerId: job.customerId,
          date: s.toDate(today),
          dueDate: s.toDate(addDays(today, settings.paymentTermsDays)),
          status: "Draft",
          gstRate: settings.gstRate,
          reference: job.jobNumber,
          notes: job.description,
          serviceJobId: job.id,
          lines: { create: lines.map((l, position) => ({ ...l, position })) },
        },
        include: s.invoiceInclude,
      });
      return s.invoice(invoice);
    }),
  );
}
