/**
 * Minimaler RFC4180-ähnlicher CSV-Parser (Komma/Semikolon/Tab, Anführungszeichen, CRLF/LF).
 * Reicht für Shopify-Exporte ohne Extra-Dependency.
 */
export type CsvDelimiter = "," | ";" | "\t";

export function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Erkennt Trennzeichen anhand der Kopfzeile (Shopify-DE/Excel oft Semikolon). */
export function detectCsvDelimiter(headerLine: string): CsvDelimiter {
  let comma = 0;
  let semi = 0;
  let tab = 0;
  let inQuotes = false;

  for (let i = 0; i < headerLine.length; i += 1) {
    const c = headerLine[i]!;
    if (c === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (c === ",") comma += 1;
    else if (c === ";") semi += 1;
    else if (c === "\t") tab += 1;
  }

  if (tab > comma && tab > semi) return "\t";
  if (semi > comma) return ";";
  return ",";
}

export function parseCsv(text: string, delimiter: CsvDelimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // Shopify/Excel: trailing newline → leere Schlusszeile ignorieren
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === delimiter) {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      pushField();
      pushRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (c === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  if (inQuotes) {
    throw new Error("CSV: ungeschlossenes Anführungszeichen.");
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}

export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim().replace(/^\uFEFF/, ""));
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i += 1) {
      const key = header[i]!;
      if (!key) continue;
      obj[key] = cells[i] ?? "";
    }
    return obj;
  });
}

/** Parst CSV mit BOM-Strip und automatischer Trennzeichen-Erkennung. */
export function parseCsvAuto(text: string): string[][] {
  const normalized = stripUtf8Bom(text);
  const firstLine = normalized.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectCsvDelimiter(firstLine);
  return parseCsv(normalized, delimiter);
}
