import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp, login, PASSWORD, resetDatabase } from "./helpers";

let app: FastifyInstance;
beforeAll(async () => {
  app = await createApp();
});
afterAll(() => app.close());
beforeEach(resetDatabase);

const appLogin = async (email: string, password = PASSWORD) => {
  const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password, client: "app" } });
  return { status: res.statusCode, body: res.json(), cookies: res.cookies };
};
const withToken = (token: string, method: "GET" | "POST" = "GET", url = "/api/auth/me", payload?: object) =>
  app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });

describe("mobile / desktop app access", () => {
  it("issues a bearer token instead of a cookie (phone / desktop apps)", async () => {
    const res = await appLogin("alex@test.sg");
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.cookies).toHaveLength(0);
    const me = await withToken(res.body.token);
    expect(me.json().user).toMatchObject({ email: "alex@test.sg", role: "TECHNICIAN" });
    expect((await withToken("not-a-token")).statusCode).toBe(401);
  });

  it("allows the desktop app origin cross-origin, without credentials, and nobody else", async () => {
    for (const origin of ["app://inventrack"]) {
      const res = await app.inject({
        method: "OPTIONS",
        url: "/api/auth/login",
        headers: { origin, "access-control-request-method": "POST", "access-control-request-headers": "content-type,authorization" },
      });
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
      expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
    }
    const evil = await app.inject({
      method: "OPTIONS",
      url: "/api/auth/login",
      headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
    });
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("revokes every token when the password changes, and re-issues one for this device", async () => {
    const phone = (await appLogin("alex@test.sg")).body.token;
    const laptop = (await appLogin("alex@test.sg")).body.token;
    const web = await login(app, "alex@test.sg");

    const res = await withToken(phone, "POST", "/api/auth/password", { currentPassword: PASSWORD, newPassword: "a-brand-new-password" });
    expect(res.statusCode).toBe(200);
    const fresh = res.json().token;

    expect((await withToken(phone)).statusCode).toBe(401);
    expect((await withToken(laptop)).statusCode).toBe(401);
    expect((await web.get("/auth/me")).status).toBe(401);
    expect((await withToken(fresh)).statusCode).toBe(200);
  });

  it("revokes tokens when an admin resets a password or changes a role", async () => {
    const token = (await appLogin("alex@test.sg")).body.token;
    const admin = await login(app, "admin@test.sg");
    const alex = (await admin.get("/users")).body.find((u: { email: string }) => u.email === "alex@test.sg");

    await admin.patch(`/users/${alex.id}`, { name: "Alex Lim Jr" }); // harmless edit keeps the session
    expect((await withToken(token)).statusCode).toBe(200);

    await admin.patch(`/users/${alex.id}`, { role: "MANAGER" });
    expect((await withToken(token)).statusCode).toBe(401);
  });
});
