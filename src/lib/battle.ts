import { encounterStage } from './evolution'
import { pokemonForGenerations } from './pokemon'
import {
  bestAttackMultiplier,
  damageFromMultiplier,
  matchupKind,
  matchupLabel,
  type MatchupKind,
} from './typeChart'
import type { Generation } from './types'
import { MAX_HP } from './types'

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

/** Gewichten [stadium1, stadium2, stadium3] per encounter-tier */
const TIER_STAGE_WEIGHTS: Record<
  EncounterTier,
  readonly [number, number, number]
> = {
  0: [5, 1, 0],
  1: [4, 2, 1],
  2: [2, 4, 2],
  3: [1, 3, 4],
  4: [1, 2, 5],
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

/** Wild HP op basis van evolutiestadium; +1 bij hoge tier (max 5) */
export function wildMaxHp(pokemonId: number, tier: EncounterTier = 0): number {
  const stage = encounterStage(pokemonId)
  let hp = stage === 1 ? 3 : stage === 2 ? 4 : 5
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
  const weights = TIER_STAGE_WEIGHTS[tier]

  const weighted = pool.flatMap((id) => {
    const stage = encounterStage(id)
    const weight = weights[stage - 1] ?? 1
    if (weight <= 0) return []
    return Array.from({ length: weight }, () => id)
  })

  const pickFrom = weighted.length > 0 ? weighted : pool
  return pickFrom[Math.floor(Math.random() * pickFrom.length)]!
}
