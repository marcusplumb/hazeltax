// apps/api/src/lib/dates.ts

export type FilingFrequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";

const MS_DAY = 24 * 60 * 60 * 1000;

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * MS_DAY);
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function monthStart(y: number, m: number) {
  return new Date(y, m, 1);
}
function monthEnd(y: number, m: number) {
  return endOfDay(new Date(y, m + 1, 0));
}

function quarterStart(y: number, q: number) {
  return new Date(y, q * 3, 1);
}
function quarterEnd(y: number, q: number) {
  return endOfDay(new Date(y, q * 3 + 3, 0));
}

function yearStart(y: number) {
  return new Date(y, 0, 1);
}
function yearEnd(y: number) {
  return endOfDay(new Date(y, 11, 31));
}

/**
 * Generate future periods for an obligation.
 * dueDate = periodEnd + dueDaysAfterPeriodEnd
 */
export function generateFuturePeriods(args: {
  frequency: FilingFrequency;
  dueDaysAfterPeriodEnd: number;
  from?: Date;
}): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date }> {
  const anchor = args.from ? new Date(args.from) : new Date();
  const y = anchor.getFullYear();
  const m = anchor.getMonth();

  if (args.frequency === "MONTHLY") {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(y, m + i, 1);
      const ps = monthStart(d.getFullYear(), d.getMonth());
      const pe = monthEnd(d.getFullYear(), d.getMonth());
      out.push({ periodStart: ps, periodEnd: pe, dueDate: addDays(pe, args.dueDaysAfterPeriodEnd) });
    }
    return out;
  }

  if (args.frequency === "QUARTERLY") {
    const currentQuarter = Math.floor(m / 3);
    const out = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(y, (currentQuarter + i) * 3, 1);
      const yy = d.getFullYear();
      const qq = Math.floor(d.getMonth() / 3);
      const ps = quarterStart(yy, qq);
      const pe = quarterEnd(yy, qq);
      out.push({ periodStart: ps, periodEnd: pe, dueDate: addDays(pe, args.dueDaysAfterPeriodEnd) });
    }
    return out;
  }

  const out = [];
  for (let i = 0; i < 3; i++) {
    const yy = y + i;
    const ps = yearStart(yy);
    const pe = yearEnd(yy);
    out.push({ periodStart: ps, periodEnd: pe, dueDate: addDays(pe, args.dueDaysAfterPeriodEnd) });
  }
  return out;
}
