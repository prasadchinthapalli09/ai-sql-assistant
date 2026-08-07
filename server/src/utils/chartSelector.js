/**
 * Inspects query result rows and picks a sensible chart type + axis mapping.
 * Falls back to "table" (no chart) when the data doesn't lend itself to one.
 */
function suggestChart(rows) {
  if (!rows || rows.length === 0) {
    return { type: "table", xKey: null, yKey: null };
  }

  const columns = Object.keys(rows[0]);
  if (columns.length < 2) {
    return { type: "table", xKey: null, yKey: null };
  }

  const sample = rows[0];
  const numericCols = columns.filter((c) => typeof sample[c] === "number" || !isNaN(parseFloat(sample[c])) && sample[c] !== null && sample[c] !== "");
  const textCols = columns.filter((c) => !numericCols.includes(c));

  if (numericCols.length === 0 || textCols.length === 0) {
    return { type: "table", xKey: null, yKey: null };
  }

  const xKey = textCols[0];
  const yKey = numericCols[0];

  // Date-like x-axis + numeric y -> line chart (time series)
  const looksLikeDate = /date|time|created|month|year|day/i.test(xKey);
  if (looksLikeDate) {
    return { type: "line", xKey, yKey };
  }

  // Small category count -> pie chart works well
  if (rows.length <= 8) {
    return { type: "pie", xKey, yKey };
  }

  // Medium size categorical comparison -> bar chart
  if (rows.length <= 50) {
    return { type: "bar", xKey, yKey };
  }

  // Large numeric datasets -> scatter
  if (numericCols.length >= 2) {
    return { type: "scatter", xKey: numericCols[0], yKey: numericCols[1] };
  }

  return { type: "bar", xKey, yKey };
}

module.exports = { suggestChart };
