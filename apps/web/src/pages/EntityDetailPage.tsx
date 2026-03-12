// apps/web/src/pages/EntityDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../ui/Card";
import { Table } from "../ui/Table";

type Entity = {
  id: string;
  name: string;
  shortName?: string | null;
  entityType: string;
  jurisdiction: string;
  taxYearEnd?: string | null;
  status: string;
  notes?: string | null;
  obligations?: FilingObligation[];
};

type FilingObligation = {
  id: string;
  filingName: string;
  jurisdiction: string;
  frequency: string;
  dueDaysAfterPeriodEnd: number;
  active: boolean;
  periods?: FilingPeriod[];
};

type FilingPeriod = {
  id: string;
  dueDate: string;
  status: string;
  periodStart: string;
  periodEnd: string;
};

type EntityResponse = { entity: Entity };

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "—").toUpperCase();
  const bg =
    s === "ACTIVE"
      ? "rgba(34, 197, 94, 0.18)"
      : s === "INACTIVE"
      ? "rgba(148, 163, 184, 0.16)"
      : "rgba(255, 255, 255, 0.06)";
  const border =
    s === "ACTIVE"
      ? "rgba(34, 197, 94, 0.25)"
      : s === "INACTIVE"
      ? "rgba(148, 163, 184, 0.25)"
      : "rgba(255, 255, 255, 0.12)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {s}
    </span>
  );
}

function FilingStatusPill({ status }: { status: string }) {
  const s = (status || "—").toUpperCase();
  const bg =
    s === "FILED"
      ? "rgba(34, 197, 94, 0.18)"
      : s === "UNDER_REVIEW"
      ? "rgba(168, 85, 247, 0.18)"
      : s === "IN_PROGRESS"
      ? "rgba(59, 130, 246, 0.18)"
      : s === "EXTENDED"
      ? "rgba(245, 158, 11, 0.18)"
      : "rgba(255, 255, 255, 0.06)";

  const border =
    s === "FILED"
      ? "rgba(34, 197, 94, 0.25)"
      : s === "UNDER_REVIEW"
      ? "rgba(168, 85, 247, 0.25)"
      : s === "IN_PROGRESS"
      ? "rgba(59, 130, 246, 0.25)"
      : s === "EXTENDED"
      ? "rgba(245, 158, 11, 0.25)"
      : "rgba(255, 255, 255, 0.12)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: bg,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {s.replaceAll("_", " ")}
    </span>
  );
}

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/entities/${id}`);
        if (!res.ok) throw new Error(`Entity failed: ${res.status}`);
        const json = (await res.json()) as EntityResponse;
        if (!cancelled) setEntity(json.entity);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load entity";
        if (!cancelled) setErr(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const obligationCount = entity?.obligations?.length ?? 0;

  const upcoming = useMemo(() => {
    const rows: Array<{
      entityId: string;
      obligationId: string;
      obligationName: string;
      dueDate: string;
      status: string;
      periodId: string;
    }> = [];

    for (const ob of entity?.obligations ?? []) {
      for (const p of ob.periods ?? []) {
        rows.push({
          entityId: entity!.id,
          obligationId: ob.id,
          obligationName: ob.filingName,
          dueDate: p.dueDate,
          status: p.status,
          periodId: p.id,
        });
      }
    }

    rows.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return rows.slice(0, 8);
  }, [entity]);

  if (err) {
    return (
      <Card title="Error">
        <div>{err}</div>
        <div style={{ marginTop: 10 }}>
          <Link to="/entities" style={{ textDecoration: "none", fontWeight: 700 }}>
            ← Back to entities
          </Link>
        </div>
      </Card>
    );
  }

  if (!entity) {
    return <Card title="Loading">Loading entity…</Card>;
  }

  const title = entity.shortName ? `${entity.shortName} — ${entity.name}` : entity.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        title={title}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <StatusPill status={entity.status} />
            <Link to="/entities" style={{ textDecoration: "none", fontWeight: 700 }}>
              ← Back
            </Link>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Entity Type</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{entity.entityType}</div>
          </div>

          <div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Jurisdiction</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{entity.jurisdiction}</div>
          </div>

          <div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Tax Year End</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{entity.taxYearEnd ?? "—"}</div>
          </div>

          <div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Obligations</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{obligationCount}</div>
          </div>
        </div>

        {entity.notes ? (
          <div style={{ marginTop: 12, opacity: 0.85 }}>
            <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 4 }}>Notes</div>
            {entity.notes}
          </div>
        ) : null}
      </Card>

      <Card title="Filing obligations" right={<span style={{ opacity: 0.75 }}>{obligationCount}</span>}>
        {obligationCount === 0 ? (
          <div style={{ opacity: 0.7 }}>No obligations yet.</div>
        ) : (
          <Table headers={["Filing", "Jurisdiction", "Frequency", "Due rule", "Active"]}>
            {(entity.obligations ?? []).map((ob) => (
              <tr key={ob.id}>
                <td style={{ fontWeight: 800 }}>
                  {/* If you have an Obligation detail route, change the link to it */}
                  {ob.filingName}
                </td>
                <td>{ob.jurisdiction}</td>
                <td style={{ fontWeight: 700 }}>{ob.frequency}</td>
                <td>{`Period end + ${ob.dueDaysAfterPeriodEnd}d`}</td>
                <td style={{ fontWeight: 800 }}>{ob.active ? "YES" : "NO"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Upcoming periods (preview)" right={<span style={{ opacity: 0.75 }}>{upcoming.length}</span>}>
        {upcoming.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No periods found for this entity (did you generate periods?).</div>
        ) : (
          <Table headers={["Filing", "Due", "Status"]}>
            {upcoming.map((p) => (
              <tr key={p.periodId}>
                <td style={{ fontWeight: 800 }}>{p.obligationName}</td>
                <td>{fmtDate(p.dueDate)}</td>
                <td>
                  <FilingStatusPill status={p.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}