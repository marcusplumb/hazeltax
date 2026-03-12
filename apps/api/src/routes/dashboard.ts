// apps/api/src/routes/dashboard.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * GET /api/dashboard
 *
 * Returns:
 * - overdue: periods due before today and not FILED / NOT_APPLICABLE
 * - dueSoon: periods due in next 30 days and not FILED / NOT_APPLICABLE
 * - recentlyFiled: last 20 FILED periods (by filedDate)
 */
router.get("/", async (_req, res) => {
  try {
    const today = startOfToday();
    const dueSoonEnd = addDays(today, 30);

    const overdue = await prisma.filingPeriod.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: ["FILED", "NOT_APPLICABLE"] },
        obligation: { entity: { status: "ACTIVE" } },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
      include: { obligation: { include: { entity: true } } },
    });

    const dueSoon = await prisma.filingPeriod.findMany({
      where: {
        dueDate: { gte: today, lte: dueSoonEnd },
        status: { notIn: ["FILED", "NOT_APPLICABLE"] },
        obligation: { entity: { status: "ACTIVE" } },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
      include: { obligation: { include: { entity: true } } },
    });

    const recentlyFiled = await prisma.filingPeriod.findMany({
      where: {
        status: "FILED",
        obligation: { entity: { status: "ACTIVE" } },
      },
      orderBy: [{ filedDate: "desc" }, { dueDate: "desc" }],
      take: 20,
      include: { obligation: { include: { entity: true } } },
    });

    res.json({
      overdue,
      dueSoon,
      recentlyFiled,
      meta: {
        today: today.toISOString(),
        dueSoonEnd: dueSoonEnd.toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;