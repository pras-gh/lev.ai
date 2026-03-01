export type OverviewRange = "MTD" | "30D" | "90D";

type InrFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signed?: boolean;
};

export function formatInr(value: number, options: InrFormatOptions = {}): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    signed = false
  } = options;

  const normalized = Number.isFinite(value) ? value : 0;
  const absolute = Math.abs(normalized);

  const formatted = absolute.toLocaleString("en-IN", {
    minimumFractionDigits,
    maximumFractionDigits
  });

  if (!signed) {
    return `₹${formatted}`;
  }

  const prefix = normalized < 0 ? "-" : "+";
  return `${prefix}₹${formatted}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized.toFixed(fractionDigits)}%`;
}

export function formatDateRangeLabel(range: OverviewRange, now = new Date()): string {
  const end = new Date(now);
  const start = new Date(now);

  if (range === "MTD") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    const days = range === "30D" ? 29 : 89;
    start.setDate(start.getDate() - days);
  }

  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return `${range} • ${formatter.format(start)} - ${formatter.format(end)}`;
}
