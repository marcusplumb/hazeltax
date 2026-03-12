// apps/web/src/pages/EntitiesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { Table } from "../ui/Table";

type EntityRow = {
  id: string;
  name: string;
  shortName?: string | null;
  entityType: string;
  jurisdiction: string;
  taxYearEnd?: string | null;
  status: string;
};

type EntitiesResponse = {
  entities: EntityRow[];
};

function contains(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

export default function EntitiesPage() {
  const [data, setData] = useState<EntityRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/entities");
        if (!res.ok) throw new Error(`Entities failed: ${res.status}`);
        const json = (await res.json()) as EntitiesResponse;
        if (!cancelled) setData(json.entities ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load entities";
        if (!cancelled) setErr(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!q.trim()) return rows;

    return rows.filter((e) => {
      const blob = `${e.name} ${e.shortName ?? ""} ${e.entityType} ${e.jurisdiction} ${e.status}`;
      return contains(blob, q.trim());
    });
  }, [data, q]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        title="Entities"
        right={<span style={{ opacity: 0.75 }}>{(data?.length ?? 0).toString()}</span>}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search entities…"
            style={{
              width: "min(520px, 100%)",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              outline: "none",
            }}
          />
          <div style={{ opacity: 0.7 }}>
            Showing <b>{filtered.length}</b> of <b>{data?.length ?? 0}</b>
          </div>
        </div>
      </Card>

      {err ? (
        <Card title="Error">
          <div>{err}</div>
        </Card>
      ) : null}

      {!data ? (
        <Card title="Loading">Loading entities…</Card>
      ) : (
        <Card title="All entities">
          {filtered.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No entities match your search.</div>
          ) : (
            <Table headers={["Entity", "Type", "Jurisdiction", "Year-end", "Status"]}>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Link to={`/entities/${e.id}`} style={{ fontWeight: 800, textDecoration: "none" }}>
                        {e.shortName ? `${e.shortName} — ${e.name}` : e.name}
                      </Link>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{e.id}</div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{e.entityType}</td>
                  <td>{e.jurisdiction}</td>
                  <td>{e.taxYearEnd ?? "—"}</td>
                  <td style={{ fontWeight: 800 }}>{e.status}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}