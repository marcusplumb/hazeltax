// apps/api/src/routes/obligations.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateFuturePeriods } from "../lib/dates";

type FilingFrequency = "MONTHLY" | "QUARTERLY" | "ANNUAL";

function isFrequency(x: any): x is FilingFrequency {
  return x === "MONTHLY" || x === "QUARTERLY" || x === "ANNUAL";
}

function asInt(x: any, fallback: number) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

const router = Router();

/**
 * GET /api/obligations?entityId=...
 */
router.get("/", async (req, res) => {
  try {
    const entityId = String(req.query.entityId ?? "");
    if (!entityId) return res.status(400).json({ error: "entityId is required" });

    const obligations = await prisma.filingObligation.findMany({
      where: { entityId },
      orderBy: { createdAt: "desc" },
      include: {
        periods: {
          orderBy: { dueDate: "asc" },
          take: 5,
        },
      },
    });

    res.json({ obligations });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load obligations" });
  }
});

/**
 * GET /api/obligations/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const obligation = await prisma.filingObligation.findUnique({
      where: { id },
      include: {
        entity: true,
        periods: { orderBy: { dueDate: "asc" } },
      },
    });

    if (!obligation) return res.status(404).json({ error: "Not found" });
    res.json({ obligation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load obligation" });
  }
});

/**
 * POST /api/obligations
 *
 * Body:
 * {
 *   entityId: string,
 *   filingName: string,
 *   jurisdiction: string,
 *   frequency: "MONTHLY" | "QUARTERLY" | "ANNUAL",
 *   dueDaysAfterPeriodEnd?: number,
 *   responsibleUserId?: string,
 *   active?: boolean,
 *   notes?: string,
 *   generatePeriods?: boolean // default true
 * }
 */
router.post("/", async (req, res) => {
  try {
    const entityId = String(req.body.entityId ?? "").trim();
    const filingName = String(req.body.filingName ?? "").trim();
    const jurisdiction = String(req.body.jurisdiction ?? "").trim();
    const frequencyRaw = req.body.frequency;

    if (!entityId || !filingName || !jurisdiction) {
      return res.status(400).json({ error: "entityId, filingName, and jurisdiction are required" });
    }
    if (!isFrequency(frequencyRaw)) {
      return res.status(400).json({ error: "frequency must be MONTHLY, QUARTERLY, or ANNUAL" });
    }

    const frequency: FilingFrequency = frequencyRaw;
    const dueDaysAfterPeriodEnd = asInt(req.body.dueDaysAfterPeriodEnd, 30);
    const responsibleUserId = req.body.responsibleUserId ? String(req.body.responsibleUserId) : null;
    const active = req.body.active === undefined ? true : Boolean(req.body.active);
    const notes = req.body.notes ? String(req.body.notes) : null;

    const generatePeriods = req.body.generatePeriods === undefined ? true : Boolean(req.body.generatePeriods);

    // Ensure entity exists
    const entity = await prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) return res.status(404).json({ error: "Entity not found" });

    const obligation = await prisma.filingObligation.create({
      data: {
        entityId,
        filingName,
        jurisdiction,
        frequency,
        dueDaysAfterPeriodEnd,
        responsibleUserId,
        active,
        notes,
      },
    });

    // Generate future filing periods (tasks)
    let createdPeriods = 0;
    if (generatePeriods) {
      const periods = generateFuturePeriods({
        frequency,
        dueDaysAfterPeriodEnd,
      });

      if (periods.length > 0) {
        await prisma.filingPeriod.createMany({
          data: periods.map((p: any) => ({
            obligationId: obligation.id,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
            dueDate: p.dueDate,
            status: "NOT_STARTED",
            assignedToId: responsibleUserId ?? undefined,
          })),
        });
        createdPeriods = periods.length;
      }
    }

    const full = await prisma.filingObligation.findUnique({
      where: { id: obligation.id },
      include: {
        entity: true,
        periods: { orderBy: { dueDate: "asc" } },
      },
    });

    res.status(201).json({ obligation: full, createdPeriods });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Failed to create obligation" });
  }
});

/**
 * PATCH /api/obligations/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const existing = await prisma.filingObligation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const data: any = {};

    if (req.body.filingName !== undefined) data.filingName = String(req.body.filingName).trim();
    if (req.body.jurisdiction !== undefined) data.jurisdiction = String(req.body.jurisdiction).trim();

    if (req.body.frequency !== undefined) {
      if (!isFrequency(req.body.frequency)) {
        return res.status(400).json({ error: "frequency must be MONTHLY, QUARTERLY, or ANNUAL" });
      }
      data.frequency = req.body.frequency;
    }

    if (req.body.dueDaysAfterPeriodEnd !== undefined) {
      data.dueDaysAfterPeriodEnd = asInt(req.body.dueDaysAfterPeriodEnd, existing.dueDaysAfterPeriodEnd);
    }

    if (req.body.responsibleUserId !== undefined) {
      data.responsibleUserId = req.body.responsibleUserId ? String(req.body.responsibleUserId) : null;
    }

    if (req.body.active !== undefined) data.active = Boolean(req.body.active);
    if (req.body.notes !== undefined) data.notes = req.body.notes ? String(req.body.notes) : null;

    const updated = await prisma.filingObligation.update({
      where: { id },
      data,
      include: {
        entity: true,
        periods: { orderBy: { dueDate: "asc" } },
      },
    });

    res.json({ obligation: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update obligation" });
  }
});

/**
 * POST /api/obligations/:id/generate-periods
 *
 * Generates another batch of future periods using generateFuturePeriods(),
 * and skips duplicates by (periodStart, periodEnd).
 */
router.post("/:id/generate-periods", async (req, res) => {
  try {
    const id = req.params.id;

    const obligation = await prisma.filingObligation.findUnique({
      where: { id },
      include: { periods: true },
    });
    if (!obligation) return res.status(404).json({ error: "Not found" });

    if (!isFrequency(obligation.frequency)) {
      return res.status(500).json({ error: "Obligation has invalid frequency in DB" });
    }

    const periods = generateFuturePeriods({
      frequency: obligation.frequency,
      dueDaysAfterPeriodEnd: obligation.dueDaysAfterPeriodEnd,
    });

    const existingKeys = new Set(
      obligation.periods.map((p: any) => `${p.periodStart.toISOString()}|${p.periodEnd.toISOString()}`)
    );

    const toCreate = periods.filter(
      (p) => !existingKeys.has(`${p.periodStart.toISOString()}|${p.periodEnd.toISOString()}`)
    );

    if (toCreate.length === 0) return res.json({ created: 0 });

    await prisma.filingPeriod.createMany({
      data: toCreate.map((p: any) => ({
        obligationId: obligation.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        dueDate: p.dueDate,
        status: "NOT_STARTED",
        assignedToId: obligation.responsibleUserId ?? undefined,
      })),
    });

    res.json({ created: toCreate.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate periods" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const existing = await prisma.filingObligation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    await prisma.filingObligation.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete obligation" });
  }
});

export default router;
