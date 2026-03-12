// apps/api/src/routes/periods.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

type FilingStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "FILED"
  | "EXTENDED"
  | "NOT_APPLICABLE";

function isStatus(x: any): x is FilingStatus {
  return (
    x === "NOT_STARTED" ||
    x === "IN_PROGRESS" ||
    x === "UNDER_REVIEW" ||
    x === "FILED" ||
    x === "EXTENDED" ||
    x === "NOT_APPLICABLE"
  );
}

const router = Router();

/**
 * GET /api/periods?obligationId=...
 */
router.get("/", async (req, res) => {
  try {
    const obligationId = String(req.query.obligationId ?? "");
    if (!obligationId) return res.status(400).json({ error: "obligationId is required" });

    const periods = await prisma.filingPeriod.findMany({
      where: { obligationId },
      orderBy: { dueDate: "asc" },
      include: {
        obligation: {
          include: { entity: true },
        },
        documents: true,
      },
    });

    res.json({ periods });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load periods" });
  }
});

/**
 * GET /api/periods/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const period = await prisma.filingPeriod.findUnique({
      where: { id },
      include: {
        obligation: { include: { entity: true } },
        documents: true,
      },
    });

    if (!period) return res.status(404).json({ error: "Not found" });
    res.json({ period });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load period" });
  }
});

/**
 * PATCH /api/periods/:id
 *
 * Body can include:
 * { status, notes, assignedToId, filedDate, confirmationNumber, dueDate }
 *
 * Notes:
 * - If status becomes FILED and filedDate is not provided, we set it automatically.
 * - If status is not FILED, we do not auto-clear filedDate (you can choose to).
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const existing = await prisma.filingPeriod.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const data: any = {};

    if (req.body.status !== undefined) {
      const st = req.body.status;
      if (!isStatus(st)) return res.status(400).json({ error: "Invalid status" });
      data.status = st;

      if (st === "FILED" && req.body.filedDate === undefined && !existing.filedDate) {
        data.filedDate = new Date();
      }
    }

    if (req.body.notes !== undefined) data.notes = req.body.notes ? String(req.body.notes) : null;

    if (req.body.assignedToId !== undefined) {
      data.assignedToId = req.body.assignedToId ? String(req.body.assignedToId) : null;
    }

    if (req.body.confirmationNumber !== undefined) {
      data.confirmationNumber = req.body.confirmationNumber ? String(req.body.confirmationNumber) : null;
    }

    if (req.body.filedDate !== undefined) {
      // Allow null to clear
      data.filedDate = req.body.filedDate ? new Date(req.body.filedDate) : null;
    }

    if (req.body.dueDate !== undefined) {
      data.dueDate = new Date(req.body.dueDate);
    }

    const updated = await prisma.filingPeriod.update({
      where: { id },
      data,
      include: {
        obligation: { include: { entity: true } },
        documents: true,
      },
    });

    res.json({ period: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update period" });
  }
});

export default router;