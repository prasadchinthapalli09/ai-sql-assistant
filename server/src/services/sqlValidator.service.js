const ApiError = require("../utils/ApiError");

// Any of these keywords appearing anywhere in the query is grounds for rejection.
// This is intentionally conservative — this app never executes anything but
// a single read-only SELECT statement.
const FORBIDDEN_KEYWORDS = [
  "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
  "MERGE", "TRUNCATE", "GRANT", "REVOKE", "EXECUTE", "CALL",
  "COPY", "VACUUM", "REINDEX", "REPLACE", "RENAME", "LOCK",
  "DO", "COMMENT", "SET", "SECURITY",
];

/**
 * Validates that a generated SQL string is a single, safe, read-only
 * SELECT statement. Throws ApiError(400) if it fails any check.
 */
function validateSelectOnly(sql) {
  if (!sql || typeof sql !== "string" || !sql.trim()) {
    throw new ApiError(400, "No SQL query was generated");
  }

  const cleaned = sql.trim();

  // Strip a single trailing semicolon, then reject if there's another
  // statement after it (stacked queries / SQL injection pattern).
  const withoutTrailingSemicolon = cleaned.replace(/;+\s*$/g, "");
  if (withoutTrailingSemicolon.includes(";")) {
    throw new ApiError(400, "Multiple SQL statements are not allowed");
  }

  // Remove string literals and comments before keyword-scanning, so words
  // like "update" inside a quoted string don't trigger false positives —
  // but note we still reject based on the ORIGINAL structural keywords.
  const withoutComments = withoutTrailingSemicolon
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  const withoutStrings = withoutComments.replace(/'([^'\\]|\\.)*'/g, "''");

  const upper = withoutStrings.toUpperCase();

  if (!/^\s*(SELECT|WITH)\b/.test(upper)) {
    throw new ApiError(400, "Only SELECT queries are permitted");
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    if (pattern.test(upper)) {
      throw new ApiError(400, `Query contains a forbidden keyword: ${keyword}`);
    }
  }

  return withoutTrailingSemicolon;
}

module.exports = { validateSelectOnly };
