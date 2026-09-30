import Decimal, { isNonNegativeDecimal } from '../../core/decimal';
import { instant, ms } from '../../core/time';
import type { Charging, Period } from '../../core/types';
import { IntegrationError, type ChargingOptions, type Context, type Fields } from '../contracts';
import { cancelled, list, object, str } from '../transport';
import { graphQL, HISTORY_QUERY } from './api';

function parseSession(raw: unknown, supplyRef: string): Charging {
  const node = object(object(raw).node);
  const energy = object(node.energyAdded);
  const value = str(energy.value);
  if (!isNonNegativeDecimal(value) || !['KILOWATT_HOUR', 'WATT_HOUR'].includes(str(energy.unit))) {
    throw new IntegrationError(
      'invalid',
      'SmartFlex returned unavailable or unsupported charging energy units.',
    );
  }
  return {
    id: crypto.randomUUID(),
    supplyRef,
    start: instant(str(node.start)).toString(),
    end: instant(str(node.end)).toString(),
    kWh: new Decimal(value).div(energy.unit === 'WATT_HOUR' ? 1000 : 1).toString(),
    source: 'octopus-smartflex',
    provenance: 'unknown',
    kind: 'session',
    status: 'measured',
    approved: false,
  };
}

export async function chargingHistory(
  fields: Fields,
  deviceId: string,
  period: Period,
  options: ChargingOptions,
  context: Context,
) {
  const sessions = new Map<string, Charging>();
  let after = period.start;
  for (let page = 0; page < 1000; page++) {
    cancelled(context.signal);
    const data = await graphQL(
      fields,
      HISTORY_QUERY,
      { account: fields.account, device: deviceId, after, before: period.end },
      context,
    );
    const device = object(list(data.devices)[0]);
    const history = object(device.chargingSessions);
    for (const edge of list(history.edges)) {
      const session = parseSession(edge, options.supplyRef);
      sessions.set(`${session.start}|${session.end}`, session);
    }
    context.progress({
      completed: sessions.size,
      message: `Imported ${sessions.size} SmartFlex sessions`,
    });
    const info = object(history.pageInfo);
    if (info.hasNextPage === false) {
      return {
        sessions: [...sessions.values()],
        mapping: [],
        notices: [
          'SmartFlex reports session energy, not measured household grid energy. Confirm attribution before approval. Session timing is allocated evenly.',
        ],
      };
    }
    const next = str(info.endCursor);
    if (ms(next) <= ms(after) || ms(next) >= ms(period.end)) {
      throw new IntegrationError(
        'invalid',
        'SmartFlex pagination did not advance safely. Try a smaller date range.',
      );
    }
    after = next;
  }
  throw new IntegrationError('invalid', 'SmartFlex history exceeded the supported page limit.');
}
