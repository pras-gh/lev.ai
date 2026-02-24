import { PrismaClient } from "@prisma/client";

const DEFAULT_CATEGORIES = [
  { name: "Revenue", kind: "income", description: "Top-level operating inflows" },
  { name: "Sales Revenue", kind: "income", description: "Primary customer collections" },
  { name: "Other Income", kind: "income", description: "Interest and miscellaneous income" },
  { name: "Payroll", kind: "expense", description: "Salaries, wages, and payroll runs" },
  { name: "Logistics", kind: "expense", description: "Shipping, courier, and fulfillment costs" },
  { name: "COGS", kind: "expense", description: "Direct cost of goods/services sold" },
  { name: "Salaries", kind: "expense", description: "Employee payroll and benefits" },
  { name: "Fixed Cost", kind: "expense", description: "Recurring overheads and fixed expenses" },
  { name: "Rent", kind: "expense", description: "Office/store rent" },
  { name: "Rent/Utilities", kind: "expense", description: "Rent, electricity, and internet bills" },
  { name: "Utilities", kind: "expense", description: "Electricity, internet, phone" },
  { name: "Marketing", kind: "expense", description: "Ads, campaigns, promotions" },
  { name: "SaaS", kind: "expense", description: "Cloud and software subscriptions" },
  { name: "Software", kind: "expense", description: "SaaS subscriptions and tools" },
  { name: "Bank Charges", kind: "expense", description: "Banking and payment gateway fees" },
  { name: "Tax", kind: "tax", description: "GST/TDS/other tax payments" },
  { name: "Taxes", kind: "tax", description: "GST/TDS/other tax payments" },
  { name: "Owner Draw", kind: "transfer", description: "Owner withdrawals or capital movements" },
  { name: "Internal Transfer", kind: "transfer", description: "Transfers between own accounts" },
  { name: "Uncategorized", kind: "other", description: "Fallback category for uncategorized rows" }
];

function usage() {
  console.log("Usage:");
  console.log("  npm run db:seed-categories -- <businessId>");
  console.log("  BUSINESS_ID=<businessId> npm run db:seed-categories");
}

function parseBusinessId(raw) {
  if (!raw) {
    return null;
  }

  const value = String(raw).trim();
  if (!/^[0-9]+$/.test(value)) {
    throw new Error("businessId must be a positive integer");
  }

  const id = BigInt(value);
  if (id <= 0n) {
    throw new Error("businessId must be a positive integer");
  }

  return id;
}

async function run() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }

  const businessId = parseBusinessId(process.argv[2] ?? process.env.BUSINESS_ID);
  if (!businessId) {
    usage();
    throw new Error("Missing businessId");
  }

  const prisma = new PrismaClient();

  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true }
    });

    if (!business) {
      throw new Error(`Business ${businessId.toString()} not found`);
    }

    const inserted = await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        businessId,
        name: category.name,
        kind: category.kind,
        description: category.description
      })),
      skipDuplicates: true
    });

    const total = await prisma.category.count({
      where: { businessId }
    });

    console.log({
      businessId: business.id.toString(),
      businessName: business.name,
      insertedCount: inserted.count,
      totalCategoriesForBusiness: total
    });
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
