const OpenAI = require("openai");
const ApiError = require("../utils/ApiError");

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new ApiError(500, "GROQ_API_KEY is not configured on the server");
    }
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    });
  }
  return client;
}

const MODEL = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b";

/**
 * Converts a natural language question into a single PostgreSQL SELECT
 * statement, using the discovered schema as grounding context.
 */
async function generateSql(question, schemaPromptText, conversationHistory = []) {
  const systemPrompt = `You are an expert PostgreSQL query generator.

Given a database schema and a natural language question, generate ONE single, safe, read-only PostgreSQL SELECT statement that answers the question.

RULES:
- Output ONLY the raw SQL query, nothing else — no markdown fences, no explanation, no comments.
- Only ever generate a SELECT (or WITH ... SELECT) statement.
- Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE or any other data-modifying statement.
- Use only tables and columns that exist in the schema below.
- Use explicit JOINs based on the foreign key relationships given.
- Add a reasonable LIMIT (e.g. 100) for queries that could return very large result sets, unless the user asked for an aggregate/count.
- If the question cannot be answered with the given schema, return exactly: -- UNABLE_TO_GENERATE: <short reason>

DATABASE SCHEMA:
${schemaPromptText}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: question },
  ];

  const completion = await getClient().chat.completions.create({
    model: MODEL(),
    messages,
    temperature: 0.1,
    max_tokens: 800,
  });

  let sql = completion.choices?.[0]?.message?.content?.trim() || "";
  sql = sql.replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  if (sql.toUpperCase().startsWith("-- UNABLE_TO_GENERATE")) {
    throw new ApiError(422, sql.replace(/--\s*UNABLE_TO_GENERATE:\s*/i, ""));
  }

  return sql;
}

/**
 * Generates a plain-language explanation / insight summary of query results.
 */
async function explainResults(question, sql, rows) {
  const sample = rows.slice(0, 25); // keep prompt small
  const systemPrompt = `You are a data analyst. Given a user's question, the SQL query that was run, and a sample of the resulting rows, write a concise (3-6 sentence) plain-language explanation of what the results show, including any notable trends, patterns, or standout values. Do not repeat the raw data verbatim. Do not mention SQL syntax.`;

  const userPrompt = `Question: ${question}\n\nSQL: ${sql}\n\nRow count: ${rows.length}\nSample rows (JSON): ${JSON.stringify(sample)}`;

  const completion = await getClient().chat.completions.create({
    model: MODEL(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 400,
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}

module.exports = { generateSql, explainResults };
