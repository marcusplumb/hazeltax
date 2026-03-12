import { Link, NavLink, Outlet } from "react-router-dom";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm ${isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold">
            Tax Compliance MVP
          </Link>
          <nav className="flex gap-2">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/entities" label="Entities" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
