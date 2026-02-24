import { PrismaClient } from "@prisma/client";
import { autoTagTransactionsV0 } from "../../src/lib/categorizeV0.ts";

function usage() {
  console.log("Usage:");
  console.log(
    "  npm run db:autotag-v0 -- <businessId> [confidenceThreshold] [limitPerBatch] [maxBatches]"
  );
  console.log(
    "  BUSINESS_ID=<businessId> npm run db:autotag-v0 -- [confidenceThreshold] [limitPerBatch] [maxBatches]"
  );
}

function parseBusinessId(value) {
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) {
    throw new Error("businessId must be a positive integer");
  }

  const businessId = BigInt(raw);
  if (businessId <= 0n) {
    throw new Error("businessId must be a positive integer");
  }

  return businessId;
}

function parseOptionalNumber(value, name, defaultValue) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
}

async function run() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }

  const businessArg = process.argv[2] ?? process.env.BUSINESS_ID;
  if (!businessArg) {
    usage();
    throw new Error("Missing businessId");
  }

  const confidenceThreshold = parseOptionalNumber(
    process.argv[3] ?? process.env.CONFIDENCE_THRESHOLD,
    "confidenceThreshold",
    0.65
  );
  const limit = parseOptionalNumber(process.argv[4] ?? process.env.BATCH_LIMIT, "limit", 500);
  const maxBatches = parseOptionalNumber(
    process.argv[5] ?? process.env.MAX_BATCHES,
    "maxBatches",
    20
  );

  const businessId = parseBusinessId(businessArg);
  const prisma = new PrismaClient();

  try {
    let totalScanned = 0;
    let totalTagged = 0;
    let batchesRun = 0;

    while (batchesRun < maxBatches) {
      const result = await autoTagTransactionsV0({
        businessId,
        confidenceThreshold,
        limit
      });

      batchesRun += 1;
      totalScanned += result.scanned;
      totalTagged += result.tagged;

      if (result.scanned < limit || result.tagged === 0) {
        break;
      }
    }

    const coverage = totalScanned === 0 ? 0 : totalTagged / totalScanned;

    console.log({
      businessId: businessId.toString(),
      confidenceThreshold,
      limit,
      maxBatches,
      batchesRun,
      scanned: totalScanned,
      tagged: totalTagged,
      coverage
    });

    const total = await prisma.transaction.count({
      where: { businessId, isDeleted: false }
    });
    const tagged = await prisma.transaction.count({
      where: { businessId, isDeleted: false, categoryId: { not: null } }
    });

    console.log({
      total,
      tagged,
      coverage: total ? tagged / total : 0
    });
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
