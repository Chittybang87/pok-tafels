export type Screen =
  | 'starter'
  | 'home'
  | 'settings'
  | 'battle'
  | 'heal'
  | 'party'
  | 'pokedex'

export interface PokemonSpecies {
  id: number
  name: string
  types: string[]
  generation: Generation
}

export type Generation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface GenerationInfo {
  id: Generation
  label: string
  region: string
  start: number
  end: number
}

export interface PartyMember {
  instanceId: string
  pokemonId: number
  hp: number
  maxHp: number
}

export type MathMode = 'tables' | 'sums'

/** Bovengrens voor plus/min-getallen */
export type SumMax = 5 | 10 | 20 | 50 | 100

export interface Settings {
  /** Tafels 0 t/m 10 die actief zijn */
  activeTables: number[]
  /** Maaltafels of plus/min */
  mathMode: MathMode
  /** Bij maaltafels: vermenigvuldig-vragen */
  includeMultiply: boolean
  /** Bij maaltafels: gedeeld-door-vragen (met dezelfde tafels) */
  includeDivision: boolean
  /** Moeilijkheid plus/min: getallen van 0 t/m deze waarde */
  sumMax: SumMax
  /** Pokémon-generaties die in gevechten en Pokédex meedoen */
  activeGenerations: Generation[]
}

export interface Progress {
  starterChosen: boolean
  activePartnerInstanceId: string | null
  party: PartyMember[]
  caughtIds: number[]
  seenIds: number[]
  battlesWon: number
  /** Goed beantwoorde sommen (gevecht + herstellen) */
  correctAnswers: number
}

export interface MathQuestion {
  a: number
  b: number
  answer: number
  display: string
}

export const MAX_HP = 5
/** Hoeveel Pokémon je meeneemt in gevechten */
export const MAX_PARTY_SIZE = 6
export const ALL_TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const SUM_MAX_OPTIONS = [5, 10, 20, 50, 100] as const
export const STARTER_IDS = [1, 4, 7] as const

export const GENERATIONS: GenerationInfo[] = [
  { id: 1, label: 'Gen 1', region: 'Kanto', start: 1, end: 151 },
  { id: 2, label: 'Gen 2', region: 'Johto', start: 152, end: 251 },
  { id: 3, label: 'Gen 3', region: 'Hoenn', start: 252, end: 386 },
  { id: 4, label: 'Gen 4', region: 'Sinnoh', start: 387, end: 493 },
  { id: 5, label: 'Gen 5', region: 'Unova', start: 494, end: 649 },
  { id: 6, label: 'Gen 6', region: 'Kalos', start: 650, end: 721 },
  { id: 7, label: 'Gen 7', region: 'Alola', start: 722, end: 809 },
  { id: 8, label: 'Gen 8', region: 'Galar', start: 810, end: 905 },
  { id: 9, label: 'Gen 9', region: 'Paldea', start: 906, end: 1025 },
]

export const ALL_GENERATIONS = GENERATIONS.map((g) => g.id)
