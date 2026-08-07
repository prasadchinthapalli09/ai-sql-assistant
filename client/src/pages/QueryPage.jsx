import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Send, Loader2, Copy, Download, Star, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { listConnections } from "../api/connections.api";
import { askQuestion, addFavorite } from "../api/query.api";
import { useConnection } from "../context/ConnectionContext.jsx";
import ChartRenderer from "../components/ChartRenderer.jsx";
import ResultsTable from "../components/ResultsTable.jsx";

const EXAMPLES = [
  "Show me the top 10 customers by revenue",
  "How many orders were placed last month?",
  "What are the 5 most popular products?",
  "Show monthly revenue trend for this year",
];

export default function QueryPage() {
  const { activeConnectionId, setActiveConnectionId } = useConnection();
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState([]); // [{role, content}]
  const [result, setResult] = useState(null);

  const { data: connections } = useQuery({ queryKey: ["connections"], queryFn: listConnections });

  const askMutation = useMutation({
    mutationFn: askQuestion,
    onSuccess: (data) => {
      setResult(data);
      setConversation((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: data.sql },
      ]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Could not answer that question"),
  });

  const favoriteMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: () => toast.success("Saved to favorites"),
    onError: (err) => toast.error(err.response?.data?.message || "Could not save favorite"),
  });

  const handleAsk = (e) => {
    e?.preventDefault();
    if (!activeConnectionId) {
      toast.error("Select a database connection first");
      return;
    }
    if (!question.trim()) return;
    askMutation.mutate({
      connectionId: activeConnectionId,
      question: question.trim(),
      conversationHistory: conversation.slice(-6),
    });
  };

  const copySql = () => {
    if (!result?.sql) return;
    navigator.clipboard.writeText(result.sql);
    toast.success("SQL copied to clipboard");
  };

  const downloadSql = () => {
    if (!result?.sql) return;
    const blob = new Blob([result.sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!connections?.length) {
    return (
      <div className="glass-card mx-auto max-w-lg p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
        <h2 className="mb-2 font-semibold">No database connected</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Connect a PostgreSQL database first before asking questions.
        </p>
        <Link to="/connections" className="btn-primary inline-flex">
          Go to Connections
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ask a Question</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Describe what you want to know — I'll write and run the SQL for you.
        </p>
      </div>

      <div className="glass-card p-4">
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          Active database
        </label>
        <select
          className="input-field"
          value={activeConnectionId || ""}
          onChange={(e) => setActiveConnectionId(e.target.value)}
        >
          <option value="" disabled>
            Select a connection
          </option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.database})
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleAsk} className="glass-card p-4">
        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="e.g. Show me the top 10 customers by revenue"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" disabled={askMutation.isPending} className="btn-primary shrink-0">
            {askMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex}
              onClick={() => setQuestion(ex)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {askMutation.isPending && (
        <div className="space-y-3">
          <div className="skeleton h-10 w-2/3" />
          <div className="skeleton h-40 w-full" />
        </div>
      )}

      {result && !askMutation.isPending && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3.5 w-3.5" /> Generated SQL
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" /> {result.executionTimeMs}ms
              </span>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-emerald-300">
              <code>{result.sql}</code>
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={copySql}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
              <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={downloadSql}>
                <Download className="h-3.5 w-3.5" /> Download .sql
              </button>
              <button
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={() => favoriteMutation.mutate({ historyId: result.historyId, title: question })}
              >
                <Star className="h-3.5 w-3.5" /> Save as favorite
              </button>
            </div>
          </div>

          {result.explanation && (
            <div className="glass-card p-4">
              <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">AI Explanation</div>
              <p className="text-sm leading-relaxed">{result.explanation}</p>
            </div>
          )}

          <ChartRenderer chart={result.chart} rows={result.rows} />
          <ResultsTable columns={result.columns} rows={result.rows} />
        </div>
      )}
    </div>
  );
}
