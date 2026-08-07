import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Star, Trash2 } from "lucide-react";
import { listFavorites, removeFavorite } from "../api/query.api";

export default function Favorites() {
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: listFavorites,
  });

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      toast.success("Removed from favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Favorites</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your saved, reusable queries.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : favorites?.length ? (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div key={fav.id} className="glass-card p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                  <p className="font-medium">{fav.title}</p>
                </div>
                <button
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => removeMutation.mutate(fav.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-2 text-xs text-emerald-300">
                <code>{fav.history?.generatedSql}</code>
              </pre>
              <p className="mt-2 text-xs text-slate-400">
                {fav.connection?.name || "Unknown DB"} · saved {new Date(fav.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No favorites yet — save a query from the Ask page.
        </div>
      )}
    </div>
  );
}
