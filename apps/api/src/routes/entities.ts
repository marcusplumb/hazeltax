// apps/api/src/routes/entities.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

type EntityStatus = "ACTIVE" | "INACTIVE";
const isEntityStatus = (x: any): x is EntityStatus => x === "ACTIVE" || x === "INACTIVE";

const router = Router();

/**
 * GET /api/entities
 */
router.get("/", async (_req, res) => {
  try {
    const entities = await prisma.entity.findMany({
      orderBy: { name: "asc" },
      include: {
        owner: true,
        obligations: true,
      },
    });

    res.json({ entities });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load entities" });
  }
});

/**
 * POST /api/entities
 *
 * Body:
 * {
 *   name: string,
 *   shortName?: string,
 *   entityType: string,
 *   jurisdiction: string,
 *   taxYearEnd?: string,
 *   status?: "ACTIVE" | "INACTIVE",
 *   ownerUserId?: string,
 *   notes?: string
 * }
 */
router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const shortName = req.body.shortName ? String(req.body.shortName).trim() : undefined;
    const entityType = String(req.body.entityType ?? "").trim();
    const jurisdiction = String(req.body.jurisdiction ?? "").trim();
    const taxYearEnd = req.body.taxYearEnd ? String(req.body.taxYearEnd).trim() : undefined;

    const statusRaw = req.body.status;
    const status: EntityStatus = statusRaw === undefined ? "ACTIVE" : statusRaw;

    const ownerUserId = req.body.ownerUserId ? String(req.body.ownerUserId) : undefined;
    const notes = req.body.notes ? String(req.body.notes) : undefined;

    if (!name || !entityType || !jurisdiction) {
      return res.status(400).json({ error: "name, entityType, and jurisdiction are required" });
    }
    if (!isEntityStatus(status)) {
      return res.status(400).json({ error: "status must be ACTIVE or INACTIVE" });
    }

    // (Optional) validate owner user exists
    if (ownerUserId) {
      const u = await prisma.user.findUnique({ where: { id: ownerUserId } });
      if (!u) return res.status(404).json({ error: "ownerUserId not found" });
    }

    const entity = await prisma.entity.create({
      data: {
        name,
        shortName,
        entityType,
        jurisdiction,
        taxYearEnd,
        status,
        ownerUserId: ownerUserId ?? null,
        notes: notes ?? null,
      },
      include: {
        owner: true,
        obligations: true,
      },
    });

    res.status(201).json({ entity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create entity" });
  }
});

/**
 * GET /api/entities/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const entity = await prisma.entity.findUnique({
      where: { id },
      include: {
        owner: true,
        obligations: {
          orderBy: { createdAt: "desc" },
          include: {
            periods: { orderBy: { dueDate: "asc" } },
          },
        },
        documents: { orderBy: { uploadedAt: "desc" } },
      },
    });

    if (!entity) return res.status(404).json({ error: "Not found" });
    res.json({ entity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load entity" });
  }
});

/**
 * PATCH /api/entities/:id
 *
 * Body can include:
 * { name, shortName, entityType, jurisdiction, taxYearEnd, status, ownerUserId, notes }
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const existing = await prisma.entity.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const data: any = {};

    if (req.body.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body.shortName !== undefined) data.shortName = req.body.shortName ? String(req.body.shortName).trim() : null;
    if (req.body.entityType !== undefined) data.entityType = String(req.body.entityType).trim();
    if (req.body.jurisdiction !== undefined) data.jurisdiction = String(req.body.jurisdiction).trim();
    if (req.body.taxYearEnd !== undefined) data.taxYearEnd = req.body.taxYearEnd ? String(req.body.taxYearEnd).trim() : null;

    if (req.body.status !== undefined) {
      const st = req.body.status;
      if (!isEntityStatus(st)) return res.status(400).json({ error: "status must be ACTIVE or INACTIVE" });
      data.status = st;
    }

    if (req.body.ownerUserId !== undefined) {
      const ownerUserId = req.body.ownerUserId ? String(req.body.ownerUserId) : null;
      if (ownerUserId) {
        const u = await prisma.user.findUnique({ where: { id: ownerUserId } });
        if (!u) return res.status(404).json({ error: "ownerUserId not found" });
      }
      data.ownerUserId = ownerUserId;
    }

    if (req.body.notes !== undefined) data.notes = req.body.notes ? String(req.body.notes) : null;

    const entity = await prisma.entity.update({
      where: { id },
      data,
      include: { owner: true, obligations: true },
    });

    res.json({ entity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update entity" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const existing = await prisma.entity.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    await prisma.entity.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete entity" });
  }
});

export default router;