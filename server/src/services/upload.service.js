const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { encrypt } = require("../utils/crypto");
const { createAdminPool } = require("../utils/pgPoolManager");
const { sanitizeIdentifier, dedupeIdentifiers, quoteIdent } = require("../utils/sanitizeIdentifier");
const { inferColumnTypes, coerceValue } = require("../utils/typeInference");

const SAMPLE_DATA_DIR = path.join(__dirname, "..", "..", "sample-data");

// Bundled example datasets every user can try instantly, no upload needed.
const SAMPLE_DATASETS = [
  {
    key: "fifa_world_cup",
    name: "FIFA World Cup Matches",
    description: "Every World Cup match from 1930 to 2026 — teams, scores, stadiums, and results.",
    file: "fifa_world_cup.csv",
  },
  {
    key: "amazon_products",
    name: "Amazon Product Reviews",
    description: "Amazon product listings with prices, ratings, and review data.",
    file: "amazon_products.csv",
  },
  {
    key: "gold_stock_prices",
    name: "Gold Price History",
    description: "Daily gold price history — open, high, low, close, and trading volume.",
    file: "gold_stock_prices.csv",
  },
  {
    key: "marvel_movies",
    name: "Marvel Movies",
    description: "Marvel Cinematic Universe films — ratings, box office, cast, and release info.",
    file: "marvel_movies.csv",
  },
];

function listSampleDatasets() {
  return SAMPLE_DATASETS.map(({ key, name, description }) => ({ key, name, description }));
}

const MAX_ROWS = 50000; // sane cap for a portfolio-scale demo app
const BATCH_SIZE = 500;

// Keywords that would let an uploaded .sql dump escape its isolated schema
// or reach the filesystem/network — blocked even though the dump is the
// user's own file, since Neon's app database is shared across all users.
const DUMP_FORBIDDEN = [
  /DROP\s+DATABASE/i,
  /ALTER\s+SYSTEM/i,
  /\bPROGRAM\b/i, // COPY ... FROM/TO PROGRAM — arbitrary shell execution
  /pg_read_file/i,
  /pg_write_file/i,
  /lo_import/i,
  /lo_export/i,
  /dblink/i,
  /CREATE\s+EXTENSION/i,
  /GRANT\b/i,
  /REVOKE\b/i,
  /ALTER\s+ROLE/i,
  /CREATE\s+ROLE/i,
  /DROP\s+ROLE/i,
];

function generateSchemaName() {
  return `upload_${crypto.randomUUID().replace(/-/g, "_")}`;
}

function deriveOwnConnectionParts() {
  const url = new URL(process.env.DATABASE_URL);
  return { host: url.hostname, port: url.port ? parseInt(url.port, 10) : 5432, database: url.pathname.replace(/^\//, "") };
}

/**
 * Shared finalize step: persists the DatabaseConnection row pointing at our
 * own Neon database, scoped to the freshly-populated schema.
 */
async function saveUploadConnection(userId, { name, schemaName, fileType, originalFileName }) {
  const { host, port, database } = deriveOwnConnectionParts();
  return prisma.databaseConnection.create({
    data: {
      name,
      encryptedConnStr: encrypt(process.env.DATABASE_URL),
      host,
      port,
      database,
      isActive: true,
      lastConnectedAt: new Date(),
      userId,
      sourceType: "UPLOAD",
      schemaName,
      originalFileName,
      fileType,
    },
    select: {
      id: true, name: true, host: true, port: true, database: true,
      isActive: true, lastConnectedAt: true, createdAt: true,
      sourceType: true, schemaName: true, fileType: true, originalFileName: true,
    },
  });
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

async function importCsv(userId, { name, originalFileName, fileBuffer }) {
  let records;
  try {
    records = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    throw new ApiError(400, `Could not parse CSV: ${err.message}`);
  }

  if (records.length === 0) {
    throw new ApiError(400, "CSV file has no data rows");
  }
  if (records.length > MAX_ROWS) {
    throw new ApiError(400, `CSV has ${records.length} rows, which exceeds the ${MAX_ROWS} row limit for this demo app`);
  }

  const rawColumns = Object.keys(records[0]);
  const sanitized = dedupeIdentifiers(rawColumns.map((c) => sanitizeIdentifier(c, "col")));
  const colMap = Object.fromEntries(rawColumns.map((raw, i) => [raw, sanitized[i]]));

  const normalizedRows = records.map((r) => {
    const row = {};
    for (const raw of rawColumns) row[colMap[raw]] = r[raw];
    return row;
  });

  const types = inferColumnTypes(sanitized, normalizedRows);
  const tableName = sanitizeIdentifier(originalFileName.replace(/\.csv$/i, ""), "table") || "data";

  const schemaName = generateSchemaName();
  const adminPool = createAdminPool(process.env.DATABASE_URL);

  try {
    await adminPool.query(`CREATE SCHEMA ${quoteIdent(schemaName)}`);

    const columnDefs = sanitized.map((c) => `${quoteIdent(c)} ${types[c]}`).join(", ");
    await adminPool.query(`CREATE TABLE ${quoteIdent(schemaName)}.${quoteIdent(tableName)} (${columnDefs})`);

    for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
      const batch = normalizedRows.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = batch.map((row, rIdx) => {
        const rowPlaceholders = sanitized.map((c, cIdx) => {
          values.push(coerceValue(row[c], types[c]));
          return `$${rIdx * sanitized.length + cIdx + 1}`;
        });
        return `(${rowPlaceholders.join(", ")})`;
      });
      const insertSql = `INSERT INTO ${quoteIdent(schemaName)}.${quoteIdent(tableName)} (${sanitized
        .map(quoteIdent)
        .join(", ")}) VALUES ${placeholders.join(", ")}`;
      await adminPool.query(insertSql, values);
    }

    return saveUploadConnection(userId, { name, schemaName, fileType: "csv", originalFileName });
  } catch (err) {
    await adminPool.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schemaName)} CASCADE`).catch(() => {});
    throw new ApiError(400, `CSV import failed: ${err.message}`);
  } finally {
    await adminPool.end();
  }
}

// ---------------------------------------------------------------------------
// SQL dump import
// ---------------------------------------------------------------------------

async function importSqlDump(userId, { name, originalFileName, fileBuffer }) {
  const sqlText = fileBuffer.toString("utf-8");

  if (!sqlText.trim()) {
    throw new ApiError(400, "SQL file is empty");
  }
  for (const pattern of DUMP_FORBIDDEN) {
    if (pattern.test(sqlText)) {
      throw new ApiError(400, `SQL dump contains a disallowed statement (${pattern.source}) and cannot be imported`);
    }
  }

  const schemaName = generateSchemaName();
  const adminPool = createAdminPool(process.env.DATABASE_URL);

  try {
    await adminPool.query(`CREATE SCHEMA ${quoteIdent(schemaName)}`);
    // Simple query protocol (no params) supports multiple ; separated
    // statements — this is exactly what lets us replay a whole dump.
    await adminPool.query(`SET search_path TO ${quoteIdent(schemaName)}; ${sqlText}`);

    const { rows } = await adminPool.query(
      `SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1`,
      [schemaName]
    );
    if (rows[0].count === 0) {
      throw new ApiError(400, "The SQL dump did not create any tables");
    }

    return saveUploadConnection(userId, { name, schemaName, fileType: "sql", originalFileName });
  } catch (err) {
    await adminPool.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schemaName)} CASCADE`).catch(() => {});
    throw err instanceof ApiError ? err : new ApiError(400, `SQL dump import failed: ${err.message}`);
  } finally {
    await adminPool.end();
  }
}

// ---------------------------------------------------------------------------
// SQLite import
// ---------------------------------------------------------------------------

const SQLITE_TYPE_MAP = {
  INTEGER: "BIGINT",
  REAL: "NUMERIC",
  NUMERIC: "NUMERIC",
  TEXT: "TEXT",
  BLOB: "TEXT",
};

function mapSqliteType(declaredType) {
  const upper = (declaredType || "").toUpperCase();
  for (const key of Object.keys(SQLITE_TYPE_MAP)) {
    if (upper.includes(key)) return SQLITE_TYPE_MAP[key];
  }
  return "TEXT";
}

async function importSqlite(userId, { name, originalFileName, fileBuffer }) {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();

  let db;
  try {
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } catch (err) {
    throw new ApiError(400, `Could not open SQLite file: ${err.message}`);
  }

  const tablesResult = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  const tableNames = tablesResult[0]?.values?.map((v) => v[0]) || [];

  if (tableNames.length === 0) {
    db.close();
    throw new ApiError(400, "No tables found in this SQLite file");
  }

  const schemaName = generateSchemaName();
  const adminPool = createAdminPool(process.env.DATABASE_URL);

  try {
    await adminPool.query(`CREATE SCHEMA ${quoteIdent(schemaName)}`);

    for (const rawTableName of tableNames) {
      const tableName = sanitizeIdentifier(rawTableName, "table");

      const pragma = db.exec(`PRAGMA table_info("${rawTableName}")`);
      const colInfo = pragma[0]?.values || []; // [cid, name, type, notnull, dflt_value, pk]
      const rawCols = colInfo.map((c) => c[1]);
      const sanitizedCols = dedupeIdentifiers(rawCols.map((c) => sanitizeIdentifier(c, "col")));
      const pgTypes = colInfo.map((c) => mapSqliteType(c[2]));

      if (sanitizedCols.length === 0) continue;

      const columnDefs = sanitizedCols.map((c, i) => `${quoteIdent(c)} ${pgTypes[i]}`).join(", ");
      await adminPool.query(`CREATE TABLE ${quoteIdent(schemaName)}.${quoteIdent(tableName)} (${columnDefs})`);

      const dataResult = db.exec(`SELECT * FROM "${rawTableName}" LIMIT ${MAX_ROWS}`);
      const dataRows = dataResult[0]?.values || [];

      for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
        const batch = dataRows.slice(i, i + BATCH_SIZE);
        if (batch.length === 0) continue;
        const values = [];
        const placeholders = batch.map((row, rIdx) => {
          const rowPlaceholders = sanitizedCols.map((c, cIdx) => {
            values.push(row[cIdx] === undefined ? null : row[cIdx]);
            return `$${rIdx * sanitizedCols.length + cIdx + 1}`;
          });
          return `(${rowPlaceholders.join(", ")})`;
        });
        const insertSql = `INSERT INTO ${quoteIdent(schemaName)}.${quoteIdent(tableName)} (${sanitizedCols
          .map(quoteIdent)
          .join(", ")}) VALUES ${placeholders.join(", ")}`;
        await adminPool.query(insertSql, values);
      }
    }

    return saveUploadConnection(userId, { name, schemaName, fileType: "sqlite", originalFileName });
  } catch (err) {
    await adminPool.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schemaName)} CASCADE`).catch(() => {});
    throw err instanceof ApiError ? err : new ApiError(400, `SQLite import failed: ${err.message}`);
  } finally {
    db.close();
    await adminPool.end();
  }
}

// ---------------------------------------------------------------------------

async function importSampleDataset(userId, sampleKey) {
  const sample = SAMPLE_DATASETS.find((s) => s.key === sampleKey);
  if (!sample) {
    throw new ApiError(404, "Unknown sample dataset");
  }

  const filePath = path.join(SAMPLE_DATA_DIR, sample.file);
  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
  } catch (err) {
    throw new ApiError(500, `Sample dataset file is missing on the server: ${sample.file}`);
  }

  return importCsv(userId, {
    name: sample.name,
    originalFileName: sample.file,
    fileBuffer,
  });
}

async function importFile(userId, { name, originalFileName, fileBuffer }) {
  const ext = originalFileName.split(".").pop().toLowerCase();

  if (ext === "csv") {
    return importCsv(userId, { name, originalFileName, fileBuffer });
  }
  if (ext === "sql") {
    return importSqlDump(userId, { name, originalFileName, fileBuffer });
  }
  if (ext === "db" || ext === "sqlite" || ext === "sqlite3") {
    return importSqlite(userId, { name, originalFileName, fileBuffer });
  }
  throw new ApiError(400, `Unsupported file type ".${ext}" — upload a .csv, .sql, or .db/.sqlite file`);
}

module.exports = { importFile, listSampleDatasets, importSampleDataset };
