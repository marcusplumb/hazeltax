import { Route, Routes } from "react-router-dom";
import Layout from "./ui/Layout";
import DashboardPage from "./pages/DashboardPage";
import EntitiesPage from "./pages/EntitiesPage";
import EntityDetailPage from "./pages/EntityDetailPage";
import ObligationDetailPage from "./pages/ObligationDetailPage";
import PeriodDetailPage from "./pages/PeriodDetailPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/entities" element={<EntitiesPage />} />
        <Route path="/entities/:id" element={<EntityDetailPage />} />
        <Route path="/obligations/:id" element={<ObligationDetailPage />} />
        <Route path="/periods/:id" element={<PeriodDetailPage />} />
      </Route>
    </Routes>
  );
}
