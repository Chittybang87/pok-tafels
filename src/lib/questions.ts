import type { MathQuestion, Settings, SumMax } from './types'

function randInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1))
}

function nextMultiplyQuestion(tables: number[]): MathQuestion {
  const a = tables[Math.floor(Math.random() * tables.length)]!
  const b = randInt(10) // 0–10
  return {
    a,
    b,
    answer: a * b,
    display: `${a} × ${b}`,
  }
}

function nextDivisionQuestion(tables: number[]): MathQuestion | null {
  // Delen door 0 kan niet; alleen niet-nul-tafels als deler
  const divTables = tables.filter((t) => t !== 0)
  if (divTables.length === 0) return null

  const divisor = divTables[Math.floor(Math.random() * divTables.length)]!
  const quotient = randInt(10) // 0–10
  const dividend = divisor * quotient
  return {
    a: dividend,
    b: divisor,
    answer: quotient,
    display: `${dividend} ÷ ${divisor}`,
  }
}

/** Genereert een maaltafelvraag uit de actieve tafels (× en/of ÷). */
export function nextTablesQuestion(
  activeTables: number[],
  includeMultiply = true,
  includeDivision = false,
): MathQuestion {
  const tables =
    activeTables.length > 0 ? activeTables : [1, 2, 5, 10]

  const wantMultiply = includeMultiply
  const wantDivision = includeDivision
  const division = wantDivision ? nextDivisionQuestion(tables) : null
  const canDivide = division !== null

  let useDivision = false
  if (wantMultiply && canDivide) {
    useDivision = Math.random() < 0.5
  } else if (canDivide && !wantMultiply) {
    useDivision = true
  }

  if (useDivision && division) return division
  return nextMultiplyQuestion(tables)
}

/** Genereert een plus- of minsom; min-resultaat is nooit negatief. */
export function nextSumsQuestion(sumMax: SumMax): MathQuestion {
  const max = sumMax
  const usePlus = Math.random() < 0.5

  if (usePlus) {
    const a = randInt(max)
    const b = randInt(max)
    return {
      a,
      b,
      answer: a + b,
      display: `${a} + ${b}`,
    }
  }

  const a = randInt(max)
  const b = randInt(a) // 0…a zodat a − b ≥ 0
  return {
    a,
    b,
    answer: a - b,
    display: `${a} − ${b}`,
  }
}

/** Genereert een som volgens de huidige instellingen. */
export function nextQuestion(settings: Settings): MathQuestion {
  if (settings.mathMode === 'sums') {
    return nextSumsQuestion(settings.sumMax)
  }
  return nextTablesQuestion(
    settings.activeTables,
    settings.includeMultiply,
    settings.includeDivision,
  )
}
