/** Pokémon-types zoals in de JSON-data (Engels, lowercase). */
export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy'

export type MatchupKind = 'super' | 'normal' | 'weak' | 'immune'

/** Nederlandse labels voor kinderen */
export const TYPE_LABELS: Record<PokemonType, string> = {
  normal: 'Normaal',
  fire: 'Vuur',
  water: 'Water',
  electric: 'Elektro',
  grass: 'Gras',
  ice: 'IJs',
  fighting: 'Vecht',
  poison: 'Gif',
  ground: 'Grond',
  flying: 'Vlieg',
  psychic: 'Psychisch',
  bug: 'Insect',
  rock: 'Steen',
  ghost: 'Geest',
  dragon: 'Draak',
  dark: 'Duister',
  steel: 'Staal',
  fairy: 'Fee',
}

/** Kleuren voor type-badges */
export const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  electric: '#f8d030',
  grass: '#78c850',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac',
}

/**
 * Aanvallend type → verdedigend type → multiplier.
 * Alleen afwijkingen van 1×; ontbrekende = neutraal.
 */
const CHART: Partial<Record<PokemonType, Partial<Record<PokemonType, number>>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: {
    fire: 2,
    water: 0.5,
    grass: 0.5,
    ground: 2,
    rock: 2,
    dragon: 0.5,
  },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: {
    fighting: 2,
    poison: 2,
    psychic: 0.5,
    dark: 0,
    steel: 0.5,
  },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: {
    normal: 0,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
  },
  dragon: {
    dragon: 2,
    steel: 0.5,
    fairy: 0,
  },
  dark: {
    fighting: 0.5,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
    fairy: 0.5,
  },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
}

export function isPokemonType(value: string): value is PokemonType {
  return value in TYPE_LABELS
}

export function typeLabel(type: string): string {
  return isPokemonType(type) ? TYPE_LABELS[type] : type
}

export function typeColor(type: string): string {
  return isPokemonType(type) ? TYPE_COLORS[type] : '#888'
}

/** Multiplier van één aanvallend type tegen 1–2 verdedigende types. */
export function typeMultiplier(
  attackType: string,
  defenderTypes: readonly string[],
): number {
  if (!isPokemonType(attackType)) return 1
  let mult = 1
  for (const def of defenderTypes) {
    if (!isPokemonType(def)) continue
    mult *= CHART[attackType]?.[def] ?? 1
  }
  return mult
}

/**
 * Beste matchup: Pokémon gebruikt het type waarmee het
 * het meeste schade doet tegen de tegenstander.
 */
export function bestAttackMultiplier(
  attackerTypes: readonly string[],
  defenderTypes: readonly string[],
): number {
  if (attackerTypes.length === 0) return 1
  return Math.max(
    ...attackerTypes.map((t) => typeMultiplier(t, defenderTypes)),
  )
}

export function matchupKind(multiplier: number): MatchupKind {
  if (multiplier === 0) return 'immune'
  if (multiplier >= 2) return 'super'
  if (multiplier < 1) return 'weak'
  return 'normal'
}

export function matchupLabel(kind: MatchupKind): string {
  switch (kind) {
    case 'super':
      return 'Super effectief'
    case 'weak':
      return 'Niet zo effectief'
    case 'immune':
      return 'Geen effect'
    default:
      return 'Normaal'
  }
}

/** HP-schade voor dit kindvriendelijke gevechtssysteem. */
export function damageFromMultiplier(multiplier: number): number {
  if (multiplier === 0) return 0
  if (multiplier >= 2) return 2
  return 1
}

export function formatTypes(types: readonly string[]): string {
  return types.map(typeLabel).join(' / ')
}
