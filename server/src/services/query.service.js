const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { decrypt } = require("../utils/crypto");
const { getPool } = require("../utils/pgPoolManager");
const { getConnectionOrThrow } = require("./database.service");
const { discoverSchema } = require("./schema.service");
const { generateSql, explainResults } = require("./ai.service");
const { validateSelectOnly } = require("./sqlValidator.service");
const { suggestChart } = require("../utils/chartSelector");

const QUERY_TIMEOUT_MS = 15000;
const MAX_ROWS_RETURNED = 500;

/**
 * Full pipeline: natural language -> schema-aware SQL -> validate -> execute
 * -> chart suggestion -> AI explanation -> save to history.
 */
async function runNaturalLanguageQuery(userId, { connectionId, question, conversationHistory }) {
  const connection = await getConnectionOrThrow(userId, connectionId);
  const connectionString = decrypt(connection.encryptedConnStr);

  const schema = await discoverSchema(connectionId, connectionString);
  if (schema.tables.length === 0) {
    throw new ApiError(400, "No tables found in the public schema of this database");
  }

  let sql;
  try {
    sql = await generateSql(question, schema.promptText, conversationHistory || []);
    sql = validateSelectOnly(sql);
  } catch (err) {
    await saveHistory(userId, connectionId, question, sql || "", null, false, err.message);
    throw err;
  }

  const pool = getPool(connectionId, connectionString);
  const start = Date.now();
  let result;
  try {
    result = await Promise.race([
      pool.query(sql),
      new Promise((_, reject) =>
        setTimeout(() => reject(new ApiError(504, "Query timed out")), QUERY_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    const message = err.isOperational ? err.message : `Database error: ${err.message}`;
    await saveHistory(userId, connectionId, question, sql, null, false, message);
    throw new ApiError(err.statusCode || 400, message);
  }
  const executionTimeMs = Date.now() - start;

  const rows = result.rows.slice(0, MAX_ROWS_RETURNED);
  const chart = suggestChart(rows);

  let explanation = "";
  try {
    explanation = await explainResults(question, sql, rows);
  } catch (err) {
    explanation = "AI explanation unavailable right now.";
  }

  const history = await saveHistory(
    userId,
    connectionId,
    question,
    sql,
    { executionTimeMs, rowCount: rows.length },
    true,
    null
  );

  return {
    historyId: history.id,
    sql,
    rows,
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    rowCount: result.rowCount,
    truncated: result.rowCount > MAX_ROWS_RETURNED,
    executionTimeMs,
    chart,
    explanation,
  };
}

async function saveHistory(userId, connectionId, question, sql, meta, success, errorMessage) {
  return prisma.queryHistory.create({
    data: {
      naturalLanguage: question,
      generatedSql: sql,
      executionTimeMs: meta?.executionTimeMs ?? null,
      rowCount: meta?.rowCount ?? null,
      success,
      errorMessage,
      userId,
      connectionId,
    },
  });
}

module.exports = { runNaturalLanguageQuery };
