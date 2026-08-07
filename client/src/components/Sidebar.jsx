import { NavLink } from "react-router-dom";
import { LayoutDashboard, Database, MessageSquareText, History, Star, Settings, Sparkles } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/connections", label: "Connections", icon: Database },
  { to: "/query", label: "Ask a Question", icon: MessageSquareText },
  { to: "/history", label: "History", icon: History },
  { to: "/favorites", label: "Favorites", icon: Star },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/40 md:flex md:flex-col">
      <div className="flex items-center gap-2 px-6 py-6">
        <Sparkles className="h-6 w-6 text-brand-600" />
        <span className="text-lg font-bold">SQL Assistant</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs text-slate-400">v1.0.0 — Portfolio Build</div>
    </aside>
  );
}
