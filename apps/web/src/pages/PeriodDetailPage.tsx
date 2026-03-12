import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Card } from "../ui/Card";

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "UNDER_REVIEW", "FILED", "EXTENDED", "NOT_APPLICABLE"] as const;

export default function PeriodDetailPage() {
  const { id } = useParams();
  const [period, setPeriod] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.periods.get(id)
      .then(setPeriod)
      .catch((e) => setErr(String(e)));
  }, [id]);

  const title = useMemo(() => {
    const entity = period?.obligation?.entity?.legalName ?? "Entity";
    const filing = period?.obligation?.filingName ?? "Filing";
    return `${entity} — ${filing}`;
  }, [period]);

  async function updateStatus(status: string) {
    if (!id) return;
    setSaving(true);
    setErr(null);
    try {
      const payload: any = { status };
      if (status === "FILED") payload.filedDate = new Date().toISOString();
      const p = await api.periods.patch(id, payload);
      setPeriod(p);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!id) return <div className="text-red-700">Missing filing period id</div>;

  const start = period ? new Date(period.periodStart).toLocaleDateString() : "—";
  const end = period ? new Date(period.periodEnd).toLocaleDateString() : "—";
  const due = period ? new Date(period.dueDate).toLocaleDateString() : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-gray-600">{start} → {end} • Due {due}</p>
        </div>

        {period?.obligation?.id ? (
          <Link className="text-sm underline" to={`/obligations/${period.obligation.id}`}>
            Back to obligation
          </Link>
        ) : (
          <Link className="text-sm underline" to="/">
            Back
          </Link>
        )}
      </div>

      {err && <div className="rounded-md border bg-white p-4 text-red-700">{err}</div>}

      <Card title="Status">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={saving || !period}
              onClick={() => updateStatus(s)}
              className={`rounded-md border px-3 py-2 text-sm ${period?.status === s ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Current: <span className="font-medium text-gray-900">{period?.status ?? "—"}</span>
          {period?.filedDate ? (
            <> • Filed: <span className="font-medium text-gray-900">{new Date(period.filedDate).toLocaleString()}</span></>
          ) : null}
        </div>
      </Card>

      <Card title="Notes">
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={5}
          value={period?.notes ?? ""}
          onChange={(e) => setPeriod((p: any) => ({ ...p, notes: e.target.value }))}
        />
        <button
          disabled={!period || saving}
          className="mt-3 rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
          onClick={async () => {
            if (!id) return;
            setSaving(true);
            setErr(null);
            try {
              const p = await api.periods.patch(id, { notes: period?.notes ?? "" });
              setPeriod(p);
            } catch (e) {
              setErr(String(e));
            } finally {
              setSaving(false);
            }
          }}
        >
          Save notes
        </button>
      </Card>

      <Card title="Documents (MVP: upload via API)">
        <p className="text-sm text-gray-600">
          For now, documents are supported at the API level (POST <code>/api/documents/upload</code>) and served from{" "}
          <code>/uploads</code>. UI upload can be added next.
        </p>
      </Card>
    </div>
  );
}
