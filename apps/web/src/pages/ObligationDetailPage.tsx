import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Card } from "../ui/Card";
import { Table } from "../ui/Table";

export default function ObligationDetailPage() {
  const { id } = useParams();
  const [ob, setOb] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.obligations.get(id)
      .then(setOb)
      .catch((e) => setErr(String(e)));
  }, [id]);

  if (!id) return <div className="text-red-700">Missing obligation id</div>;

  const entityName = ob?.entity?.legalName ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ob ? ob.filingName : "Obligation"}</h1>
          <p className="text-gray-600">
            {entityName} • {ob?.authority} • {ob?.frequency} • due +{ob?.dueDaysAfterPeriodEnd}d
          </p>
        </div>
        {ob?.entity?.id ? (
          <Link to={`/entities/${ob.entity.id}`} className="text-sm underline">
            Back to entity
          </Link>
        ) : (
          <Link to="/entities" className="text-sm underline">
            Back
          </Link>
        )}
      </div>

      {err && <div className="rounded-md border bg-white p-4 text-red-700">{err}</div>}

      <Card title={`Filing periods (${ob?.periods?.length ?? 0})`}>
        {!ob ? (
          <div className="text-gray-600">Loading…</div>
        ) : (
          <Table headers={["Period", "Due", "Status", ""]}>
            {ob.periods.map((p: any) => {
              const start = new Date(p.periodStart).toLocaleDateString();
              const end = new Date(p.periodEnd).toLocaleDateString();
              const due = new Date(p.dueDate).toLocaleDateString();
              return (
                <tr key={p.id}>
                  <td className="py-2 pr-4">{start} → {end}</td>
                  <td className="py-2 pr-4">{due}</td>
                  <td className="py-2 pr-4">{p.status}</td>
                  <td className="py-2 pr-4">
                    <Link className="underline" to={`/periods/${p.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
