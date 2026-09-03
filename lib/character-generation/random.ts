export type RandomSource = () => number;

export type WeightedValue<T> = {
  value: T;
  weight: number;
};

function randomUnit(random: RandomSource) {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1 - Number.EPSILON);
}

export function randomInt(
  min: number,
  max: number,
  random: RandomSource = Math.random,
) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) {
    throw new RangeError("randomInt requires a finite min less than or equal to max.");
  }

  return lower + Math.floor(randomUnit(random) * (upper - lower + 1));
}

export function randomItem<T>(
  values: readonly T[],
  random: RandomSource = Math.random,
): T | undefined {
  if (!values.length) return undefined;
  return values[randomInt(0, values.length - 1, random)];
}

export function shuffle<T>(
  values: readonly T[],
  random: RandomSource = Math.random,
) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, random);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function randomItems<T>(
  values: readonly T[],
  min: number,
  max: number,
  random: RandomSource = Math.random,
) {
  if (min > max) {
    throw new RangeError("randomItems requires min less than or equal to max.");
  }

  const uniqueValues = [...new Set(values)];
  if (!uniqueValues.length) return [];

  const lower = Math.min(Math.max(0, Math.ceil(min)), uniqueValues.length);
  const upper = Math.min(Math.max(lower, Math.floor(max)), uniqueValues.length);
  return shuffle(uniqueValues, random).slice(
    0,
    randomInt(lower, upper, random),
  );
}

export function weightedRandom<T>(
  values: readonly WeightedValue<T>[],
  random: RandomSource = Math.random,
): T | undefined {
  const eligible = values.filter(
    (entry) => Number.isFinite(entry.weight) && entry.weight > 0,
  );
  const total = eligible.reduce((sum, entry) => sum + entry.weight, 0);
  if (!eligible.length || total <= 0) return undefined;

  let cursor = randomUnit(random) * total;
  for (const entry of eligible) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.value;
  }

  return eligible.at(-1)?.value;
}

export function chance(
  probability: number,
  random: RandomSource = Math.random,
) {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  return randomUnit(random) < probability;
}

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}
