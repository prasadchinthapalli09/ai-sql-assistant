const { getPool } = require("../utils/pgPoolManager");

const COLUMNS_QUERY = `
  SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.ordinal_position;
`;

const PRIMARY_KEYS_QUERY = `
  SELECT
    tc.table_name,
    kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public';
`;

const FOREIGN_KEYS_QUERY = `
  SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
`;

/**
 * Discovers the full public schema of a connected Postgres database:
 * tables, columns, data types, primary keys and foreign key relationships.
 * Returns a structured object AND a compact text representation used for
 * prompting the AI model.
 */
async function discoverSchema(connectionId, connectionString) {
  const pool = getPool(connectionId, connectionString);

  const [columnsRes, pkRes, fkRes] = await Promise.all([
    pool.query(COLUMNS_QUERY),
    pool.query(PRIMARY_KEYS_QUERY),
    pool.query(FOREIGN_KEYS_QUERY),
  ]);

  const tables = {};

  for (const col of columnsRes.rows) {
    if (!tables[col.table_name]) {
      tables[col.table_name] = { name: col.table_name, columns: [], primaryKeys: [], foreignKeys: [] };
    }
    tables[col.table_name].columns.push({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === "YES",
      default: col.column_default,
    });
  }

  for (const pk of pkRes.rows) {
    if (tables[pk.table_name]) {
      tables[pk.table_name].primaryKeys.push(pk.column_name);
    }
  }

  for (const fk of fkRes.rows) {
    if (tables[fk.source_table]) {
      tables[fk.source_table].foreignKeys.push({
        column: fk.source_column,
        referencesTable: fk.target_table,
        referencesColumn: fk.target_column,
      });
    }
  }

  const tableList = Object.values(tables);

  return {
    tables: tableList,
    promptText: buildSchemaPromptText(tableList),
  };
}

function buildSchemaPromptText(tables) {
  return tables
    .map((t) => {
      const cols = t.columns
        .map((c) => {
          const flags = [];
          if (t.primaryKeys.includes(c.name)) flags.push("PK");
          if (!c.nullable) flags.push("NOT NULL");
          return `${c.name} ${c.type}${flags.length ? " (" + flags.join(", ") + ")" : ""}`;
        })
        .join(", ");
      const fks = t.foreignKeys
        .map((f) => `${f.column} -> ${f.referencesTable}.${f.referencesColumn}`)
        .join("; ");
      return `TABLE ${t.name}:\n  Columns: ${cols}${fks ? `\n  Foreign Keys: ${fks}` : ""}`;
    })
    .join("\n\n");
}

module.exports = { discoverSchema };
