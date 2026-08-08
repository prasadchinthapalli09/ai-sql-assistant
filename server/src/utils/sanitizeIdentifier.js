/**
 * Converts an arbitrary string (CSV header, SQLite table name, etc.) into a
 * safe, lowercase, snake_case Postgres identifier. Never trust user-provided
 * names directly in interpolated SQL — always pass them through this first.
 */
function sanitizeIdentifier(raw, fallback = "col") {
  let name = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  if (!name || /^[0-9]/.test(name)) {
    name = `${fallback}_${name || "field"}`;
  }

  // Postgres identifier length limit
  return name.slice(0, 63);
}

/**
 * De-duplicates a list of sanitized identifiers by appending _2, _3, etc.
 * to repeats (e.g. two CSV columns that both sanitize to "name").
 */
function dedupeIdentifiers(names) {
  const seen = new Map();
  return names.map((name) => {
    const count = (seen.get(name) || 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name}_${count}`;
  });
}

/** Wraps an identifier in double quotes for safe interpolation into DDL. */
function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

module.exports = { sanitizeIdentifier, dedupeIdentifiers, quoteIdent };
