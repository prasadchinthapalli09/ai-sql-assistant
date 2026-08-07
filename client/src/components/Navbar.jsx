import { Moon, Sun, LogOut, Menu } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Navbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/60 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/40 md:px-6">
      <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden text-sm text-slate-500 dark:text-slate-400 md:block">
        Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-xl border border-slate-200 p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="btn-secondary !px-3 !py-2"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
