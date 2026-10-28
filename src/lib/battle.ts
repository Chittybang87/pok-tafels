import { generationOf, pokemonForGenerations } from './pokemon'
import {
  bestAttackMultiplier,
  damageFromMultiplier,
  matchupKind,
  matchupLabel,
  type MatchupKind,
} from './typeChart'
import type { Generation } from './types'
import { GENERATIONS, MAX_HP } from './types'

export interface TypeMatchup {
  multiplier: number
  kind: MatchupKind
  label: string
  damage: number
}

/** Matchup van aanvaller → verdediger (beste type van de aanvaller). */
export function computeMatchup(
  attackerTypes: readonly string[],
  defenderTypes: readonly string[],
): TypeMatchup {
  const multiplier = bestAttackMultiplier(attackerTypes, defenderTypes)
  const kind = matchupKind(multiplier)
  return {
    multiplier,
    kind,
    label: matchupLabel(kind),
    damage: damageFromMultiplier(multiplier),
  }
}

/** Drempels: 0 / 15 / 40 / 80 / 140 goede antwoorden → tier 0–4 */
const TIER_THRESHOLDS = [0, 15, 40, 80, 140] as const

export type EncounterTier = 0 | 1 | 2 | 3 | 4

const TIER_LABELS = [
  'Route 1',
  'Route 2',
  'Route 3',
  'Victory Road',
  'Elite',
] as const

/** Gewichten [early, mid, late] per encounter-tier */
const TIER_WEIGHTS: Record<EncounterTier, readonly [number, number, number]> = {
  0: [3, 2, 1],
  1: [3, 2, 2],
  2: [2, 3, 2],
  3: [1, 2, 3],
  4: [1, 2, 4],
}

export function encounterTier(correctAnswers: number): EncounterTier {
  const n = Math.max(0, correctAnswers)
  let tier: EncounterTier = 0
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (n >= TIER_THRESHOLDS[i]!) {
      tier = i as EncounterTier
      break
    }
  }
  return tier
}

export function encounterTierLabel(tier: EncounterTier): string {
  return TIER_LABELS[tier]
}

function dexPos(pokemonId: number): number {
  const gen = generationOf(pokemonId)
  const range = GENERATIONS.find((g) => g.id === gen)!
  const span = range.end - range.start
  return span <= 0 ? 0 : (pokemonId - range.start) / span
}

function bandOf(pos: number): 0 | 1 | 2 {
  if (pos <= 0.33) return 0
  if (pos <= 0.66) return 1
  return 2
}

/** Wild HP: gewone Pokémon 3, mid 4, late/legendaries in de gen 5; +1 bij hoge tier */
export function wildMaxHp(pokemonId: number, tier: EncounterTier = 0): number {
  const pos = dexPos(pokemonId)
  let hp = 3
  if (pos >= 0.92) hp = 5
  else if (pos >= 0.78 || pokemonId % 3 === 0) hp = 4
  if (tier >= 3) hp = Math.min(5, hp + 1)
  return hp
}

export function partnerMaxHp(): number {
  return MAX_HP
}

/** Vangkans per bal (0–1), iets hoger als wild snel KO ging */
export function catchChance(wildMax: number, turnsTaken: number): number {
  const base = 0.55
  const speedBonus = Math.max(0, (wildMax + 2 - turnsTaken) * 0.08)
  return Math.min(0.9, base + speedBonus)
}

export function rollCatch(chance: number): boolean {
  return Math.random() < chance
}

/** Kies een wild Pokémon-id uit actieve generaties (bij voorkeur nog niet gevangen). */
export function pickWildId(
  caughtIds: number[],
  activeGenerations: readonly Generation[],
  correctAnswers = 0,
): number {
  const gens = activeGenerations.length > 0 ? activeGenerations : ([1] as Generation[])
  const poolSpecies = pokemonForGenerations(gens)
  const all = poolSpecies.map((p) => p.id)
  const uncaught = all.filter((id) => !caughtIds.includes(id))
  const pool = uncaught.length > 0 ? uncaught : all

  const tier = encounterTier(correctAnswers)
  const [wEarly, wMid, wLate] = TIER_WEIGHTS[tier]

  const weighted = pool.flatMap((id) => {
    const band = bandOf(dexPos(id))
    const weight = band === 0 ? wEarly : band === 1 ? wMid : wLate
    return Array.from({ length: weight }, () => id)
  })

  return weighted[Math.floor(Math.random() * weighted.length)]!
}
