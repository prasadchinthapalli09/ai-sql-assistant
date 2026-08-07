import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2, PlugZap, CheckCircle2, Loader2, Database } from "lucide-react";
import { listConnections, createConnection, testConnection, deleteConnection } from "../api/connections.api";
import { useConnection } from "../context/ConnectionContext.jsx";

export default function Connections() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { activeConnectionId, setActiveConnectionId } = useConnection();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: listConnections,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const createMutation = useMutation({
    mutationFn: createConnection,
    onSuccess: (conn) => {
      toast.success("Database connected!");
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      setActiveConnectionId(conn.id);
      setShowForm(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Connection failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => {
      toast.success("Connection removed");
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: testConnection,
    onSuccess: () => toast.success("Connection is healthy"),
    onError: (err) => toast.error(err.response?.data?.message || "Test failed"),
  });

  const onSubmit = (values) => createMutation.mutate(values);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database Connections</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connect a PostgreSQL database to start asking questions.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" />
          New Connection
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Connection name</label>
            <input className="input-field" placeholder="My Production DB" {...register("name", { required: "Name is required" })} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">PostgreSQL connection string</label>
            <input
              className="input-field font-mono text-xs"
              placeholder="postgresql://user:password@host:5432/dbname?sslmode=require"
              {...register("connectionString", { required: "Connection string is required" })}
            />
            {errors.connectionString && (
              <p className="mt-1 text-xs text-red-500">{errors.connectionString.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              This is encrypted (AES-256) before being stored. We only ever run read-only SELECT queries.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Connect
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : connections?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className={`glass-card p-5 transition ${
                activeConnectionId === conn.id ? "ring-2 ring-brand-500" : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-brand-600" />
                  <h3 className="font-semibold">{conn.name}</h3>
                </div>
                {activeConnectionId === conn.id && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active
                  </span>
                )}
              </div>
              <p className="mb-4 truncate text-xs text-slate-500 dark:text-slate-400">
                {conn.host}:{conn.port}/{conn.database}
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setActiveConnectionId(conn.id)}>
                  Use this DB
                </button>
                <button
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                  onClick={() => testMutation.mutate(conn.id)}
                  disabled={testMutation.isPending}
                >
                  <PlugZap className="h-3.5 w-3.5" /> Test
                </button>
                <button
                  className="btn-secondary !px-3 !py-1.5 text-xs !text-red-500"
                  onClick={() => deleteMutation.mutate(conn.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No connections yet — add one to get started.
        </div>
      )}
    </div>
  );
}
