import evolutions from '../data/evolutions.json'
import { generationOf } from './pokemon'
import type { Generation } from './types'
import { GENERATIONS } from './types'

export interface EvoInfo {
  stage: number
  evolvesTo: number[]
  chainSize: number
}

type EvoMap = Record<string, EvoInfo>

const map = evolutions as EvoMap

/** Goede antwoorden met deze Pokémon vóór evolutie */
export const EVOLVE_CORRECT_NEEDED = 20

export function getEvoInfo(pokemonId: number): EvoInfo {
  return (
    map[String(pokemonId)] ?? {
      stage: 1,
      evolvesTo: [],
      chainSize: 1,
    }
  )
}

export function evolvesToIds(
  pokemonId: number,
  activeGenerations?: readonly Generation[],
): number[] {
  const ids = getEvoInfo(pokemonId).evolvesTo
  if (!activeGenerations || activeGenerations.length === 0) return ids
  const allowed = new Set(activeGenerations)
  const filtered = ids.filter((id) => allowed.has(generationOf(id)))
  return filtered.length > 0 ? filtered : ids
}

export function canEvolveSpecies(
  pokemonId: number,
  activeGenerations?: readonly Generation[],
): boolean {
  return evolvesToIds(pokemonId, activeGenerations).length > 0
}

function dexPos(pokemonId: number): number {
  const gen = generationOf(pokemonId)
  const range = GENERATIONS.find((g) => g.id === gen)!
  const span = range.end - range.start
  return span <= 0 ? 0 : (pokemonId - range.start) / span
}

/**
 * Stadium voor wilde ontmoetingen (1–3).
 * Loners (geen evolutielijn) krijgen een stadium via dex-positie,
 * zodat legendaries niet massaal op Route 1 verschijnen.
 */
export function encounterStage(pokemonId: number): 1 | 2 | 3 {
  const info = getEvoInfo(pokemonId)
  if (info.chainSize <= 1) {
    const pos = dexPos(pokemonId)
    if (pos <= 0.33) return 1
    if (pos <= 0.66) return 2
    return 3
  }
  const s = Math.min(3, Math.max(1, info.stage))
  return s as 1 | 2 | 3
}
