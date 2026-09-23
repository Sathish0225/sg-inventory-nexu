import { execSync } from "child_process";

/** Bring the test database schema up to date (non-destructive; tests truncate tables themselves). */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST ?? "postgresql://postgres@127.0.0.1:5432/inventrack_test?schema=public";
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
