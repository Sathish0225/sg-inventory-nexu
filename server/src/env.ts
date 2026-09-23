import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  /**
   * Set to true only when running behind a reverse proxy (nginx, Caddy, a load balancer) so the
   * client IP comes from X-Forwarded-For. Left false, clients can't spoof their IP to dodge the
   * login rate limit.
   */
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /**
   * Mark the session cookie Secure (HTTPS only). Defaults to on in production. Browsers drop
   * Secure cookies on plain http (except localhost), so only turn this off for an internal
   * install reached over http://<LAN address>.
   */
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  /**
   * Origins allowed to call the API cross-origin: the mobile apps (Capacitor) and the desktop app
   * (Electron). They authenticate with bearer tokens, never cookies. Comma-separated.
   */
  APP_ORIGINS: z
    .string()
    .default("capacitor://localhost,https://localhost,app://inventrack")
    .transform((v) =>
      v
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  /** Login attempts allowed per IP per minute. */
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  /** Directory of the built web app to serve in production (optional). */
  WEB_DIST: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
};
