import gen1 from '../data/pokemon-gen1.json'
import gen2 from '../data/pokemon-gen2.json'
import gen3 from '../data/pokemon-gen3.json'
import gen4 from '../data/pokemon-gen4.json'
import gen5 from '../data/pokemon-gen5.json'
import gen6 from '../data/pokemon-gen6.json'
import gen7 from '../data/pokemon-gen7.json'
import gen8 from '../data/pokemon-gen8.json'
import gen9 from '../data/pokemon-gen9.json'
import type { Generation, PokemonSpecies } from './types'
import { GENERATIONS } from './types'

export const pokemonList = [
  ...gen1,
  ...gen2,
  ...gen3,
  ...gen4,
  ...gen5,
  ...gen6,
  ...gen7,
  ...gen8,
  ...gen9,
] as PokemonSpecies[]

const byId = new Map(pokemonList.map((p) => [p.id, p]))

const SPRITES_WARMED_KEY = 'poketafels-sprites-warmed-gens'
const SPRITES_CACHE = 'pokemon-sprites'

export function getPokemon(id: number): PokemonSpecies {
  return byId.get(id) ?? pokemonList[0]!
}

export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function pokemonForGenerations(
  generations: readonly Generation[],
): PokemonSpecies[] {
  if (generations.length === 0) return []
  const active = new Set(generations)
  return pokemonList.filter((p) => active.has(p.generation))
}

export function generationOf(id: number): Generation {
  const found = GENERATIONS.find((g) => id >= g.start && id <= g.end)
  return found?.id ?? 1
}

/** Prefetch sprites for the given generations into Cache Storage. */
export async function warmSpriteCache(
  generations: readonly Generation[] = [1],
): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine || !('caches' in window)) {
    return
  }

  const wanted = [...new Set(generations)].sort((a, b) => a - b)
  let already: number[] = []
  try {
    const raw = localStorage.getItem(SPRITES_WARMED_KEY)
    if (raw) {
      already = raw
        .split(',')
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 9)
    }
  } catch {
    /* ignore */
  }

  const missing = wanted.filter((g) => !already.includes(g))
  if (missing.length === 0) return

  const cache = await caches.open(SPRITES_CACHE)
  const ids = pokemonForGenerations(missing).map((p) => p.id)
  const concurrency = 8
  let index = 0
  let failed = false

  async function worker() {
    while (index < ids.length) {
      const id = ids[index++]!
      const url = spriteUrl(id)
      try {
        const cached = await cache.match(url)
        if (cached) continue
        const res = await fetch(url, { mode: 'cors' })
        if (!res.ok) {
          failed = true
          continue
        }
        await cache.put(url, res)
      } catch {
        failed = true
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  if (!failed) {
    const next = [...new Set([...already, ...missing])].sort((a, b) => a - b)
    try {
      localStorage.setItem(SPRITES_WARMED_KEY, next.join(','))
    } catch {
      /* ignore */
    }
  }
}
