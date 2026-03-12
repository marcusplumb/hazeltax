// apps/api/src/routes/documents.ts
import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../lib/prisma";

const router = Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // simple unique-ish name
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    const stamp = Date.now();
    cb(null, `${stamp}-${safe}`);
  },
});

const upload = multer({ storage });

/**
 * GET /api/documents?filingPeriodId=... OR ?entityId=...
 */
router.get("/", async (req, res) => {
  try {
    const filingPeriodId = req.query.filingPeriodId ? String(req.query.filingPeriodId) : undefined;
    const entityId = req.query.entityId ? String(req.query.entityId) : undefined;

    if (!filingPeriodId && !entityId) {
      return res.status(400).json({ error: "Provide filingPeriodId or entityId" });
    }

    const docs = await prisma.document.findMany({
      where: {
        ...(filingPeriodId ? { filingPeriodId } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { uploadedAt: "desc" },
    });

    res.json({ documents: docs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

/**
 * POST /api/documents/upload
 *
 * multipart/form-data
 * fields:
 * - file: (binary)
 * - filingPeriodId?: string
 * - entityId?: string
 * - uploadedById?: string
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Missing file" });

    const filingPeriodId = req.body.filingPeriodId ? String(req.body.filingPeriodId) : undefined;
    const entityId = req.body.entityId ? String(req.body.entityId) : undefined;
    const uploadedById = req.body.uploadedById ? String(req.body.uploadedById) : undefined;

    if (!filingPeriodId && !entityId) {
      return res.status(400).json({ error: "Provide filingPeriodId or entityId" });
    }

    // (Optional) validate foreign keys exist to avoid silent dangling refs
    if (filingPeriodId) {
      const p = await prisma.filingPeriod.findUnique({ where: { id: filingPeriodId } });
      if (!p) return res.status(404).json({ error: "filingPeriodId not found" });
    }
    if (entityId) {
      const e = await prisma.entity.findUnique({ where: { id: entityId } });
      if (!e) return res.status(404).json({ error: "entityId not found" });
    }
    if (uploadedById) {
      const u = await prisma.user.findUnique({ where: { id: uploadedById } });
      if (!u) return res.status(404).json({ error: "uploadedById not found" });
    }

    const doc = await prisma.document.create({
      data: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        filePath: file.path, // absolute-ish path on server
        sizeBytes: file.size,
        uploadedAt: new Date(),

        // set scalar FK fields (NOT relation objects)
        uploadedById: uploadedById ?? null,
        entityId: entityId ?? null,
        filingPeriodId: filingPeriodId ?? null,
      },
    });

    res.status(201).json({ document: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

/**
 * GET /api/documents/:id/download
 * Simple file download endpoint for MVP
 */
router.get("/:id/download", async (req, res) => {
  try {
    const id = req.params.id;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Not found" });

    if (!fs.existsSync(doc.filePath)) return res.status(404).json({ error: "File missing on server" });

    res.download(doc.filePath, doc.fileName);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to download document" });
  }
});

/**
 * DELETE /api/documents/:id
 * Deletes db record and attempts to delete file.
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: "Not found" });

    await prisma.document.delete({ where: { id } });

    try {
      if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    } catch {
      // ignore file delete errors in MVP
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;