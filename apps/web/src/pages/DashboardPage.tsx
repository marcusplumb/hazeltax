// apps/web/src/pages/DashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { Table } from "../ui/Table";

type PeriodRow = {
  id: string;
  dueDate: string;
  status: string;
  periodStart?: string;
  periodEnd?: string;
  filedDate?: string | null;

  obligation?: {
    id: string;
    filingName: string;
    jurisdiction: string;
    frequency: string;
    entity?: {
      id: string;
      name: string;
      shortName?: string | null;
      jurisdiction: string;
      entityType: string;
      status: string;
    };
  };
};

type DashboardResponse = {
  overdue: PeriodRow[];
  dueSoon: PeriodRow[];
  recentlyFiled: PeriodRow[];
  meta?: { today: string; dueSoonEnd: string };
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StatusPill({ status }: { status: string }) {
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

function Section({
  title,
  subtitle,
  rows,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: PeriodRow[];
  emptyText: string;
}) {
  return (
    <Card title={title} right={<span style={{ opacity: 0.75 }}>{rows.length}</span>}>
      <div style={{ opacity: 0.7, marginBottom: 10 }}>{subtitle}</div>

      {rows.length === 0 ? (
        <div style={{ opacity: 0.7 }}>{emptyText}</div>
      ) : (
        <Table headers={["Entity", "Filing", "Due", "Status"]}>
          {rows.map((p) => {
            const ent = p.obligation?.entity;
            const entLabel = ent?.shortName ? `${ent.shortName} — ${ent.name}` : ent?.name ?? "—";

            return (
              <tr key={p.id}>
                <td>
                  {ent?.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Link to={`/entities/${ent.id}`} style={{ fontWeight: 700, textDecoration: "none" }}>
                        {entLabel}
                      </Link>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {ent.entityType} · {ent.jurisdiction}
                      </div>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>

                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 700 }}>{p.obligation?.filingName ?? "—"}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {p.obligation?.jurisdiction ?? "—"} · {p.obligation?.frequency ?? "—"}
                    </div>
                  </div>
                </td>

                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 700 }}>{fmtDate(p.dueDate)}</div>
                    {p.periodStart && p.periodEnd ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}
                      </div>
                    ) : null}
                  </div>
                </td>

                <td>
                  <StatusPill status={p.status} />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error(`Dashboard failed: ${res.status}`);
        const json = (await res.json()) as DashboardResponse;
        if (!cancelled) setData(json);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load dashboard";
        if (!cancelled) setErr(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const overdue = data?.overdue?.length ?? 0;
    const dueSoon = data?.dueSoon?.length ?? 0;
    const filed = data?.recentlyFiled?.length ?? 0;
    return { overdue, dueSoon, filed };
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Card title="Overdue">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.overdue}</div>
          <div style={{ opacity: 0.7, marginTop: 6 }}>Past due and not filed</div>
        </Card>

        <Card title="Due in 30 days">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.dueSoon}</div>
          <div style={{ opacity: 0.7, marginTop: 6 }}>Upcoming deadlines</div>
        </Card>

        <Card title="Recently filed">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.filed}</div>
          <div style={{ opacity: 0.7, marginTop: 6 }}>Latest completions</div>
        </Card>

        <Card
          title="Quick actions"
          right={
            <Link to="/entities" style={{ textDecoration: "none", fontWeight: 700 }}>
              Manage entities →
            </Link>
          }
        >
          <div style={{ opacity: 0.7 }}>Jump to entity list to add/update obligations.</div>
        </Card>
      </div>

      {err ? (
        <Card title="Error">
          <div>{err}</div>
        </Card>
      ) : null}

      {!data ? (
        <Card title="Loading">Loading dashboard…</Card>
      ) : (
        <>
          <Section
            title="Overdue"
            subtitle="Due dates before today and not filed."
            rows={data.overdue}
            emptyText="Nothing overdue 🎉"
          />
          <Section
            title="Due in the next 30 days"
            subtitle="Upcoming deadlines to prioritize."
            rows={data.dueSoon}
            emptyText="Nothing due soon."
          />
          <Section
            title="Recently filed"
            subtitle="Latest completions (most recent first)."
            rows={data.recentlyFiled}
            emptyText="No filings marked FILED yet."
          />
        </>
      )}
    </div>
  );
}