/**
 * Minimal CSV serialisation utilities.
 *
 * Rules applied:
 *   - Values that contain a comma, double-quote, or newline are wrapped in
 *     double-quotes.
 *   - Any double-quote inside a value is escaped by doubling it ("").
 *   - null / undefined render as an empty cell.
 *   - Numbers and booleans are coerced to string without quoting.
 */

/**
 * Escapes and optionally quotes a single CSV cell value according to CSV rules.
 * Values with commas, double-quotes, or newlines are wrapped in double-quotes,
 * and double-quotes within the value are escaped by doubling them.
 * @param value - The cell value to format.
 * @returns The escaped CSV cell string.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[,"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes an array of objects to a CSV formatted string.
 * The column headers are determined by the keys of the first object in the array.
 * @param rows - An array of objects to convert to CSV.
 * @returns The CSV formatted string, or an empty string if rows is empty.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines: string[] = [headers.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }

  return lines.join("\n");
}
