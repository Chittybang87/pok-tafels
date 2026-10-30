import { defaultPracticeStats, normalizePracticeStats } from './stats'
import type {
  Generation,
  MathMode,
  PartyMember,
  Profile,
  ProfilesState,
  Progress,
  Settings,
  SumMax,
} from './types'
import {
  ALL_GENERATIONS,
  MAX_HP,
  MAX_PARTY_SIZE,
  MAX_PROFILES,
  SUM_MAX_OPTIONS,
} from './types'

const SETTINGS_KEY = 'poketafels-settings'
/** Legacy single-save key — gemigreerd naar profiles */
const PROGRESS_KEY = 'poketafels-progress'
const PROFILES_KEY = 'poketafels-profiles'

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
        generations.length > 0
          ? [...new Set(generations)].sort((a, b) => a - b)
          : defaults.activeGenerations,
    }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function normalizeProgress(raw: unknown): Progress {
  const defaults = defaultProgress()
  if (!raw || typeof raw !== 'object') return defaults
  const parsed = raw as Partial<Progress>
  const merged: Progress = { ...defaults, ...parsed }
  if (
    typeof merged.correctAnswers !== 'number' ||
    !Number.isFinite(merged.correctAnswers) ||
    merged.correctAnswers < 0
  ) {
    merged.correctAnswers = 0
  }
  merged.practiceStats = normalizePracticeStats(parsed.practiceStats)
  merged.party = (parsed.party ?? [])
    .map((m) => normalizePartyMember(m))
    .filter((m): m is PartyMember => m !== null)
  if (merged.party.length > MAX_PARTY_SIZE) {
    merged.party = merged.party.slice(0, MAX_PARTY_SIZE)
  }
  if (
    merged.activePartnerInstanceId &&
    !merged.party.some((p) => p.instanceId === merged.activePartnerInstanceId)
  ) {
    merged.activePartnerInstanceId = merged.party[0]?.instanceId ?? null
  }
  merged.starterChosen = Boolean(merged.starterChosen)
  merged.caughtIds = Array.isArray(parsed.caughtIds)
    ? parsed.caughtIds.filter((id) => typeof id === 'number')
    : []
  merged.seenIds = Array.isArray(parsed.seenIds)
    ? parsed.seenIds.filter((id) => typeof id === 'number')
    : []
  merged.battlesWon =
    typeof parsed.battlesWon === 'number' &&
    Number.isFinite(parsed.battlesWon) &&
    parsed.battlesWon >= 0
      ? Math.floor(parsed.battlesWon)
      : 0
  return merged
}

function newProfileId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<Profile>
  if (typeof p.id !== 'string' || typeof p.name !== 'string') return null
  const name = p.name.trim()
  if (!name) return null
  return {
    id: p.id,
    name,
    createdAt:
      typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    progress: normalizeProgress(p.progress),
  }
}

function migrateLegacyProgress(): ProfilesState | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    const progress = normalizeProgress(JSON.parse(raw))
    const state: ProfilesState = {
      profiles: [
        {
          id: newProfileId(),
          name: 'Speler',
          createdAt: new Date().toISOString(),
          progress,
        },
      ],
    }
    saveProfiles(state)
    localStorage.removeItem(PROGRESS_KEY)
    return state
  } catch {
    return null
  }
}

export function loadProfiles(): ProfilesState {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) {
      return migrateLegacyProgress() ?? { profiles: [] }
    }
    const parsed = JSON.parse(raw) as Partial<ProfilesState>
    const profiles = (Array.isArray(parsed.profiles) ? parsed.profiles : [])
      .map(normalizeProfile)
      .filter((p): p is Profile => p !== null)
    return { profiles }
  } catch {
    return migrateLegacyProgress() ?? { profiles: [] }
  }
}

export function saveProfiles(state: ProfilesState): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(state))
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function nameTaken(profiles: Profile[], name: string, exceptId?: string): boolean {
  const key = name.toLowerCase()
  return profiles.some(
    (p) => p.id !== exceptId && p.name.toLowerCase() === key,
  )
}

/** @returns nieuw profiel, of null als naam ongeldig / limiet / duplicaat */
export function createProfile(
  state: ProfilesState,
  name: string,
): { state: ProfilesState; profile: Profile } | null {
  const trimmed = normalizeName(name)
  if (!trimmed || state.profiles.length >= MAX_PROFILES) return null
  if (nameTaken(state.profiles, trimmed)) return null
  const profile: Profile = {
    id: newProfileId(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    progress: defaultProgress(),
  }
  return {
    state: { profiles: [...state.profiles, profile] },
    profile,
  }
}

export function deleteProfile(
  state: ProfilesState,
  id: string,
): ProfilesState {
  return { profiles: state.profiles.filter((p) => p.id !== id) }
}

/** @returns nieuwe state, of null bij ongeldige/dubbele naam */
export function renameProfile(
  state: ProfilesState,
  id: string,
  name: string,
): ProfilesState | null {
  const trimmed = normalizeName(name)
  if (!trimmed) return null
  if (nameTaken(state.profiles, trimmed, id)) return null
  if (!state.profiles.some((p) => p.id === id)) return null
  return {
    profiles: state.profiles.map((p) =>
      p.id === id ? { ...p, name: trimmed } : p,
    ),
  }
}

export function updateProfileProgress(
  state: ProfilesState,
  id: string,
  progress: Progress,
): ProfilesState {
  return {
    profiles: state.profiles.map((p) =>
      p.id === id ? { ...p, progress } : p,
    ),
  }
}

export function resetProfileProgress(
  state: ProfilesState,
  id: string,
): ProfilesState {
  return updateProfileProgress(state, id, defaultProgress())
}

export function createPartyMember(pokemonId: number): PartyMember {
  return {
    instanceId: `${pokemonId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    pokemonId,
    hp: MAX_HP,
    maxHp: MAX_HP,
    correctCount: 0,
  }
}

function normalizePartyMember(raw: Partial<PartyMember>): PartyMember | null {
  if (
    typeof raw.instanceId !== 'string' ||
    typeof raw.pokemonId !== 'number' ||
    typeof raw.hp !== 'number' ||
    typeof raw.maxHp !== 'number'
  ) {
    return null
  }
  return {
    instanceId: raw.instanceId,
    pokemonId: raw.pokemonId,
    hp: raw.hp,
    maxHp: raw.maxHp,
    correctCount:
      typeof raw.correctCount === 'number' &&
      Number.isFinite(raw.correctCount) &&
      raw.correctCount >= 0
        ? Math.floor(raw.correctCount)
        : 0,
  }
}

export function getActivePartner(progress: Progress): PartyMember | null {
  if (!progress.activePartnerInstanceId) return null
  return (
    progress.party.find((p) => p.instanceId === progress.activePartnerInstanceId) ??
    null
  )
}
