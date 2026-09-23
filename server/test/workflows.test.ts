import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { createApp, line, login, makeCustomer, makeItem, resetDatabase, today, type Client } from "./helpers";

let app: FastifyInstance;
let manager: Client;
let customerId: string;

beforeAll(async () => {
  app = await createApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await resetDatabase();
  manager = await login(app, "manager@test.sg");
  customerId = await makeCustomer(manager);
});

const stockOf = async (id: string) => Number((await prisma.inventoryItem.findUniqueOrThrow({ where: { id } })).currentStock);
const year = new Date().getFullYear();

const quote = (lines: ReturnType<typeof line>[]) =>
  manager.post("/quotations", { customerId, date: today(), validUntil: today(), gstRate: 9, lines });

describe("quotation → sales order → invoice → payment", () => {
  it("runs the whole flow and enforces the rules", async () => {
    const cam = await makeItem(manager, "CAM", 5, 289);
    const q = await quote([line(cam, 8, 289), line(null, 1, 1200)]);
    expect(q.body.number).toBe(`QT-${year}-0001`);

    const so = await manager.post(`/quotations/${q.body.id}/convert-to-sales-order`);
    expect(so.status).toBe(200);
    expect((await manager.post(`/quotations/${q.body.id}/convert-to-sales-order`)).status).toBe(409);
    expect((await manager.get("/quotations")).body[0]).toMatchObject({ status: "Accepted", salesOrderId: so.body.id });

    // 8 needed, 5 in stock: nothing is deducted.
    const short = await manager.post(`/sales-orders/${so.body.id}/fulfil`);
    expect(short.status).toBe(409);
    expect(short.body.error).toMatch(/Insufficient stock/);
    expect(await stockOf(cam)).toBe(5);

    await manager.post(`/inventory/${cam}/adjust`, { delta: 10, reference: "PO-1" });
    expect((await manager.post(`/sales-orders/${so.body.id}/fulfil`)).status).toBe(200);
    expect(await stockOf(cam)).toBe(7);

    const inv = (await manager.post(`/sales-orders/${so.body.id}/invoice`)).body;
    expect(inv).toMatchObject({ status: "Draft", source: { type: "salesOrder", id: so.body.id } });
    const pay = (amount: number) => manager.post(`/invoices/${inv.id}/payments`, { date: today(), amount, method: "PayNow" });
    expect((await pay(10)).status).toBe(409); // draft
    expect((await manager.post(`/invoices/${inv.id}/issue`)).status).toBe(200);

    // 8 × 289 + 1200 = 3512, GST 9% = 316.08 → 3828.08
    expect((await pay(3828.09)).status).toBe(400);
    expect((await pay(1000)).status).toBe(200);
    const paid = await pay(2828.08);
    expect(paid.status).toBe(200);
    expect(paid.body.payments).toHaveLength(2);

    expect((await manager.del(`/invoices/${inv.id}`)).status).toBe(409);
    expect((await manager.post(`/invoices/${inv.id}/void`)).status).toBe(409); // has payments
  });

  it("voiding an invoice lets the source be invoiced again", async () => {
    const q = (await quote([line(null, 1, 500)])).body;
    const first = (await manager.post(`/quotations/${q.id}/convert-to-invoice`)).body;
    expect((await manager.post(`/quotations/${q.id}/convert-to-invoice`)).status).toBe(409);
    await manager.post(`/invoices/${first.id}/issue`);
    await manager.post(`/invoices/${first.id}/void`);
    expect((await manager.get("/quotations")).body[0].invoiceId).toBeNull();
    // Converted-then-voided quotations may be converted again.
    const again = await manager.post(`/quotations/${q.id}/convert-to-invoice`);
    expect(again.status).toBe(200);
    expect(again.body.number).toBe(`INV-${year}-0002`);
  });

  it("rejects bad input with a readable message", async () => {
    const res = await manager.post("/quotations", { customerId, date: "tomorrow", validUntil: today(), gstRate: 9, lines: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/^date:/);
  });
});

describe("service jobs", () => {
  it("deducts parts once on completion and invoices parts plus attended hours", async () => {
    const filter = await makeItem(manager, "FLT", 10, 22);
    const job = (
      await manager.post("/jobs", {
        customerId,
        site: "Tower 1",
        serviceType: "Preventive Maintenance",
        technician: "Alex Lim",
        dateScheduled: today(),
        timeScheduled: "09:00",
        priority: "Medium",
        description: "Quarterly service",
        labourRate: 85,
        partsUsed: [{ itemId: filter, item: "Filter", quantity: 4, cost: 22 }],
      })
    ).body;
    expect(job.jobNumber).toBe(`JOB-${year}-0001`);

    await prisma.attendanceRecord.create({
      data: { jobId: job.id, technician: "Alex Lim", checkIn: new Date("2026-01-01T01:00:00Z"), checkOut: new Date("2026-01-01T03:15:00Z") },
    });

    const complete = () => manager.patch(`/jobs/${job.id}`, { status: "Completed" });
    const results = await Promise.all([complete(), complete()]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(await stockOf(filter)).toBe(6);
    expect((await manager.patch(`/jobs/${job.id}`, { partsUsed: [] })).status).toBe(409);

    const inv = await manager.post(`/jobs/${job.id}/invoice`);
    expect(inv.status).toBe(200);
    expect(inv.body.lines.map((l: { quantity: number }) => l.quantity)).toEqual([4, 2.25]);
    expect((await manager.post(`/jobs/${job.id}/invoice`)).status).toBe(409);
    expect((await manager.del(`/jobs/${job.id}`)).status).toBe(409);
  });
});

describe("concurrency", () => {
  it("never oversells when orders are fulfilled at the same time", async () => {
    const item = await makeItem(manager, "SCARCE", 5);
    const orders = await Promise.all(
      [1, 2, 3].map(() =>
        manager.post("/sales-orders", { customerId, date: today(), deliveryDate: today(), gstRate: 9, lines: [line(item, 3)] }),
      ),
    );
    const results = await Promise.all(orders.map((o) => manager.post(`/sales-orders/${o.body.id}/fulfil`)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await stockOf(item)).toBe(2);
    const movements = await prisma.stockMovement.count({ where: { itemId: item, type: "out" } });
    expect(movements).toBe(1);
  });

  it("serialises payments so an invoice can't be overpaid", async () => {
    const inv = (await manager.post("/invoices", { customerId, date: today(), dueDate: today(), gstRate: 0, lines: [line(null, 1, 100)] })).body;
    await manager.post(`/invoices/${inv.id}/issue`);
    const results = await Promise.all(
      [1, 2, 3].map(() => manager.post(`/invoices/${inv.id}/payments`, { date: today(), amount: 100, method: "Cash" })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it("hands out unique sequential document numbers", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => quote([line(null, 1)])));
    const numbers = results.map((r) => r.body.number).sort();
    expect(new Set(numbers).size).toBe(12);
    expect(numbers[11]).toBe(`QT-${year}-0012`);
  });
});
