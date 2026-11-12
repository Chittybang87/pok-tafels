import { useEffect, useMemo, useState } from 'react'
import { BadgeIcon } from '../components/BadgeIcon'
import { useGame } from '../context/GameContext'
import {
  BADGE_PASS_SCORE,
  BADGE_QUESTION_COUNT,
  BADGE_SECONDS,
  BADGE_UNLOCK_CORRECT,
  badgeIdForSelection,
  badgeVisual,
  bestBadgeScore,
  canStartBadgeChallenge,
  challengeSumMaxFromSettings,
  challengeTablesFromSettings,
  collectibleBadgeIds,
  hasEarnedBadge,
  isSeriesUnlocked,
  seriesCorrectCount,
  sumsSeriesKey,
  tableSeriesKey,
} from '../lib/badges'
import type { BadgeChallengeSelection, SumMax } from '../lib/types'
import './Badges.css'

export function Badges() {
  const {
    setScreen,
    progress,
    settings,
    startBadgeChallenge,
    activeProfile,
  } = useGame()

  const tablesMode = settings.mathMode === 'tables'
  const availableTables = useMemo(
    () => challengeTablesFromSettings(settings),
    [settings],
  )
  const availableSumMax = useMemo(
    () => challengeSumMaxFromSettings(settings),
    [settings],
  )

  const [selectedTables, setSelectedTables] = useState<number[]>(() =>
    availableTables.length === 1 ? availableTables : [],
  )
  const [selectedSumMax, setSelectedSumMax] = useState<SumMax>(
    () => availableSumMax ?? settings.sumMax,
  )

  useEffect(() => {
    setSelectedTables((prev) => {
      const next = prev.filter((t) => availableTables.includes(t))
      if (availableTables.length === 1) return availableTables
      return next
    })
  }, [availableTables])

  useEffect(() => {
    if (availableSumMax != null) setSelectedSumMax(availableSumMax)
  }, [availableSumMax])

  const ids = useMemo(
    () => collectibleBadgeIds(progress, settings),
    [progress, settings],
  )
  const earnedCount = progress.earnedBadges.length
  const canBattle = progress.party.some((p) => p.hp > 0)

  const selection: BadgeChallengeSelection | null = tablesMode
    ? selectedTables.length > 0
      ? { mode: 'tables', tables: selectedTables }
      : null
    : availableSumMax != null
      ? { mode: 'sums', sumMax: selectedSumMax }
      : null

  const challengeId = selection ? badgeIdForSelection(selection) : null
  const unlocked = selection
    ? canStartBadgeChallenge(progress, selection)
    : false
  const alreadyBest =
    challengeId != null ? bestBadgeScore(progress, challengeId) : null

  const toggleTable = (table: number) => {
    if (!availableTables.includes(table)) return
    setSelectedTables((prev) =>
      prev.includes(table)
        ? prev.filter((t) => t !== table)
        : [...prev, table].sort((a, b) => a - b),
    )
  }

  const start = () => {
    if (!canBattle || !unlocked || !selection) return
    startBadgeChallenge(selection)
  }

  return (
    <div className="screen badges">
      <header className="badges__head">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setScreen('home')}
        >
          ← Terug
        </button>
        <h1>Badges</h1>
        <p className="lede">
          {activeProfile ? (
            <>
              Verzameling van <strong>{activeProfile.name}</strong>
              {' · '}
            </>
          ) : null}
          {earnedCount} badge{earnedCount === 1 ? '' : 's'} · {BADGE_QUESTION_COUNT}{' '}
          sommen × {BADGE_SECONDS}s · minstens {BADGE_PASS_SCORE} goed
        </p>
        <p className="lede badges__settings-hint">
          {tablesMode
            ? `Volgens instellingen: maaltafels (${availableTables.join(', ') || 'geen'})`
            : `Volgens instellingen: plus & min tot ${settings.sumMax}`}
        </p>
      </header>

      <div className="badges__body">
        <section className="badges__section" aria-labelledby="collection-heading">
          <h2 id="collection-heading" className="badges__section-title">
            Verzameling
          </h2>
          {ids.length === 0 ? (
            <p className="lede">
              Geen badge-uitdagingen voor de huidige instellingen. Zet in
              Instellingen tafels of plus/min aan.
            </p>
          ) : (
            <ul className="badges__grid">
              {ids.map((id) => {
                const visual = badgeVisual(id)
                const earned = hasEarnedBadge(progress, id)
                const seriesKey =
                  visual.kind === 'sums'
                    ? sumsSeriesKey(Number(id.slice(5)) as SumMax)
                    : visual.kind === 'table'
                      ? tableSeriesKey(Number(id.slice(6)))
                      : null
                const correct = seriesKey
                  ? seriesCorrectCount(progress, seriesKey)
                  : BADGE_UNLOCK_CORRECT
                const unlockedSeries =
                  seriesKey == null
                    ? earned
                    : isSeriesUnlocked(progress, seriesKey)
                const locked = !earned && !unlockedSeries
                const score = bestBadgeScore(progress, id)

                return (
                  <li key={id} className="badges__card">
                    <BadgeIcon
                      id={id}
                      earned={earned}
                      locked={locked}
                      size="md"
                    />
                    <div className="badges__card-text">
                      <strong>{visual.label}</strong>
                      {earned ? (
                        <span className="badges__card-meta badges__card-meta--ok">
                          Behaald
                          {score != null
                            ? ` · ${score}/${BADGE_QUESTION_COUNT}`
                            : ''}
                        </span>
                      ) : locked ? (
                        <span className="badges__card-meta">
                          Nog {Math.max(0, BADGE_UNLOCK_CORRECT - correct)}/
                          {BADGE_UNLOCK_CORRECT} juist om te openen
                        </span>
                      ) : (
                        <span className="badges__card-meta">
                          Klaar voor uitdaging!
                        </span>
                      )}
                      {!earned && seriesKey && (
                        <div
                          className="badges__bar"
                          role="progressbar"
                          aria-valuenow={Math.min(
                            correct,
                            BADGE_UNLOCK_CORRECT,
                          )}
                          aria-valuemin={0}
                          aria-valuemax={BADGE_UNLOCK_CORRECT}
                        >
                          <span
                            style={{
                              width: `${Math.min(
                                100,
                                (correct / BADGE_UNLOCK_CORRECT) * 100,
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="badges__section" aria-labelledby="challenge-heading">
          <h2 id="challenge-heading" className="badges__section-title">
            Badge-uitdaging
          </h2>
          <p className="lede badges__hint">
            {tablesMode
              ? `Kies één of meer actieve tafels. Elke tafel moet eerst ${BADGE_UNLOCK_CORRECT} keer juist zijn.`
              : `Plus & min tot ${settings.sumMax}: eerst ${BADGE_UNLOCK_CORRECT} juiste sommen, daarna de uitdaging.`}
          </p>

          {tablesMode ? (
            availableTables.length === 0 ? (
              <p className="badges__warn">
                Geen actieve tafels in Instellingen.
              </p>
            ) : (
              <div className="badges__choices">
                {availableTables.map((t) => {
                  const key = tableSeriesKey(t)
                  const open = isSeriesUnlocked(progress, key)
                  const on = selectedTables.includes(t)
                  const n = seriesCorrectCount(progress, key)
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`badges__chip${on ? ' badges__chip--on' : ''}${
                        !open ? ' badges__chip--locked' : ''
                      }`}
                      disabled={!open}
                      onClick={() => toggleTable(t)}
                      title={
                        open
                          ? `Tafel ${t}`
                          : `${n}/${BADGE_UNLOCK_CORRECT} juist`
                      }
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            )
          ) : availableSumMax == null ? (
            <p className="badges__warn">
              Plus/min staat niet aan in Instellingen.
            </p>
          ) : (
            <div className="badges__choices">
              {(() => {
                const m = availableSumMax
                const key = sumsSeriesKey(m)
                const open = isSeriesUnlocked(progress, key)
                const n = seriesCorrectCount(progress, key)
                return (
                  <button
                    type="button"
                    className={`badges__chip badges__chip--on${
                      !open ? ' badges__chip--locked' : ''
                    }`}
                    disabled={!open}
                    title={
                      open
                        ? `Tot ${m}`
                        : `${n}/${BADGE_UNLOCK_CORRECT} juist`
                    }
                  >
                    tot {m}
                  </button>
                )
              })()}
            </div>
          )}

          {challengeId && (
            <div className="badges__preview">
              <BadgeIcon
                id={challengeId}
                earned={hasEarnedBadge(progress, challengeId)}
                locked={!unlocked}
                size="lg"
              />
              <div>
                <strong>{badgeVisual(challengeId).label}</strong>
                <p className="lede">
                  {!unlocked
                    ? 'Nog niet vrijgespeeld.'
                    : alreadyBest != null
                      ? `Beste score: ${alreadyBest}/${BADGE_QUESTION_COUNT} — opnieuw mag!`
                      : 'Nog niet behaald — veel succes!'}
                </p>
              </div>
            </div>
          )}

          {!canBattle && (
            <p className="badges__warn">
              Eerst herstellen — je team heeft geen HP.
            </p>
          )}

          <button
            type="button"
            className="btn btn--primary"
            disabled={!canBattle || !unlocked || !selection}
            onClick={start}
          >
            Start uitdaging
          </button>
        </section>
      </div>
    </div>
  )
}
