import type { Charging } from '../../core/types';
import {
  IntegrationError,
  type ChargingOptions,
  type ChargingPreview,
  type Context,
} from '../contracts';
import { cancelled } from '../transport';
import { readRows, columnReader, type ImportRow, type ColumnReader } from './rows';
import { chargingPeriod } from './timestamps';
import { chargingEnergy } from './energy';

export type ChargingFileFormat = { source: string; homeOnly: boolean };
type ParseContext = {
  options: ChargingOptions;
  format: ChargingFileFormat;
  notices: Set<string>;
  mapping: Map<string, string>;
};

function excludedLocation(read: ColumnReader, context: ParseContext): boolean {
  if (
    !context.format.homeOnly ||
    read(['location type'], 'Home/public filter').toLowerCase() === 'home'
  ) {
    return false;
  }
  context.notices.add('Public and unrecognised locations excluded.');
  return true;
}

function hasEnergy(row: ImportRow): boolean {
  return [
    'grid_kwh',
    'kwh grid (home)',
    'grid kwh',
    'kwh',
    'kwh consumed',
    'total kwh consumed',
    'energy',
  ].some((name) => row[name]?.trim());
}

function parseRow(row: ImportRow, context: ParseContext): Charging | undefined {
  const read = columnReader(row, context.mapping);
  if (excludedLocation(read, context)) {
    return undefined;
  }
  if (!hasEnergy(row)) {
    context.notices.add('Rows without charging energy were excluded.');
    return undefined;
  }
  const period = chargingPeriod(read, context.options, context.notices);
  const energy = chargingEnergy(read, context.options.gridConfirmed);
  const kind = row.kind === 'interval' ? 'interval' : 'session';
  if (kind === 'session') {
    context.notices.add(
      'Session totals are distributed evenly over duration; half-hour timing is estimated.',
    );
  }
  return {
    id: crypto.randomUUID(),
    supplyRef: context.options.supplyRef,
    ...period,
    ...energy,
    source: context.format.source,
    kind,
    status: row.status === 'estimated' ? 'estimated' : 'measured',
    approved: false,
  };
}

function validatedRow(row: ImportRow, index: number, context: ParseContext): Charging | undefined {
  try {
    return parseRow(row, context);
  } catch (error) {
    if (error instanceof IntegrationError) {
      throw error;
    }
    throw new IntegrationError(
      'invalid',
      `Row ${index + 2}: check energy, dates and duration. Ambiguous or nonexistent London times require an explicit UTC offset in the source file.`,
    );
  }
}

export async function parseChargingFile(
  text: string,
  options: ChargingOptions,
  context: Context,
  format: ChargingFileFormat,
): Promise<ChargingPreview> {
  const rows = readRows(text);
  const sessions: Charging[] = [];
  const state: ParseContext = { options, format, notices: new Set(), mapping: new Map() };
  for (let index = 0; index < rows.length; index++) {
    cancelled(context.signal);
    const session = validatedRow(rows[index], index, state);
    if (session) {
      sessions.push(session);
    }
    if (index % 500 === 0) {
      context.progress({ completed: index, message: `Validated ${index} charging rows` });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  if (!sessions.length) {
    throw new IntegrationError('invalid', 'No eligible home charging records were found.');
  }
  state.notices.add('Names, addresses and device identifiers are discarded.');
  return {
    sessions,
    mapping: [...state.mapping].map(([column, meaning]) => ({ column, meaning })),
    notices: [...state.notices],
  };
}
