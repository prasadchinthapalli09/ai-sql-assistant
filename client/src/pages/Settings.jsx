import { Moon, Sun, User, Mail, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your profile and preferences.</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold">Profile</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-slate-400" />
            <span>{user?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-400" />
            <span>{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <button onClick={toggleTheme} className="btn-secondary !px-3 !py-1.5 text-xs">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            Switch to {theme === "dark" ? "Light" : "Dark"} Mode
          </button>
        </div>
      </div>

      <div className="glass-card flex items-start gap-3 p-6 text-sm text-slate-500 dark:text-slate-400">
        <Info className="h-4 w-4 shrink-0" />
        <p>
          All queries executed against your connected databases are strictly read-only (SELECT). Your database
          credentials are encrypted at rest and never exposed to the frontend.
        </p>
      </div>
    </div>
  );
}
