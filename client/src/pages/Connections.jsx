import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2, PlugZap, CheckCircle2, Loader2, Database, Upload, FileSpreadsheet, FileCode, FileBox } from "lucide-react";
import { listConnections, createConnection, testConnection, deleteConnection, uploadDatabaseFile } from "../api/connections.api";
import { useConnection } from "../context/ConnectionContext.jsx";

const FILE_TYPE_META = {
  csv: { label: "CSV", icon: FileSpreadsheet },
  sql: { label: "SQL dump", icon: FileCode },
  sqlite: { label: "SQLite", icon: FileBox },
};

export default function Connections() {
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState("live"); // "live" | "upload"
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
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

  const uploadMutation = useMutation({
    mutationFn: (formData) =>
      uploadDatabaseFile(formData, (evt) => {
        setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
      }),
    onSuccess: (conn) => {
      toast.success(`${conn.name} imported successfully!`);
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      setActiveConnectionId(conn.id);
      setShowForm(false);
      setUploadFile(null);
      setUploadName("");
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Upload failed");
      setUploadProgress(0);
    },
  });

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Choose a file first");
      return;
    }
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadName || uploadFile.name);
    uploadMutation.mutate(formData);
  };

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
        <div className="glass-card p-6">
          <div className="mb-5 flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === "live" ? "bg-white shadow dark:bg-slate-900" : "text-slate-500"
              }`}
            >
              Connect live database
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === "upload" ? "bg-white shadow dark:bg-slate-900" : "text-slate-500"
              }`}
            >
              Upload a file
            </button>
          </div>

          {mode === "live" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  Encrypted (AES-256) before storage. We only ever run read-only SELECT queries.
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
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Dataset name</label>
                <input
                  className="input-field"
                  placeholder="Sales Data 2024"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">File</label>
                <label
                  htmlFor="file-upload"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-brand-400 dark:border-slate-700"
                >
                  <Upload className="h-6 w-6 text-slate-400" />
                  <span className="text-sm font-medium">
                    {uploadFile ? uploadFile.name : "Click to choose a file"}
                  </span>
                  <span className="text-xs text-slate-400">.csv, .sql, or .db/.sqlite — up to 15MB</span>
                </label>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.sql,.db,.sqlite,.sqlite3"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
              {uploadMutation.isPending && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full bg-brand-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={uploadMutation.isPending} className="btn-primary">
                  {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {uploadMutation.isPending ? `Importing... ${uploadProgress}%` : "Upload & Import"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : connections?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {connections.map((conn) => {
            const isUpload = conn.sourceType === "UPLOAD";
            const meta = FILE_TYPE_META[conn.fileType] || {};
            const Icon = isUpload ? meta.icon || FileBox : Database;
            return (
              <div
                key={conn.id}
                className={`glass-card p-5 transition ${
                  activeConnectionId === conn.id ? "ring-2 ring-brand-500" : ""
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-brand-600" />
                    <h3 className="font-semibold">{conn.name}</h3>
                  </div>
                  {activeConnectionId === conn.id && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {isUpload ? `Uploaded · ${meta.label || conn.fileType}` : "Live connection"}
                  </span>
                </div>
                <p className="mb-4 truncate text-xs text-slate-500 dark:text-slate-400">
                  {isUpload ? conn.originalFileName : `${conn.host}:${conn.port}/${conn.database}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setActiveConnectionId(conn.id)}>
                    Use this DB
                  </button>
                  {!isUpload && (
                    <button
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      onClick={() => testMutation.mutate(conn.id)}
                      disabled={testMutation.isPending}
                    >
                      <PlugZap className="h-3.5 w-3.5" /> Test
                    </button>
                  )}
                  <button
                    className="btn-secondary !px-3 !py-1.5 text-xs !text-red-500"
                    onClick={() => deleteMutation.mutate(conn.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No connections yet — add one to get started.
        </div>
      )}
    </div>
  );
}
