import { ReactNode } from "react";

export function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
