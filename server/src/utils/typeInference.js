const INT_RE = /^-?\d+$/;
const NUMERIC_RE = /^-?\d+\.\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;
const BOOL_RE = /^(true|false)$/i;

/**
 * Given an array of column names and an array of row objects (string
 * values, as CSVs produce), samples up to `sampleSize` rows per column and
 * infers the narrowest safe Postgres type. Falls back to TEXT whenever a
 * column is empty, mixed, or ambiguous — never guesses wrong at the cost of
 * a failed import.
 */
function inferColumnTypes(columns, rows, sampleSize = 200) {
  const sample = rows.slice(0, sampleSize);
  const types = {};

  for (const col of columns) {
    let allInt = true;
    let allNumeric = true;
    let allDate = true;
    let allBool = true;
    let sawValue = false;

    for (const row of sample) {
      const val = row[col];
      if (val === null || val === undefined || val === "") continue;
      sawValue = true;
      const str = String(val).trim();
      if (!INT_RE.test(str)) allInt = false;
      if (!NUMERIC_RE.test(str) && !INT_RE.test(str)) allNumeric = false;
      if (!DATE_RE.test(str)) allDate = false;
      if (!BOOL_RE.test(str)) allBool = false;
    }

    if (!sawValue) {
      types[col] = "TEXT";
    } else if (allInt) {
      types[col] = "BIGINT";
    } else if (allNumeric) {
      types[col] = "NUMERIC";
    } else if (allDate) {
      types[col] = "TIMESTAMP";
    } else if (allBool) {
      types[col] = "BOOLEAN";
    } else {
      types[col] = "TEXT";
    }
  }

  return types;
}

/** Coerces a raw string cell value for insertion, matching the inferred column type. */
function coerceValue(value, pgType) {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();

  switch (pgType) {
    case "BIGINT":
      return INT_RE.test(str) ? str : null;
    case "NUMERIC":
      return NUMERIC_RE.test(str) || INT_RE.test(str) ? str : null;
    case "BOOLEAN":
      return BOOL_RE.test(str) ? str.toLowerCase() === "true" : null;
    case "TIMESTAMP":
      return DATE_RE.test(str) ? str : null;
    default:
      return str;
  }
}

module.exports = { inferColumnTypes, coerceValue };
