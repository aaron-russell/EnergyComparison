import Decimal, { sum } from '../decimal';
import type { Period } from '../types';
import type { ConsumptionProfile } from './profiles';

type WeightOptions = {
  missing: Period[];
  profile: ConsumptionProfile;
  remainder: Decimal | undefined;
  uniform: boolean;
  notes: Set<string>;
};

function uniformWeights(count: number, allowed: boolean, notes: Set<string>): Decimal[] {
  if (!allowed) {
    throw new Error(
      'Insufficient profile data. Supply a bill total and explicitly allow uniform allocation.',
    );
  }
  notes.add('Uniform allocation authorised for months without sufficient profile data.');
  return Array.from({ length: count }, () => new Decimal(1));
}

export function estimationWeights(options: WeightOptions): Decimal[] {
  const { missing, profile, remainder, uniform, notes } = options;
  if (remainder === undefined && profile.completeDays < 28) {
    throw new Error('28 complete observed days or monthly bill totals are required.');
  }
  const weights = missing.map(profile.meanFor);
  const sufficient = profile.completeDays >= 28 && weights.every((weight) => weight !== undefined);
  if (!sufficient) {
    return uniformWeights(missing.length, remainder !== undefined && uniform, notes);
  }
  if (remainder?.gt(0) && sum(weights).isZero()) {
    return uniformWeights(missing.length, uniform, notes);
  }
  return weights;
}
