// apps/api/prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type FilingFrequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";
type FilingStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "FILED"
  | "EXTENDED"
  | "NOT_APPLICABLE";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)];

const MS_DAY = 24 * 60 * 60 * 1000;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * MS_DAY);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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

function quarterOfMonth(m: number) {
  return Math.floor(m / 3);
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

function genPeriods(opts: {
  frequency: FilingFrequency;
  dueDaysAfterPeriodEnd: number;
  countPast: number;
  countFuture: number;
}): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; status: FilingStatus; filedDate?: Date | null }> {
  const today = startOfDay(new Date());
  const y = today.getFullYear();
  const m = today.getMonth();

  const periods: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date; status: FilingStatus; filedDate?: Date | null }> =
    [];

  const makeStatus = (dueDate: Date): { status: FilingStatus; filedDate?: Date | null } => {
    // Mix of statuses with realism:
    // - Past due dates: mostly FILED, some IN_PROGRESS (late), rarely NOT_STARTED (overdue)
    // - Future due dates: mostly NOT_STARTED, some IN_PROGRESS/UNDER_REVIEW
    const isPastDue = dueDate.getTime() < today.getTime();

    if (isPastDue) {
      const r = Math.random();
      if (r < 0.75) return { status: "FILED", filedDate: addDays(dueDate, -randInt(0, 20)) };
      if (r < 0.9) return { status: "IN_PROGRESS", filedDate: null };
      return { status: "NOT_STARTED", filedDate: null };
    } else {
      const r = Math.random();
      if (r < 0.75) return { status: "NOT_STARTED", filedDate: null };
      if (r < 0.92) return { status: "IN_PROGRESS", filedDate: null };
      return { status: "UNDER_REVIEW", filedDate: null };
    }
  };

  if (opts.frequency === "MONTHLY") {
    // generate past months + future months
    for (let i = opts.countPast; i >= 1; i--) {
      const mm = m - i;
      const d = new Date(y, mm, 1);
      const ps = monthStart(d.getFullYear(), d.getMonth());
      const pe = monthEnd(d.getFullYear(), d.getMonth());
      const due = addDays(pe, opts.dueDaysAfterPeriodEnd);
      const { status, filedDate } = makeStatus(due);
      periods.push({ periodStart: ps, periodEnd: pe, dueDate: due, status, filedDate });
    }
    for (let i = 0; i < opts.countFuture; i++) {
      const mm = m + i;
      const d = new Date(y, mm, 1);
      const ps = monthStart(d.getFullYear(), d.getMonth());
      const pe = monthEnd(d.getFullYear(), d.getMonth());
      const due = addDays(pe, opts.dueDaysAfterPeriodEnd);
      const { status, filedDate } = makeStatus(due);
      periods.push({ periodStart: ps, periodEnd: pe, dueDate: due, status, filedDate });
    }
  }

  if (opts.frequency === "QUARTERLY") {
    const thisQ = quarterOfMonth(m);
    for (let i = opts.countPast; i >= 1; i--) {
      const q = thisQ - i;
      const d = new Date(y, q * 3, 1);
      const yy = d.getFullYear();
      const qq = quarterOfMonth(d.getMonth());
      const ps = quarterStart(yy, qq);
      const pe = quarterEnd(yy, qq);
      const due = addDays(pe, opts.dueDaysAfterPeriodEnd);
      const { status, filedDate } = makeStatus(due);
      periods.push({ periodStart: ps, periodEnd: pe, dueDate: due, status, filedDate });
    }
    for (let i = 0; i < opts.countFuture; i++) {
      const q = thisQ + i;
      const d = new Date(y, q * 3, 1);
      const yy = d.getFullYear();
      const qq = quarterOfMonth(d.getMonth());
      const ps = quarterStart(yy, qq);
      const pe = quarterEnd(yy, qq);
      const due = addDays(pe, opts.dueDaysAfterPeriodEnd);
      const { status, filedDate } = makeStatus(due);
      periods.push({ periodStart: ps, periodEnd: pe, dueDate: due, status, filedDate });
    }
  }

  if (opts.frequency === "ANNUAL") {
    for (let i = opts.countPast; i >= 1; i--) {
      const yy = y - i;
      const ps = yearStart(yy);
      const pe = yearEnd(yy);
      const due = addDays(pe, opts.dueDaysAfterPeriodEnd);
      const { status, filedDate } = makeStatus(due);
      periods.push({ periodStart: ps, periodEnd: pe, dueDate: due, status, filedDate });
    }
    for (let i = 0; i < opts.countFuture; i++) {
      const yy = y + i;
      const ps = yearStart(yy);
      const pe = yearEnd(yy);
      const due = addDays(pe, opts.dueDaysAfterPeriodEnd);
      const { status, filedDate } = makeStatus(due);
      periods.push({ periodStart: ps, periodEnd: pe, dueDate: due, status, filedDate });
    }
  }

  return periods;
}

async function main() {
  // Optional: wipe tables so seeding is repeatable
  await prisma.document.deleteMany();
  await prisma.filingPeriod.deleteMany();
  await prisma.filingObligation.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Demo Tax Manager",
      email: "demo.tax@hazelview.local",
      role: "MANAGER",
    },
  });

  const entityTypes = ["Corp", "LP", "Trust", "Fund"];
  const jurisdictions = [
    "Canada - Ontario",
    "Canada - Alberta",
    "Canada - Quebec",
    "USA - Delaware",
    "USA - New York",
    "UK - England",
  ];
  const yearEnds = ["12-31", "06-30", "09-30", "03-31"];

  const baseNames = [
    "Hazelview Co-Invest",
    "Hazelview Income",
    "Hazelview Growth",
    "Hazelview Opportunity",
    "Hazelview Holdings",
    "Hazelview Real Estate",
    "Hazelview Credit",
    "Hazelview Mortgage",
  ];

  const filingCatalog: Array<{
    filingName: string;
    jurisdiction: string;
    frequency: FilingFrequency;
    dueDays: number;
  }> = [
    { filingName: "GST/HST Return", jurisdiction: "CRA", frequency: "QUARTERLY", dueDays: 30 },
    { filingName: "Payroll Remittance", jurisdiction: "CRA", frequency: "MONTHLY", dueDays: 15 },
    { filingName: "T2 Corporate Income Tax Return", jurisdiction: "CRA", frequency: "ANNUAL", dueDays: 180 },
    { filingName: "T5013 Partnership Return", jurisdiction: "CRA", frequency: "ANNUAL", dueDays: 90 },
    { filingName: "Annual Corporate Return", jurisdiction: "Ontario Registry", frequency: "ANNUAL", dueDays: 60 },
    { filingName: "State Franchise Tax", jurisdiction: "Delaware", frequency: "ANNUAL", dueDays: 120 },
    { filingName: "Sales Tax Return", jurisdiction: "NY Department of Taxation", frequency: "QUARTERLY", dueDays: 20 },
  ];

  // Create 30 entities
  const entities = [];
  for (let i = 1; i <= 30; i++) {
    const base = pick(baseNames);
    const suffix = pick(["LP", "Inc.", "Trust", "Fund", "Holdco"]);
    const name = `${base} ${i} ${suffix}`;
    const shortName = `${base.split(" ")[1] ?? "Entity"} ${i}`;

    const ent = await prisma.entity.create({
      data: {
        name,
        shortName,
        entityType: pick(entityTypes),
        jurisdiction: pick(jurisdictions),
        taxYearEnd: pick(yearEnds),
        status: Math.random() < 0.92 ? "ACTIVE" : "INACTIVE",
        ownerUserId: user.id,
        notes: Math.random() < 0.25 ? "Seeded demo notes (e.g., special filing nuance)" : null,
      },
    });

    entities.push(ent);
  }

  // For each entity, create 2–5 obligations, each with periods
  for (const ent of entities) {
    const numOb = randInt(2, 5);
    const chosen = new Set<string>();

    for (let k = 0; k < numOb; k++) {
      // pick a unique filing type per entity where possible
      let item = pick(filingCatalog);
      let tries = 0;
      while (chosen.has(item.filingName) && tries < 10) {
        item = pick(filingCatalog);
        tries++;
      }
      chosen.add(item.filingName);

      const ob = await prisma.filingObligation.create({
        data: {
          entityId: ent.id,
          filingName: item.filingName,
          jurisdiction: item.jurisdiction,
          frequency: item.frequency,
          dueDaysAfterPeriodEnd: item.dueDays,
          active: ent.status === "ACTIVE" ? Math.random() < 0.95 : Math.random() < 0.3,
          responsibleUserId: user.id,
        },
      });

      const periods = genPeriods({
        frequency: item.frequency,
        dueDaysAfterPeriodEnd: item.dueDays,
        countPast: item.frequency === "ANNUAL" ? 2 : 3,
        countFuture: item.frequency === "ANNUAL" ? 2 : 6,
      });

      await prisma.filingPeriod.createMany({
        data: periods.map((p) => ({
          obligationId: ob.id,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          dueDate: p.dueDate,
          status: p.status,
          filedDate: p.filedDate ?? null,
          assignedToId: user.id,
          confirmationNumber: p.status === "FILED" ? `CNF-${randInt(100000, 999999)}` : null,
          notes: Math.random() < 0.15 ? "Seeded period note (e.g., waiting on K-1 / TB)" : null,
        })),
      });
    }
  }

  console.log("✅ Demo seed complete: 30 entities + obligations + periods.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });