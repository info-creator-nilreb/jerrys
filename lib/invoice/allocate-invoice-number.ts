import type { Prisma } from "@/app/generated/prisma/client";

const INVOICE_LOCK_KEY = 87236401;

export function formatInvoiceNumber(seq: number, year: number): string {
  return `${year}-${String(seq).padStart(5, "0")}`;
}

/**
 * Vergeben einer fortlaufenden Rechnungsnummer (Jahr-Präfix + Sequenz), atomar innerhalb der Transaktion.
 */
export async function allocateNextInvoiceNumber(
  tx: Prisma.TransactionClient,
): Promise<{ invoiceNumber: string; issuedAt: Date }> {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${INVOICE_LOCK_KEY})`);

  const issuedAt = new Date();
  const year = issuedAt.getFullYear();

  const row = await tx.invoiceCounter.findUnique({ where: { id: 1 } });
  const seq = row?.nextSeq ?? 1;
  const invoiceNumber = formatInvoiceNumber(seq, year);

  await tx.invoiceCounter.upsert({
    where: { id: 1 },
    create: { id: 1, nextSeq: seq + 1 },
    update: { nextSeq: seq + 1 },
  });

  return { invoiceNumber, issuedAt };
}
