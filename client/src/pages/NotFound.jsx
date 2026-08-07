import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-6xl font-bold text-brand-600">404</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Page not found</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          <Home className="h-4 w-4" /> Back home
        </Link>
      </div>
    </div>
  );
}
