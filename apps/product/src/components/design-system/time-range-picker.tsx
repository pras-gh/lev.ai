"use client";

const RANGES = ["MTD", "30D", "90D"] as const;

export type TimeRange = (typeof RANGES)[number];

type TimeRangePickerProps = {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
};

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 p-1"
      role="radiogroup"
      aria-label="Date range"
    >
      {RANGES.map((range) => {
        const active = range === value;

        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            aria-pressed={active}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              active ? "bg-white text-zinc-900" : "text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
            }`}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}
