// apps/api/src/server.ts
import express from "express";
import cors from "cors";

import entitiesRouter from "./routes/entities";
import obligationsRouter from "./routes/obligations";
import periodsRouter from "./routes/periods";
import dashboardRouter from "./routes/dashboard";
import documentsRouter from "./routes/documents";

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/entities", entitiesRouter);
  app.use("/api/obligations", obligationsRouter);
  app.use("/api/periods", periodsRouter);
  app.use("/api/documents", documentsRouter);

  return app;
}