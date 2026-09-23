import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { client, createApp, login, makeCustomer, resetDatabase, today } from "./helpers";

let app: FastifyInstance;
beforeAll(async () => {
  app = await createApp();
});
afterAll(() => app.close());
beforeEach(resetDatabase);

describe("authentication", () => {
  it("rejects anonymous requests and wrong passwords", async () => {
    expect((await client(app).get("/customers")).status).toBe(401);
    const res = await client(app).post("/auth/login", { email: "admin@test.sg", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Incorrect email or password.");
  });

  it("returns the signed-in user and never exposes password hashes", async () => {
    const admin = await login(app, "admin@test.sg");
    const me = await admin.get("/auth/me");
    expect(me.body.user).toMatchObject({ email: "admin@test.sg", role: "ADMIN" });
    const users = await admin.get("/users");
    expect(JSON.stringify(users.body)).not.toContain("passwordHash");
  });

  it("ends existing sessions when an account is deactivated", async () => {
    const admin = await login(app, "admin@test.sg");
    const accounts = await login(app, "accounts@test.sg");
    const target = (await admin.get("/users")).body.find((u: { email: string }) => u.email === "accounts@test.sg");
    expect((await admin.patch(`/users/${target.id}`, { active: false })).status).toBe(200);
    expect((await accounts.get("/invoices")).status).toBe(401);
    expect((await client(app).post("/auth/login", { email: "accounts@test.sg", password: "correct-horse-battery" })).status).toBe(401);
  });

  it("stops admins from demoting themselves", async () => {
    const admin = await login(app, "admin@test.sg");
    const me = (await admin.get("/auth/me")).body.user;
    expect((await admin.patch(`/users/${me.id}`, { role: "MANAGER" })).status).toBe(400);
  });
});

describe("role permissions", () => {
  it("keeps technicians out of sales and finance", async () => {
    const tech = await login(app, "alex@test.sg");
    expect((await tech.get("/invoices")).status).toBe(403);
    expect((await tech.get("/quotations")).status).toBe(403);
    expect((await tech.post("/customers", { name: "X" })).status).toBe(403);
    expect((await tech.get("/inventory")).status).toBe(200);
  });

  it("only lets admins change settings and users", async () => {
    const manager = await login(app, "manager@test.sg");
    const settings = (await manager.get("/settings")).body;
    expect((await manager.put("/settings", { ...settings, name: "Hacked" })).status).toBe(403);
    expect((await manager.get("/users")).status).toBe(403);
    const admin = await login(app, "admin@test.sg");
    const { technicians: _t, ...rest } = settings;
    expect((await admin.put("/settings", { ...rest, gstRate: 10 })).body.gstRate).toBe(10);
  });

  it("limits technicians to their own jobs and their own attendance", async () => {
    const manager = await login(app, "manager@test.sg");
    const customerId = await makeCustomer(manager);
    const job = (d: string) => ({
      customerId,
      site: "L1",
      serviceType: "Installation",
      technician: d,
      dateScheduled: today(),
      timeScheduled: "09:00",
      priority: "Low",
      description: "Install",
      labourRate: 80,
    });
    const alexJob = (await manager.post("/jobs", job("Alex Lim"))).body;
    const sarahJob = (await manager.post("/jobs", job("Sarah Tan"))).body;
    const alex = await login(app, "alex@test.sg");

    expect((await alex.post("/jobs", job("Alex Lim"))).status).toBe(403);
    expect((await alex.patch(`/jobs/${sarahJob.id}`, { notes: "x" })).status).toBe(403);
    expect((await alex.patch(`/jobs/${alexJob.id}`, { labourRate: 500 })).status).toBe(403);
    // Sending the whole form back unchanged plus a note is fine.
    const { id: _i, jobNumber: _n, customer: _c, invoiceId: _v, partsDeducted: _p, ...form } = alexJob;
    expect((await alex.patch(`/jobs/${alexJob.id}`, { ...form, notes: "On the way" })).status).toBe(200);

    expect((await alex.post("/attendance/check-in", { jobId: sarahJob.id, technician: "Sarah Tan" })).status).toBe(403);
    const visit = await alex.post("/attendance/check-in", { jobId: alexJob.id, technician: "Alex Lim" });
    expect(visit.status).toBe(200);
    expect((await alex.post("/attendance/check-in", { jobId: alexJob.id, technician: "Alex Lim" })).status).toBe(409);
    expect((await alex.post(`/attendance/${visit.body.id}/check-out`, { notes: "done" })).status).toBe(200);
    expect(await prisma.serviceJob.findUniqueOrThrow({ where: { id: alexJob.id } })).toMatchObject({ status: "In Progress" });
  });
});
