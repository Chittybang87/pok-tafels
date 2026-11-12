import { encounterStage } from './evolution'
import { getPokemon, pokemonForGenerations } from './pokemon'
import type {
  BadgeAttempt,
  BadgeChallengeSelection,
  BadgeEarn,
  BadgeId,
  Generation,
  MathQuestion,
  PracticeStats,
  Progress,
  Settings,
  SumMax,
} from './types'
import { ALL_GENERATIONS, ALL_TABLES, SUM_MAX_OPTIONS } from './types'

/** Bewaar max. zoveel badge-pogingen in de historie */
export const MAX_BADGE_ATTEMPTS = 60

export const BADGE_UNLOCK_CORRECT = 50
export const BADGE_QUESTION_COUNT = 30
export const BADGE_SECONDS = 10
export const BADGE_PASS_SCORE = 27
export const BADGE_BOSS_COUNT = 3
export const BADGE_BOSS_HP = 10
/** Schade aan je eigen Pokémon bij fout/timeout in badge-modus */
export const BADGE_PARTNER_DAMAGE = 1

const TABLE_HUES = [
  12, 32, 48, 78, 118, 158, 188, 208, 238, 278, 318,
] as const

export function tableSeriesKey(table: number): string {
  return `table:${table}`
}

export function sumsSeriesKey(sumMax: SumMax): string {
  return `sums:${sumMax}`
}

export function badgeIdForSelection(
  selection: BadgeChallengeSelection,
): BadgeId {
  if (selection.mode === 'sums') {
    return `sums:${selection.sumMax}`
  }
  const tables = [...new Set(selection.tables)]
    .filter((t) => Number.isInteger(t) && t >= 0 && t <= 10)
    .sort((a, b) => a - b)
  if (tables.length === 1) return `table:${tables[0]!}`
  return `tables:${tables.join('-')}`
}

export function parseBadgeId(id: string): BadgeChallengeSelection | null {
  if (id.startsWith('sums:')) {
    const n = Number(id.slice(5))
    if ((SUM_MAX_OPTIONS as readonly number[]).includes(n)) {
      return { mode: 'sums', sumMax: n as SumMax }
    }
    return null
  }
  if (id.startsWith('tables:')) {
    const tables = id
      .slice(7)
      .split('-')
      .map(Number)
      .filter((t) => Number.isInteger(t) && t >= 0 && t <= 10)
    if (tables.length < 2) return null
    return { mode: 'tables', tables: [...new Set(tables)].sort((a, b) => a - b) }
  }
  if (id.startsWith('table:')) {
    const t = Number(id.slice(6))
    if (Number.isInteger(t) && t >= 0 && t <= 10) {
      return { mode: 'tables', tables: [t] }
    }
  }
  return null
}

/** Welke tafel(s) zit in deze som? (leeg bij plus/min) */
export function tablesFromQuestion(question: MathQuestion): number[] {
  const display = question.display
  if (display.includes('×')) {
    return Number.isInteger(question.a) ? [question.a] : []
  }
  if (display.includes('÷')) {
    return Number.isInteger(question.b) ? [question.b] : []
  }
  return []
}

export function isSumsQuestion(question: MathQuestion): boolean {
  return question.display.includes('+') || question.display.includes('−')
}

/** Series-keys om te verhogen bij een juist antwoord */
export function seriesKeysForCorrectAnswer(
  question: MathQuestion,
  sumMax?: SumMax,
): string[] {
  const tables = tablesFromQuestion(question)
  if (tables.length > 0) return tables.map(tableSeriesKey)
  if (isSumsQuestion(question) && sumMax !== undefined) {
    return [sumsSeriesKey(sumMax)]
  }
  return []
}

export function seriesCorrectCount(
  progress: Progress,
  seriesKey: string,
): number {
  const n = progress.seriesCorrect[seriesKey]
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export function isSeriesUnlocked(
  progress: Progress,
  seriesKey: string,
): boolean {
  return seriesCorrectCount(progress, seriesKey) >= BADGE_UNLOCK_CORRECT
}

export function canStartBadgeChallenge(
  progress: Progress,
  selection: BadgeChallengeSelection,
): boolean {
  if (selection.mode === 'sums') {
    return isSeriesUnlocked(progress, sumsSeriesKey(selection.sumMax))
  }
  const tables = [...new Set(selection.tables)].filter(
    (t) => Number.isInteger(t) && t >= 0 && t <= 10,
  )
  if (tables.length === 0) return false
  return tables.every((t) => isSeriesUnlocked(progress, tableSeriesKey(t)))
}

export function hasEarnedBadge(progress: Progress, id: BadgeId): boolean {
  return progress.earnedBadges.some((b) => b.id === id)
}

export function bestBadgeScore(progress: Progress, id: BadgeId): number | null {
  const matches = progress.earnedBadges.filter((b) => b.id === id)
  if (matches.length === 0) return null
  return Math.max(...matches.map((b) => b.score))
}

export interface BadgeVisual {
  id: BadgeId
  label: string
  shortLabel: string
  hue: number
  kind: 'table' | 'tables' | 'sums'
}

export function badgeVisual(id: BadgeId): BadgeVisual {
  const parsed = parseBadgeId(id)
  if (!parsed) {
    return {
      id,
      label: id,
      shortLabel: '?',
      hue: 40,
      kind: 'table',
    }
  }
  if (parsed.mode === 'sums') {
    return {
      id,
      label: `Plus & min tot ${parsed.sumMax}`,
      shortLabel: `±${parsed.sumMax}`,
      hue: 150 + Math.min(parsed.sumMax, 100),
      kind: 'sums',
    }
  }
  if (parsed.tables.length === 1) {
    const t = parsed.tables[0]!
    return {
      id,
      label: `Tafel van ${t}`,
      shortLabel: String(t),
      hue: TABLE_HUES[t] ?? 40,
      kind: 'table',
    }
  }
  return {
    id,
    label: `Tafels ${parsed.tables.join(' · ')}`,
    shortLabel: parsed.tables.join('+'),
    hue: Math.round(
      parsed.tables.reduce((s, t) => s + (TABLE_HUES[t] ?? 40), 0) /
        parsed.tables.length,
    ),
    kind: 'tables',
  }
}

/** Badges die bij de huidige oefeninstellingen horen */
export function catalogBadgeIdsForSettings(settings: Settings): BadgeId[] {
  if (settings.mathMode === 'sums') {
    return [`sums:${settings.sumMax}`]
  }
  const tables = (
    settings.activeTables.length > 0 ? settings.activeTables : [...ALL_TABLES]
  )
    .filter((t) => Number.isInteger(t) && t >= 0 && t <= 10)
    .sort((a, b) => a - b)
  return tables.map((t) => `table:${t}` as BadgeId)
}

/** Actieve catalogus + relevante verdiende combo’s / eerdere badges */
export function collectibleBadgeIds(
  progress: Progress,
  settings: Settings,
): BadgeId[] {
  const base = catalogBadgeIdsForSettings(settings)
  const activeTableSet = new Set(
    settings.mathMode === 'tables'
      ? settings.activeTables.length > 0
        ? settings.activeTables
        : [...ALL_TABLES]
      : [],
  )

  const extras: BadgeId[] = []
  for (const earned of progress.earnedBadges) {
    if (base.includes(earned.id)) continue
    if (extras.includes(earned.id)) continue
    if (settings.mathMode === 'tables' && earned.id.startsWith('tables:')) {
      const parsed = parseBadgeId(earned.id)
      if (
        parsed?.mode === 'tables' &&
        parsed.tables.every((t) => activeTableSet.has(t))
      ) {
        extras.push(earned.id)
      }
      continue
    }
    // Al verdiende badges buiten de huidige modus blijven zichtbaar
    extras.push(earned.id)
  }
  return [...base, ...extras]
}

/** Tafels die je mag kiezen voor een badge-uitdaging */
export function challengeTablesFromSettings(settings: Settings): number[] {
  if (settings.mathMode !== 'tables') return []
  return (
    settings.activeTables.length > 0 ? settings.activeTables : [...ALL_TABLES]
  )
    .filter((t) => Number.isInteger(t) && t >= 0 && t <= 10)
    .sort((a, b) => a - b)
}

export function challengeSumMaxFromSettings(
  settings: Settings,
): SumMax | null {
  if (settings.mathMode !== 'sums') return null
  return settings.sumMax
}

export function pickBadgeBossIds(
  activeGenerations: readonly Generation[],
  count = BADGE_BOSS_COUNT,
): number[] {
  const pool = pokemonForGenerations(activeGenerations).filter(
    (c) => encounterStage(c.id) === 3,
  )
  const source =
    pool.length >= count
      ? pool
      : pokemonForGenerations(ALL_GENERATIONS).filter(
          (c) => encounterStage(c.id) === 3,
        )
  const shuffled = [...source].sort(() => Math.random() - 0.5)
  const ids: number[] = []
  for (const c of shuffled) {
    if (ids.includes(c.id)) continue
    ids.push(c.id)
    if (ids.length >= count) break
  }
  while (ids.length < count && source[0]) {
    ids.push(source[ids.length % source.length]!.id)
  }
  return ids
}

export function bossName(pokemonId: number): string {
  return getPokemon(pokemonId).name
}

/** Tel juiste tafel-antwoorden uit bestaande practiceStats (bootstrap). */
export function bootstrapTableSeriesFromStats(
  stats: PracticeStats,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const fact of Object.values(stats.facts)) {
    if (!fact || fact.correct <= 0) continue
    const mul = /^(\d+)\s*×/.exec(fact.display)
    if (mul) {
      const t = Number(mul[1])
      if (t >= 0 && t <= 10) {
        const key = tableSeriesKey(t)
        out[key] = (out[key] ?? 0) + fact.correct
      }
      continue
    }
    const div = /÷\s*(\d+)\s*$/.exec(fact.display)
    if (div) {
      const t = Number(div[1])
      if (t >= 0 && t <= 10) {
        const key = tableSeriesKey(t)
        out[key] = (out[key] ?? 0) + fact.correct
      }
    }
  }
  return out
}

export function mergeSeriesCorrect(
  existing: Record<string, number>,
  bootstrapped: Record<string, number>,
): Record<string, number> {
  const keys = new Set([...Object.keys(existing), ...Object.keys(bootstrapped)])
  const out: Record<string, number> = {}
  for (const key of keys) {
    out[key] = Math.max(existing[key] ?? 0, bootstrapped[key] ?? 0)
  }
  return out
}

export function normalizeSeriesCorrect(
  raw: unknown,
): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[key] = Math.floor(value)
    }
  }
  return out
}

export function normalizeEarnedBadges(raw: unknown): BadgeEarn[] {
  if (!Array.isArray(raw)) return []
  const out: BadgeEarn[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const b = item as Partial<BadgeEarn>
    if (typeof b.id !== 'string' || !parseBadgeId(b.id)) continue
    if (typeof b.earnedAt !== 'string') continue
    if (
      typeof b.score !== 'number' ||
      !Number.isFinite(b.score) ||
      b.score < BADGE_PASS_SCORE ||
      b.score > BADGE_QUESTION_COUNT
    ) {
      continue
    }
    out.push({
      id: b.id as BadgeId,
      earnedAt: b.earnedAt,
      score: Math.floor(b.score),
    })
  }
  return out
}

export function normalizeBadgeAttempts(raw: unknown): BadgeAttempt[] {
  if (!Array.isArray(raw)) return []
  const out: BadgeAttempt[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const a = item as Partial<BadgeAttempt>
    if (typeof a.id !== 'string' || !parseBadgeId(a.id)) continue
    if (typeof a.at !== 'string') continue
    if (
      typeof a.score !== 'number' ||
      !Number.isFinite(a.score) ||
      a.score < 0
    ) {
      continue
    }
    if (
      typeof a.total !== 'number' ||
      !Number.isFinite(a.total) ||
      a.total < 1
    ) {
      continue
    }
    const score = Math.min(Math.floor(a.score), Math.floor(a.total))
    const total = Math.floor(a.total)
    out.push({
      id: a.id as BadgeId,
      at: a.at,
      score,
      total,
      passed: Boolean(a.passed) || score >= BADGE_PASS_SCORE,
      aborted: a.aborted === true ? true : undefined,
    })
  }
  return out.slice(0, MAX_BADGE_ATTEMPTS)
}

/** Vul historie vanuit oude earnedBadges als er nog geen attempts zijn. */
export function bootstrapBadgeAttemptsFromEarned(
  earned: BadgeEarn[],
): BadgeAttempt[] {
  return earned
    .map((b) => ({
      id: b.id,
      at: b.earnedAt,
      score: b.score,
      total: BADGE_QUESTION_COUNT,
      passed: true as const,
    }))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, MAX_BADGE_ATTEMPTS)
}

export function prependBadgeAttempt(
  attempts: BadgeAttempt[],
  attempt: BadgeAttempt,
): BadgeAttempt[] {
  return [attempt, ...attempts].slice(0, MAX_BADGE_ATTEMPTS)
}

export interface BadgeStatsSummary {
  attempts: number
  passed: number
  bestScore: number | null
}

export function summarizeBadgeAttempts(
  attempts: BadgeAttempt[],
): BadgeStatsSummary {
  if (attempts.length === 0) {
    return { attempts: 0, passed: 0, bestScore: null }
  }
  let passed = 0
  let best = 0
  for (const a of attempts) {
    if (a.passed) passed += 1
    if (a.score > best) best = a.score
  }
  return {
    attempts: attempts.length,
    passed,
    bestScore: best,
  }
}

export function formatBadgeAttemptWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function applySeriesCorrectBump(
  seriesCorrect: Record<string, number>,
  keys: string[],
): Record<string, number> {
  if (keys.length === 0) return seriesCorrect
  const next = { ...seriesCorrect }
  for (const key of keys) {
    next[key] = (next[key] ?? 0) + 1
  }
  return next
}
