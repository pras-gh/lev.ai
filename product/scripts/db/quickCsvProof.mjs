import { PrismaClient } from "@prisma/client";
import { parseBankCsv } from "../../src/lib/bankCsvParser.ts";
import {
  CATEGORIZE_V0_TARGET_RATE,
  buildCategoryNameIdMap,
  categorizeTransactionV0,
  resolveCategoryIdByCategoryName
} from "../../src/lib/categorizeV0.ts";

const SAMPLE_CSV = `Date,Description,Debit,Credit,Reference
2026-02-01,Office Rent payment,20000.00,,NEFT-RENT
2026-02-02,Razorpay Settlement,,120000.00,RP-SETTLE
2026-02-03,GST payment,5000.00,,GST-CHALLAN
2026-02-04,Salary transfer,45000.00,,PAYROLL
2026-02-05,Facebook Ads billing,2500.00,,FB-ADS
2026-02-06,OpenAI subscription,1500.00,,OPENAI
2026-02-07,Delhivery charges,800.00,,DLV-001
2026-02-05,Misc expense,1000.00,,MISC-001
`;

async function run() {
  const parsed = parseBankCsv(SAMPLE_CSV, { defaultCurrency: "INR" });

  console.log("Parsed CSV summary:");
  console.log({
    totalRows: parsed.totalRows,
    normalizedRows: parsed.transactions.length,
    rejectedRows: parsed.rejectedRows.length
  });
  console.log("Normalized preview:");
  console.log(parsed.transactions);

  const categoryMap = buildCategoryNameIdMap([
    { id: 1n, name: "Tax" },
    { id: 2n, name: "Payroll" },
    { id: 3n, name: "Revenue" },
    { id: 4n, name: "Rent/Utilities" },
    { id: 5n, name: "Marketing" },
    { id: 6n, name: "SaaS" },
    { id: 7n, name: "Logistics" }
  ]);
  const autoTaggedCount = parsed.transactions.filter((row) => {
    const match = categorizeTransactionV0({
      description: row.description,
      merchant: row.merchant,
      reference: row.reference
    });

    return Boolean(
      match.categoryName &&
        resolveCategoryIdByCategoryName({
          categoryName: match.categoryName,
          categoryMap
        })
    );
  }).length;
  const autoTaggedRate =
    parsed.transactions.length === 0 ? 0 : autoTaggedCount / parsed.transactions.length;

  console.log("Categorization proof:");
  console.log({
    autoTaggedCount,
    totalRows: parsed.transactions.length,
    autoTaggedRate,
    coverageTarget: CATEGORIZE_V0_TARGET_RATE,
    coverageTargetMet: autoTaggedRate >= CATEGORIZE_V0_TARGET_RATE
  });

  if (!process.env.DATABASE_URL) {
    console.log(
      "DATABASE_URL not set: parse proof completed, DB insert/query proof skipped."
    );
    process.exit(0);
  }

  const prisma = new PrismaClient();

  try {
    const business = await prisma.business.create({
      data: {
        name: `CSV Proof Biz ${Date.now()}`
      }
    });

    const insertParsedRows = async () => {
      const deduped = new Map();
      for (const row of parsed.transactions) {
        if (!deduped.has(row.rowHash)) {
          deduped.set(row.rowHash, row);
        }
      }

      const dedupedRows = [...deduped.values()];
      const hashes = dedupedRows.map((row) => row.rowHash);

      const existing = await prisma.transaction.findMany({
        where: {
          businessId: business.id,
          rowHash: { in: hashes }
        },
        select: { rowHash: true }
      });

      const existingSet = new Set(existing.map((row) => row.rowHash).filter(Boolean));
      const toInsert = dedupedRows.filter((row) => !existingSet.has(row.rowHash));

      if (toInsert.length > 0) {
        await prisma.transaction.createMany({
          data: toInsert.map((row) => ({
            businessId: business.id,
            amount: row.amount,
            currency: row.currency,
            type: row.type,
            status: "posted",
            txnDate: new Date(row.txnDate),
            description: row.description ?? null,
            merchant: row.merchant ?? null,
            reference: row.reference ?? null,
            externalId: row.externalId ?? null,
            rowHash: row.rowHash,
            source: "csv_proof",
            metadata: { importer: "csv_proof", raw: row.raw }
          }))
        });
      }

      return {
        inputCount: parsed.transactions.length,
        uniqueInPayloadCount: dedupedRows.length,
        alreadyExistingCount: existingSet.size,
        insertedCount: toInsert.length,
        skippedCount: existingSet.size + (parsed.transactions.length - dedupedRows.length)
      };
    };

    const firstImport = await insertParsedRows();
    const secondImport = await insertParsedRows();

    const insertedRows = await prisma.transaction.findMany({
      where: { businessId: business.id },
      orderBy: [{ txnDate: "desc" }, { id: "desc" }],
      select: {
        id: true,
        txnDate: true,
        amount: true,
        type: true,
        description: true,
        rowHash: true
      }
    });

    console.log("Insert/query proof:");
    console.log({
      businessId: business.id.toString(),
      firstImport,
      secondImport,
      queriedRowCount: insertedRows.length,
      queriedRows: insertedRows
    });
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("CSV proof failed:");
  console.error(error);
  process.exit(1);
});
