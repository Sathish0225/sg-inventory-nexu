/**
 * Seed the database.
 *  - Always: the settings row (if missing).
 *  - When there are no users: an admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
 *  - When SEED_DEMO_DATA=true and there are no customers yet: demo users for every role plus demo
 *    customers, stock, jobs, attendance, quotations, orders and invoices.
 * Safe to run repeatedly.
 */
import "dotenv/config";
import { randomBytes, randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildSeed, defaultSettings } from "./seed-data";

process.env.TZ ??= "Asia/Singapore";
const prisma = new PrismaClient();
const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main() {
  const { technicians: _computed, ...settings } = defaultSettings;
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...settings } });

  const demo = (process.env.SEED_DEMO_DATA ?? "true") === "true";
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@inventrack.local").toLowerCase();
  let password = process.env.SEED_ADMIN_PASSWORD || "";
  const generated = !password;
  if (generated) password = randomBytes(9).toString("base64url");

  if ((await prisma.user.count()) === 0) {
    const passwordHash = await bcrypt.hash(password, 12);
    const users = [{ email, name: "Administrator", role: "ADMIN" }];
    if (demo) {
      users.push(
        { email: "manager@inventrack.local", name: "Sarah Lim", role: "MANAGER" },
        { email: "accounts@inventrack.local", name: "Wei Ling Tan", role: "ACCOUNTS" },
        ...defaultSettings.technicians.map((name) => ({
          email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@inventrack.local`,
          name,
          role: "TECHNICIAN",
        })),
      );
    }
    await prisma.user.createMany({ data: users.map((u) => ({ ...u, passwordHash })) });
    console.log(`Created ${users.length} user(s):`);
    for (const u of users) console.log(`  ${u.role.padEnd(10)} ${u.email}`);
    console.log(generated ? `  Password (all): ${password}   <- generated, change it after first login` : "  Password: SEED_ADMIN_PASSWORD");
  }

  if (!demo || (await prisma.customer.count()) > 0) return;

  const data = buildSeed();
  // Demo data uses readable ids; the API expects UUIDs.
  const ids = new Map<string, string>();
  const map = (id: string | null) => (id ? (ids.get(id) ?? ids.set(id, randomUUID()).get(id)!) : null);
  const lines = (ls: typeof data.quotations[number]["lines"]) =>
    ls.map((l, position) => ({ itemId: map(l.itemId), description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct, position }));

  await prisma.$transaction(async (tx) => {
    for (const c of data.customers) {
      const { id, createdAt, ...rest } = c;
      await tx.customer.create({ data: { ...rest, id: map(id)!, createdAt: new Date(createdAt) } });
    }
    for (const i of data.inventory) {
      const { id, lastUpdated, ...rest } = i;
      await tx.inventoryItem.create({ data: { ...rest, id: map(id)!, lastUpdated: date(lastUpdated) } });
    }
    for (const j of data.jobs) {
      const { id, customerId, customer: _name, partsUsed, invoiceId: _inv, dateScheduled, ...rest } = j;
      await tx.serviceJob.create({
        data: {
          ...rest,
          id: map(id)!,
          customerId: map(customerId)!,
          dateScheduled: date(dateScheduled),
          parts: { create: partsUsed.map((p, position) => ({ itemId: map(p.itemId), name: p.item, quantity: p.quantity, cost: p.cost, position })) },
        },
      });
    }
    for (const a of data.attendance) {
      await tx.attendanceRecord.create({
        data: {
          id: map(a.id)!,
          jobId: map(a.jobId)!,
          technician: a.technician,
          checkIn: new Date(a.checkIn),
          checkOut: a.checkOut ? new Date(a.checkOut) : null,
          checkInLat: a.checkInLocation?.lat,
          checkInLng: a.checkInLocation?.lng,
          checkOutLat: a.checkOutLocation?.lat,
          checkOutLng: a.checkOutLocation?.lng,
          notes: a.notes,
        },
      });
    }
    for (const q of data.quotations) {
      await tx.quotation.create({
        data: {
          id: map(q.id)!,
          number: q.number,
          customerId: map(q.customerId)!,
          date: date(q.date),
          validUntil: date(q.validUntil),
          status: q.status,
          gstRate: q.gstRate,
          reference: q.reference,
          notes: q.notes,
          terms: q.terms,
          lines: { create: lines(q.lines) },
        },
      });
    }
    for (const o of data.salesOrders) {
      await tx.salesOrder.create({
        data: {
          id: map(o.id)!,
          number: o.number,
          customerId: map(o.customerId)!,
          quotationId: map(o.quotationId),
          date: date(o.date),
          deliveryDate: date(o.deliveryDate),
          status: o.status,
          gstRate: o.gstRate,
          reference: o.reference,
          notes: o.notes,
          lines: { create: lines(o.lines) },
        },
      });
    }
    for (const inv of data.invoices) {
      await tx.invoice.create({
        data: {
          id: map(inv.id)!,
          number: inv.number,
          customerId: map(inv.customerId)!,
          date: date(inv.date),
          dueDate: date(inv.dueDate),
          status: inv.status,
          gstRate: inv.gstRate,
          reference: inv.reference,
          notes: inv.notes,
          lines: { create: lines(inv.lines) },
          payments: {
            create: inv.payments.map((p) => ({ date: date(p.date), amount: p.amount, method: p.method, reference: p.reference })),
          },
        },
      });
    }
    const year = new Date().getFullYear();
    for (const [kind, seq] of Object.entries(data.counters)) {
      await tx.docCounter.upsert({ where: { kind_year: { kind, year } }, update: { seq }, create: { kind, year, seq } });
    }
  });
  console.log("Loaded demo data.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
