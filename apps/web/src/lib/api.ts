const BASE = import.meta.env.VITE_API_BASE || "/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export type Entity = {
  id: string;
  legalName: string;
  shortName?: string | null;
  entityType: string;
  jurisdiction: string;
  taxYearEnd: string;
  status: "ACTIVE" | "INACTIVE";
  ownerId?: string | null;
};

export type Obligation = {
  id: string;
  entityId: string;
  filingName: string;
  taxType: string;
  authority: string;
  frequency: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  dueDaysAfterPeriodEnd: number;
  active: boolean;
  responsibleUserId?: string | null;
};

export type FilingPeriod = {
  id: string;
  obligationId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "UNDER_REVIEW" | "FILED" | "EXTENDED" | "NOT_APPLICABLE";
  assignedToId?: string | null;
  filedDate?: string | null;
  notes?: string | null;
  obligation?: { filingName: string; entity?: { legalName: string } };
};

export type Dashboard = {
  overdue: FilingPeriod[];
  dueSoon: FilingPeriod[];
  recentlyFiled: FilingPeriod[];
};

export const api = {
  dashboard: () => http<Dashboard>("/dashboard"),
  entities: {
    list: () => http<any[]>("/entities"),
    get: (id: string) => http<any>(`/entities/${id}`),
    create: (body: Partial<Entity>) => http<Entity>("/entities", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: Partial<Entity>) => http<Entity>(`/entities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => http<void>(`/entities/${id}`, { method: "DELETE" }),
  },
  obligations: {
    list: (entityId?: string) => http<any[]>(`/obligations${entityId ? `?entityId=${entityId}` : ""}`),
    get: (id: string) => http<any>(`/obligations/${id}`),
    create: (body: any) => http<any>("/obligations", { method: "POST", body: JSON.stringify(body) }),
  },
  periods: {
    get: (id: string) => http<any>(`/periods/${id}`),
    patch: (id: string, body: Partial<FilingPeriod>) => http<any>(`/periods/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
};
