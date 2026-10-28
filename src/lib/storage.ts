import { defaultPracticeStats, normalizePracticeStats } from './stats'
import type {
  Generation,
  MathMode,
  PartyMember,
  Progress,
  Settings,
  SumMax,
} from './types'
import { ALL_GENERATIONS, MAX_HP, MAX_PARTY_SIZE, SUM_MAX_OPTIONS } from './types'

const SETTINGS_KEY = 'poketafels-settings'
const PROGRESS_KEY = 'poketafels-progress'

export const defaultSettings = (): Settings => ({
  activeTables: [1, 2, 5, 10],
  mathMode: 'tables',
  includeMultiply: true,
  includeDivision: false,
  sumMax: 10,
  activeGenerations: [1],
})

function isSumMax(n: unknown): n is SumMax {
  return typeof n === 'number' && (SUM_MAX_OPTIONS as readonly number[]).includes(n)
}

function isMathMode(v: unknown): v is MathMode {
  return v === 'tables' || v === 'sums'
}

function isGeneration(n: unknown): n is Generation {
  return typeof n === 'number' && (ALL_GENERATIONS as readonly number[]).includes(n)
}

export const defaultProgress = (): Progress => ({
  starterChosen: false,
  activePartnerInstanceId: null,
  party: [],
  caughtIds: [],
  seenIds: [],
  battlesWon: 0,
  correctAnswers: 0,
  practiceStats: defaultPracticeStats(),
})

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<Settings>
    const defaults = defaultSettings()
    const tables = Array.isArray(parsed.activeTables)
      ? parsed.activeTables.filter(
          (t) => Number.isInteger(t) && t >= 0 && t <= 10,
        )
      : defaults.activeTables
    let includeMultiply =
      typeof parsed.includeMultiply === 'boolean'
        ? parsed.includeMultiply
        : defaults.includeMultiply
    const includeDivision =
      typeof parsed.includeDivision === 'boolean'
        ? parsed.includeDivision
        : defaults.includeDivision
    if (!includeMultiply && !includeDivision) includeMultiply = true

    const generations = Array.isArray(parsed.activeGenerations)
      ? parsed.activeGenerations.filter(isGeneration)
      : defaults.activeGenerations

    return {
      activeTables: tables.length > 0 ? tables : defaults.activeTables,
      mathMode: isMathMode(parsed.mathMode) ? parsed.mathMode : defaults.mathMode,
      includeMultiply,
      includeDivision,
      sumMax: isSumMax(parsed.sumMax) ? parsed.sumMax : defaults.sumMax,
      activeGenerations:
        generations.length > 0 ? [...new Set(generations)].sort((a, b) => a - b) : defaults.activeGenerations,
    }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return defaultProgress()
    const parsed = JSON.parse(raw) as Progress
    const merged: Progress = { ...defaultProgress(), ...parsed }
    if (
      typeof merged.correctAnswers !== 'number' ||
      !Number.isFinite(merged.correctAnswers) ||
      merged.correctAnswers < 0
    ) {
      merged.correctAnswers = 0
    }
    merged.practiceStats = normalizePracticeStats(parsed.practiceStats)
    if (merged.party.length > MAX_PARTY_SIZE) {
      merged.party = merged.party.slice(0, MAX_PARTY_SIZE)
    }
    if (
      merged.activePartnerInstanceId &&
      !merged.party.some((p) => p.instanceId === merged.activePartnerInstanceId)
    ) {
      merged.activePartnerInstanceId = merged.party[0]?.instanceId ?? null
    }
    return merged
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function resetAll(): void {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(PROGRESS_KEY)
}

export function createPartyMember(pokemonId: number): PartyMember {
  return {
    instanceId: `${pokemonId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    pokemonId,
    hp: MAX_HP,
    maxHp: MAX_HP,
  }
}

export function getActivePartner(progress: Progress): PartyMember | null {
  if (!progress.activePartnerInstanceId) return null
  return (
    progress.party.find((p) => p.instanceId === progress.activePartnerInstanceId) ??
    null
  )
}
