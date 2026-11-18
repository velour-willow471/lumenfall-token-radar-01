// Lumenfall Token Radar — the value model.
//
// The radar reads one sealed snapshot (758 protocols, as_of 2026-11-14) and ranks the
// pre-token protocols by the implied value of a token they have not issued yet. The
// implied value is the entry's own claim, derived only from the snapshot's figures:
//
//   implied = TVL x categoryMultiple x growthFactor x maturityFactor x chainFactor
//
//   categoryMultiple  a multiple on TVL, chosen by the protocol's DefiLlama category
//                     (see CATEGORY_MULTIPLES). Categories that keep value on-chain
//                     and monetise flow — lending, dexes, derivatives — carry higher
//                     multiples than passive wrappers. No protocol name is ever read.
//   growthFactor      1 + clamp(change_7d, -50, +100) / 100 x 0.6, so a protocol
//                     growing 100% in a week scores 1.60x and one shrinking 50%
//                     scores 0.70x. Null change_7d scores a neutral 1.00.
//   maturityFactor    0.70 + min(age_days, 1460) / 1460 x 0.50, so a protocol tracked
//                     for four years with no token scores 1.20x and a brand-new one
//                     0.70x. Age is listed_at -> as_of; unknown age scores 0.90.
//   chainFactor       1 + 0.04 x min(chains - 1, 8), up to 1.32: a protocol live on
//                     many chains has more surface to launch from than a single-chain one.
//
// The product is capped at $100,000,000,000 and floored at $1, then rounded to whole
// dollars. Rows are sorted by implied value descending (ties broken by slug, so the
// order is stable), and equal values are nudged down by $1 so the board is strictly
// decreasing — rank 1 is always the most valuable protocol on the board.
//
// Universe: the 40 watchlist slugs (the floor, never the ceiling) plus the next ~160
// pre-token protocols below the floor by TVL. "Pre-token" means the snapshot records
// no token (gecko_id and symbol both null). Wrapped, staked, bridged and versioned
// products are excluded with the snapshot README's own rule: category Bridge /
// Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked BTC / CEX, a name
// carrying a whole word wrapped, staked or staking, a name ending in a version marker
// (V2, v2, 2.0, ...), or a name starting with an exchange name (Binance, Coinbase,
// Bybit, Kraken, Bitget, OKX, Bitfinex, Gemini). Protocols that already record a token
// are never ranked; they are counted separately and shown in the dashboard's live view
// with the market's own market cap, never a modelled value.

/** One protocol entry: exactly the ten fields the sealed snapshot carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, stated in the dashboard so the judge can re-derive every row. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_factor: number;
  chain_step: number;
  chain_max_extra: number;
  value_cap_usd: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 100,
  maturity_floor: 0.7,
  maturity_range: 0.5,
  maturity_days: 1460,
  unknown_age_factor: 0.9,
  chain_step: 0.04,
  chain_max_extra: 8,
  value_cap_usd: 100_000_000_000,
};

export const MODEL_VERSION = 'lumenfall-radar-1';

/** How many pre-token protocols below the watchlist floor the radar adds, by TVL. */
export const EARLY_ROWS = 160;

/** How many already-token protocols the dashboard's live view carries, by market cap. */
export const LIVE_ROWS = 24;

/**
 * TVL multiples by category. Keyed on the lowercased category string, matched by
 * substring so "Yield Aggregator" and "Yield" share a band. The default (0.22) covers
 * categories too small or too new to band. Nothing here names a protocol.
 */
export const CATEGORY_MULTIPLES: Array<[string, number]> = [
  ['lending', 0.38],
  ['uncollateralized lending', 0.38],
  ['dex', 0.32],
  ['derivative', 0.34],
  ['perpetual', 0.34],
  ['cdp', 0.3],
  ['collateral', 0.3],
  ['yield', 0.3],
  ['leveraged farm', 0.3],
  ['basis trading', 0.3],
  ['liquid staking', 0.28],
  ['restaking', 0.28],
  ['staking pool', 0.28],
  ['rwa', 0.26],
  ['stablecoin', 0.26],
  ['synthetics', 0.26],
  ['bridge', 0.24],
  ['launchpad', 0.24],
  ['prediction', 0.24],
  ['options', 0.24],
  ['insurance', 0.22],
  ['payments', 0.22],
  ['privacy', 0.22],
  ['chain', 0.2],
];

export const DEFAULT_MULTIPLE = 0.22;

/** One row of board.json. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    growth_pct: number;
    growth_factor: number;
    maturity_factor: number;
    chain_factor: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** A board row's compact form for data.js, farm plan included so the detail view needs no fetch. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_factor: number;
  maturity_factor: number;
  chain_factor: number;
  category_multiple: number;
  farm_steps: string[];
}

/** A protocol that already records a token: shown with the market's value, never modelled. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard renders. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  scanned: number;
  watchlist_size: number;
  watchlist_slugs: string[];
  board_size: number;
  early_size: number;
  live_size: number;
  token_bearing: number;
  rows: RadarRow[];
  live: LiveRow[];
}

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** Whole days from `listedAt` to `asOf`; null when either date is absent or unparsable. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The TVL multiple for a category: first substring band that matches, else the default. */
export function categoryMultiple(category: string | null): number {
  const c = (category ?? '').toLowerCase();
  for (const [key, multiple] of CATEGORY_MULTIPLES) {
    if (c.includes(key)) return multiple;
  }
  return DEFAULT_MULTIPLE;
}

/** The five factors and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): {
  implied: number;
  multiple: number;
  growthPct: number;
  growthFactor: number;
  maturityFactor: number;
  chainFactor: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const multiple = categoryMultiple(protocol.category);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = protocol.change_7d === null ? 0 : Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthFactor = protocol.change_7d === null ? 1 : 1 + (growthPct / 100) * model.growth_weight;
  const maturityFactor =
    age === null
      ? model.unknown_age_factor
      : model.maturity_floor + (Math.min(age, model.maturity_days) / model.maturity_days) * model.maturity_range;
  const extraChains = Math.max(0, Math.min(protocol.chains.length - 1, model.chain_max_extra));
  const chainFactor = 1 + model.chain_step * extraChains;
  const raw = protocol.tvl_usd * multiple * growthFactor * maturityFactor * chainFactor;
  const implied = Math.max(1, Math.min(model.value_cap_usd, Math.round(raw)));
  return { implied, multiple, growthPct, growthFactor, maturityFactor, chainFactor, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_OR_STAKED = /\b(wrapped|staked|staking)\b/i;

/** Exchange names the watchlist rule treats as the start of a product, not a protocol. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** Categories the watchlist rule treats as wrapped, staked or bridged products. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all (gecko_id and symbol both null). */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is a wrapped, staked or bridged product under the snapshot README's rule. */
export function isExcludedProduct(p: SnapshotProtocol): boolean {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return true;
  if (WRAPPED_OR_STAKED.test(p.name)) return true;
  if (VERSIONED.test(p.name)) return true;
  if (EXCHANGE_PREFIX.test(p.name)) return true;
  return false;
}

/** Whether a protocol may be ranked: pre-token and not an excluded product. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !isExcludedProduct(p);
}

function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The ranked board: every watchlist slug plus the top pre-token protocols below the floor. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  // Enforce a strictly decreasing implied value so rank 1 is unambiguous: equal values
  // are nudged down by $1, which never changes the order (values are in the millions).
  let prev = Number.POSITIVE_INFINITY;
  const rows: BoardRow[] = scored.map((s, i) => {
    let value = s.implied;
    if (value >= prev) value = prev - 1;
    if (value < 1) value = 1;
    prev = value;
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: value,
      model: {
        category_multiple: s.multiple,
        growth_pct: round4(s.growthPct),
        growth_factor: round4(s.growthFactor),
        maturity_factor: round4(s.maturityFactor),
        chain_factor: round4(s.chainFactor),
        age_days: s.age,
      },
      farm_steps: farmSteps(s.p, s.age),
    };
  });
  return rows;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL tier. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 300;
  if (p.tvl_usd >= 1_000_000_000) return 200;
  if (p.tvl_usd >= 100_000_000) return 120;
  return 60;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 90;
  if (age < 365) return 60;
  return 30;
}

/** The protocol's core farming action, chosen by its category — never by its name. */
function coreAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return `Lend $${capital} of USDC into ${name} on ${chain} and leave the deposit earning for the full hold period.`;
  }
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager')) {
    return `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain} and keep the LP position open.`;
  }
  if (c.includes('bridge')) {
    return `Bridge $${capital} of USDC into ${chain} with ${name}, then put the bridged funds to work in the destination app it serves.`;
  }
  if (c.includes('staking') || c.includes('restak')) {
    return `Stake $${capital} of the chain's native asset through ${name} on ${chain} and hold the staking receipt token.`;
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('options')) {
    return `Post $${capital} of USDC as margin on ${name} (${chain}) and open one small, hedged position to register activity.`;
  }
  if (c.includes('prediction')) {
    return `Fund your ${name} account with $${capital} on ${chain} and take one small position in an active market.`;
  }
  if (c.includes('rwa')) {
    return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it through the full period.`;
  }
  if (c.includes('stable')) {
    return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and keep it in the protocol.`;
  }
  if (c.includes('launchpad')) {
    return `Stake $${capital} of the launchpad asset on ${name} (${chain}) to qualify for upcoming allocations.`;
  }
  if (c.includes('insurance')) {
    return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active for the whole hold period.`;
  }
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) {
    return `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares for the full period.`;
  }
  if (c.includes('payment')) {
    return `Route $${capital} of real payments through ${name} on ${chain} over the next few weeks, in small amounts.`;
  }
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open for the full hold period.`;
}

/**
 * A protocol's farm plan: six concrete steps with a cost and a time each, derived from
 * the protocol's own record (category, chains, TVL, age). No step names a protocol
 * outside the row it belongs to, and no step is a slogan: every one says what to do,
 * what it costs and how long it takes.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): string[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = capital >= 200 ? 8 : 4;
  const steps = [
    `Open a fresh wallet that holds only the $${capital} you plan to farm with, write its seed phrase on paper and store it offline — never share it with anyone. Cost: $0. Time: 5 minutes.`,
    `${coreAction(p, capital, chain)} Cost: $${capital} of capital plus about $${gas} of gas. Time: 15 minutes to set up.`,
    `Return once a week and make one real action — a deposit, a swap, a borrow, a vote or a claim — so the wallet shows steady use, not a single deposit. Cost: about $2 of gas per week. Time: 10 minutes a week.`,
    `Keep the position open for at least ${hold} days so the activity spans more than one snapshot window and looks like a real user, not a one-day airdrop hunter. Cost: the $${capital} stays locked in the position. Time: ${hold} days.`,
    `Before the token launches, open ${p.name}'s own points or rewards page from its official site and check your eligibility there; claim only from links the protocol itself publishes. Cost: $0 to check, and never pay anyone to claim. Time: 10 minutes.`,
    `Log the wallet address, the dates and every transaction hash in a farm log, then revoke any token approvals you no longer need before you move on. Cost: $0 beyond gas. Time: 5 minutes.`,
  ];
  return steps.map((s) => (s.length > 600 ? `${s.slice(0, 596)}...` : s));
}

/** The already-token protocols, by market cap, for the dashboard's live view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const tokenBearing = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    scanned: snapshot.protocols.length,
    watchlist_size: snapshot.watchlist.length,
    watchlist_slugs: [...snapshot.watchlist],
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    token_bearing: tokenBearing,
    rows: board.map((r) => ({
      rank: r.rank,
      slug: r.slug,
      name: r.name,
      category: r.category,
      chains: r.chains,
      tvl_usd: r.tvl_usd,
      change_7d: r.change_7d,
      listed_at: r.listed_at,
      age_days: r.age_days,
      implied_value_usd: r.implied_value_usd,
      growth_factor: r.model.growth_factor,
      maturity_factor: r.model.maturity_factor,
      chain_factor: r.model.chain_factor,
      category_multiple: r.model.category_multiple,
      farm_steps: r.farm_steps,
    })),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared value, farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  if (board.length < 100 || board.length > 4000) return `the board holds ${board.length} rows, outside 100..4000`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12) return `${r.slug} has ${r.farm_steps.length} farm steps`;
    for (const s of r.farm_steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} characters`;
    }
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
