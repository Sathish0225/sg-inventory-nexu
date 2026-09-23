import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { hashPassword } from "../src/auth";
import { prisma } from "../src/db";
import { loadEnv } from "../src/env";
import { defaultSettings } from "../prisma/seed-data";

export const PASSWORD = "correct-horse-battery";

/** Empty every table and create settings plus one user per role. */
export async function resetDatabase() {
  // Guard against pointing the suite at a real database by mistake.
  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  if (!db.endsWith("_test")) throw new Error(`Refusing to truncate "${db}": test database names must end in _test.`);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  const { technicians: _t, ...settings } = defaultSettings;
  await prisma.settings.create({ data: { id: 1, ...settings } });
  const passwordHash = await hashPassword(PASSWORD);
  await prisma.user.createMany({
    data: [
      { email: "admin@test.sg", name: "Admin", role: "ADMIN", passwordHash },
      { email: "manager@test.sg", name: "Manager", role: "MANAGER", passwordHash },
      { email: "accounts@test.sg", name: "Accounts", role: "ACCOUNTS", passwordHash },
      { email: "alex@test.sg", name: "Alex Lim", role: "TECHNICIAN", passwordHash },
      { email: "sarah@test.sg", name: "Sarah Tan", role: "TECHNICIAN", passwordHash },
    ],
  });
}

export const createApp = () => buildApp(loadEnv());

export type Client = ReturnType<typeof client>;

/** A signed-in API client for one user. */
export async function login(app: FastifyInstance, email: string) {
  const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: PASSWORD } });
  if (res.statusCode !== 200) throw new Error(`login failed for ${email}: ${res.body}`);
  const cookie = res.cookies.find((c) => c.name === "inventrack_session")!;
  return client(app, `${cookie.name}=${cookie.value}`);
}

export function client(app: FastifyInstance, cookie?: string) {
  const call = async (method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", url: string, payload?: unknown) => {
    const res = await app.inject({ method, url: `/api${url}`, payload: payload as object, headers: cookie ? { cookie } : {} });
    return { status: res.statusCode, body: res.body ? res.json() : undefined };
  };
  return {
    get: (url: string) => call("GET", url),
    post: (url: string, body: unknown = {}) => call("POST", url, body),
    patch: (url: string, body: unknown) => call("PATCH", url, body),
    put: (url: string, body: unknown) => call("PUT", url, body),
    del: (url: string) => call("DELETE", url),
  };
}

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });

export async function makeCustomer(c: Client, name = "Acme Pte Ltd") {
  return (await c.post("/customers", { name })).body.id as string;
}

export async function makeItem(c: Client, sku: string, stock: number, unitPrice = 100) {
  const res = await c.post("/inventory", { sku, name: `Item ${sku}`, category: "Electronics", currentStock: stock, unitPrice, unitCost: unitPrice / 2 });
  if (res.status !== 200) throw new Error(res.body.error);
  return res.body.id as string;
}

export const line = (itemId: string | null, quantity: number, unitPrice = 100) => ({
  itemId,
  description: itemId ? "Stock item" : "Service",
  quantity,
  unitPrice,
  discountPct: 0,
});
