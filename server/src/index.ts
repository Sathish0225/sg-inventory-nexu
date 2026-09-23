// Business dates (today, due dates, numbering year) follow Singapore time unless overridden.
process.env.TZ ??= "Asia/Singapore";

import "dotenv/config";
import { buildApp } from "./app";
import { prisma } from "./db";
import { loadEnv } from "./env";

const env = loadEnv();
const app = await buildApp(env);

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: env.PORT, host: env.HOST });
