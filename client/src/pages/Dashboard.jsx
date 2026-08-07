import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Database, MessageSquareText, Star, History as HistoryIcon, ArrowRight } from "lucide-react";
import { listConnections } from "../api/connections.api";
import { listHistory, listFavorites } from "../api/query.api";
import { useConnection } from "../context/ConnectionContext.jsx";

export default function Dashboard() {
  const { activeConnectionId } = useConnection();
  const { data: connections } = useQuery({ queryKey: ["connections"], queryFn: listConnections });
  const { data: history } = useQuery({ queryKey: ["history", ""], queryFn: () => listHistory({ limit: 5 }) });
  const { data: favorites } = useQuery({ queryKey: ["favorites"], queryFn: listFavorites });

  const activeConn = connections?.find((c) => c.id === activeConnectionId);

  const stats = [
    { label: "Connected Databases", value: connections?.length ?? 0, icon: Database, to: "/connections" },
    { label: "Queries Run", value: history?.total ?? 0, icon: MessageSquareText, to: "/history" },
    { label: "Favorites", value: favorites?.length ?? 0, icon: Star, to: "/favorites" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {activeConn ? `Currently using ${activeConn.name}` : "No active database selected"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="glass-card flex items-center justify-between p-5 transition hover:scale-[1.02]">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
            <Icon className="h-8 w-8 text-brand-500 opacity-70" />
          </Link>
        ))}
      </div>

      <div className="glass-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent Queries</h2>
          <Link to="/history" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {history?.items?.length ? (
          <ul className="space-y-2">
            {history.items.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <HistoryIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{item.naturalLanguage}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No queries yet.</p>
        )}
      </div>

      <Link to="/query" className="btn-primary inline-flex">
        <MessageSquareText className="h-4 w-4" />
        Ask a new question
      </Link>
    </div>
  );
}
