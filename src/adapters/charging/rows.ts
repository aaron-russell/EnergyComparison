import Papa from 'papaparse';
import { IntegrationError } from '../contracts';
import { object, list } from '../response';

export type ImportRow = Record<string, string>;
export type ColumnReader = (names: string[], meaning: string) => string;
const normaliseHeader = (header: string) => header.trim().toLowerCase();

function jsonRows(text: string): ImportRow[] {
  return list(JSON.parse(text)).map((raw) =>
    Object.fromEntries(
      Object.entries(object(raw)).map(([name, value]) => [normaliseHeader(name), cellText(value)]),
    ),
  );
}

export function readRows(text: string): ImportRow[] {
  if (text.length > 10_000_000) {
    throw new IntegrationError('invalid', 'Use an import smaller than 10 MB.');
  }
  try {
    if (text.trim().startsWith('[')) {
      return jsonRows(text);
    }
    const result = Papa.parse<ImportRow>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normaliseHeader,
    });
    // Row length warnings are recoverable: exported CSVs often contain optional
    // trailing columns or commas in fields. Quote errors can shift every later
    // column, so those still make the file unsafe to interpret.
    if (result.errors.some(({ code }) => code === 'MissingQuotes' || code === 'InvalidQuotes')) {
      throw new Error('Invalid CSV');
    }
    if (!result.meta.fields?.some(Boolean)) {
      throw new Error('CSV headers are missing');
    }
    return result.data;
  } catch {
    throw new IntegrationError(
      'invalid',
      'The file could not be read. Use a CSV with headers or a JSON array.',
    );
  }
}

export function columnReader(row: ImportRow, mapping: Map<string, string>): ColumnReader {
  return (names, meaning) => {
    for (const name of names) {
      const value = row[name]?.trim();
      if (value) {
        mapping.set(name, meaning);
        return value;
      }
    }
    return '';
  };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new Error('Charging JSON cells must be scalar values.');
}
