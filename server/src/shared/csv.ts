import { toDateOnly, toNumber } from './dto';

export type CsvValue = string | number | boolean | Date | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

export function createCsv<T>(columns: Array<CsvColumn<T>>, rows: T[]) {
  const lines = [
    columns.map((column) => escapeCsvCell(column.header)).join(','),
    ...rows.map((row) =>
      columns.map((column) => escapeCsvCell(formatCsvValue(column.value(row)))).join(','),
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function formatCsvValue(value: CsvValue) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return toDateOnly(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'object') {
    return String(toNumber(value));
  }
  return value;
}

export function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
