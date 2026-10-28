import type { DayStat, FactStat, MathQuestion, PracticeStats } from './types'

const MAX_DAYS = 90
const MAX_FACTS = 400

export function defaultPracticeStats(): PracticeStats {
  return {
    facts: {},
    days: [],
    totalCorrect: 0,
    totalWrong: 0,
  }
}

/** Lokale kalenderdag als YYYY-MM-DD */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatPracticeDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function applyAnswer(
  stats: PracticeStats,
  question: MathQuestion,
  correct: boolean,
  at = new Date(),
): PracticeStats {
  const key = question.display
  const prev = stats.facts[key]
  const fact: FactStat = {
    display: key,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
    lastAt: at.toISOString(),
  }

  const facts = { ...stats.facts, [key]: fact }
  pruneFacts(facts)

  const dayKey = localDateKey(at)
  const days = [...stats.days]
  const dayIdx = days.findIndex((x) => x.date === dayKey)
  if (dayIdx >= 0) {
    const cur = days[dayIdx]!
    days[dayIdx] = {
      ...cur,
      correct: cur.correct + (correct ? 1 : 0),
      wrong: cur.wrong + (correct ? 0 : 1),
    }
  } else {
    days.push({
      date: dayKey,
      correct: correct ? 1 : 0,
      wrong: correct ? 0 : 1,
    })
  }
  days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  if (days.length > MAX_DAYS) days.length = MAX_DAYS

  return {
    facts,
    days,
    totalCorrect: stats.totalCorrect + (correct ? 1 : 0),
    totalWrong: stats.totalWrong + (correct ? 0 : 1),
  }
}

function pruneFacts(facts: Record<string, FactStat>): void {
  const keys = Object.keys(facts)
  if (keys.length <= MAX_FACTS) return

  const ranked = keys
    .map((k) => facts[k]!)
    .sort((a, b) => {
      const aWrong = a.wrong
      const bWrong = b.wrong
      if (bWrong !== aWrong) return bWrong - aWrong
      const aTotal = a.correct + a.wrong
      const bTotal = b.correct + b.wrong
      if (bTotal !== aTotal) return bTotal - aTotal
      return (b.lastAt < a.lastAt ? -1 : b.lastAt > a.lastAt ? 1 : 0)
    })

  const keep = new Set(ranked.slice(0, MAX_FACTS).map((f) => f.display))
  for (const k of keys) {
    if (!keep.has(k)) delete facts[k]
  }
}

export function accuracyPct(correct: number, wrong: number): number | null {
  const total = correct + wrong
  if (total === 0) return null
  return Math.round((100 * correct) / total)
}

/** Sommen met de meeste fouten / laagste score — waar je extra op moet inzetten */
export function weakFacts(stats: PracticeStats, limit = 12): FactStat[] {
  return Object.values(stats.facts)
    .filter((f) => f.wrong > 0)
    .sort((a, b) => {
      const aRate = a.wrong / (a.correct + a.wrong)
      const bRate = b.wrong / (b.correct + b.wrong)
      if (bRate !== aRate) return bRate - aRate
      if (b.wrong !== a.wrong) return b.wrong - a.wrong
      return b.lastAt.localeCompare(a.lastAt)
    })
    .slice(0, limit)
}

export function normalizePracticeStats(raw: unknown): PracticeStats {
  const empty = defaultPracticeStats()
  if (!raw || typeof raw !== 'object') return empty
  const parsed = raw as Partial<PracticeStats>

  const facts: Record<string, FactStat> = {}
  if (parsed.facts && typeof parsed.facts === 'object') {
    for (const [key, value] of Object.entries(parsed.facts)) {
      if (!value || typeof value !== 'object') continue
      const f = value as Partial<FactStat>
      const display = typeof f.display === 'string' ? f.display : key
      const correct = Number(f.correct)
      const wrong = Number(f.wrong)
      if (!Number.isFinite(correct) || !Number.isFinite(wrong)) continue
      facts[display] = {
        display,
        correct: Math.max(0, Math.floor(correct)),
        wrong: Math.max(0, Math.floor(wrong)),
        lastAt: typeof f.lastAt === 'string' ? f.lastAt : new Date(0).toISOString(),
      }
    }
  }

  const days: DayStat[] = []
  if (Array.isArray(parsed.days)) {
    for (const d of parsed.days) {
      if (!d || typeof d !== 'object') continue
      const date = typeof d.date === 'string' ? d.date : ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const correct = Number(d.correct)
      const wrong = Number(d.wrong)
      if (!Number.isFinite(correct) || !Number.isFinite(wrong)) continue
      days.push({
        date,
        correct: Math.max(0, Math.floor(correct)),
        wrong: Math.max(0, Math.floor(wrong)),
      })
    }
  }
  days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const totalCorrect = Number(parsed.totalCorrect)
  const totalWrong = Number(parsed.totalWrong)

  return {
    facts,
    days: days.slice(0, MAX_DAYS),
    totalCorrect:
      Number.isFinite(totalCorrect) && totalCorrect >= 0
        ? Math.floor(totalCorrect)
        : Object.values(facts).reduce((s, f) => s + f.correct, 0),
    totalWrong:
      Number.isFinite(totalWrong) && totalWrong >= 0
        ? Math.floor(totalWrong)
        : Object.values(facts).reduce((s, f) => s + f.wrong, 0),
  }
}
