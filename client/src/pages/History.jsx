import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { listHistory, deleteHistoryItem } from "../api/query.api";

export default function History() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["history", search],
    queryFn: () => listHistory({ search, limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHistoryItem,
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Query History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every question you've asked, saved automatically.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field pl-9"
          placeholder="Search your history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : data?.items?.length ? (
        <div className="space-y-3">
          {data.items.map((item) => (
            <div key={item.id} className="glass-card p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <p className="font-medium">{item.naturalLanguage}</p>
                {item.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
              </div>
              <pre className="mb-2 overflow-x-auto rounded-lg bg-slate-900 p-2 text-xs text-emerald-300">
                <code>{item.generatedSql || "-- no SQL generated"}</code>
              </pre>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {item.connection?.name || "Unknown DB"} · {new Date(item.createdAt).toLocaleString()}
                  {item.rowCount != null ? ` · ${item.rowCount} rows` : ""}
                  {item.executionTimeMs != null ? ` · ${item.executionTimeMs}ms` : ""}
                </span>
                <button
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {!item.success && item.errorMessage && (
                <p className="mt-2 text-xs text-red-500">{item.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No history yet — ask your first question.
        </div>
      )}
    </div>
  );
}
