import { formatDocNumber } from "@/lib/calc";
import type { DocumentKind } from "@/types";
import type { Tx } from "../db";

/**
 * Allocate the next number for a document type. The upsert is a single atomic statement, so two
 * concurrent requests can never receive the same number. Sequences restart each calendar year.
 */
export async function nextNumber(tx: Tx, kind: DocumentKind): Promise<string> {
  const settings = await tx.settings.findUniqueOrThrow({ where: { id: 1 } });
  const prefixes = settings.prefixes as Record<DocumentKind, string>;
  const year = new Date().getFullYear();
  const [row] = await tx.$queryRaw<{ seq: number }[]>`
    INSERT INTO "DocCounter" (kind, year, seq) VALUES (${kind}, ${year}, 1)
    ON CONFLICT (kind, year) DO UPDATE SET seq = "DocCounter".seq + 1
    RETURNING seq`;
  return formatDocNumber(prefixes[kind], year, Number(row.seq));
}
