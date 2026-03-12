import { FilingFrequency } from "@prisma/client";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function endOfMonth(year: number, monthIndex: number) {
  // monthIndex: 0-11
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
}

function quarterBounds(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  const q = Math.floor(m / 3); // 0-3
  const startMonth = q * 3;
  const endMonth = startMonth + 2;
  const start = new Date(y, startMonth, 1);
  const end = endOfMonth(y, endMonth);
  return { start, end };
}

export type GeneratedPeriod = {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

export function generateFuturePeriods(args: {
  frequency: FilingFrequency;
  dueDaysAfterPeriodEnd: number;
  // anchor date for generating "next" periods (defaults to now)
  from?: Date;
}): GeneratedPeriod[] {
  const from = startOfDay(args.from ?? new Date());
  const dueOffset = args.dueDaysAfterPeriodEnd;

  if (args.frequency === "MONTHLY") {
    // Next 12 months: current month inclusive
    const periods: GeneratedPeriod[] = [];
    const y0 = from.getFullYear();
    const m0 = from.getMonth();
    for (let i = 0; i < 12; i++) {
      const ym = new Date(y0, m0 + i, 1);
      const start = new Date(ym.getFullYear(), ym.getMonth(), 1);
      const end = endOfMonth(ym.getFullYear(), ym.getMonth());
      const due = addDays(end, dueOffset);
      periods.push({ periodStart: start, periodEnd: end, dueDate: due });
    }
    return periods;
  }

  if (args.frequency === "QUARTERLY") {
    // Next 8 quarters, starting current quarter
    const periods: GeneratedPeriod[] = [];
    const { start: qStart } = quarterBounds(from);
    for (let i = 0; i < 8; i++) {
      const d = new Date(qStart.getFullYear(), qStart.getMonth() + i * 3, 1);
      const { start, end } = quarterBounds(d);
      const due = addDays(end, dueOffset);
      periods.push({ periodStart: start, periodEnd: end, dueDate: due });
    }
    return periods;
  }

  // ANNUAL: Next 3 years (calendar-year periods for MVP)
  const periods: GeneratedPeriod[] = [];
  const y = from.getFullYear();
  for (let i = 0; i < 3; i++) {
    const start = new Date(y + i, 0, 1);
    const end = new Date(y + i, 11, 31, 23, 59, 59, 999);
    const due = addDays(end, dueOffset);
    periods.push({ periodStart: start, periodEnd: end, dueDate: due });
  }
  return periods;
}
