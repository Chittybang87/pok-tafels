import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import {
  accuracyPct,
  formatPracticeDate,
  localDateKey,
  weakFacts,
} from '../lib/stats'
import './Stats.css'

export function Stats() {
  const { setScreen, progress, clearPracticeStats, activeProfile } = useGame()
  const stats = progress.practiceStats
  const todayKey = localDateKey()
  const today = stats.days.find((d) => d.date === todayKey)
  const total = stats.totalCorrect + stats.totalWrong
  const overallPct = accuracyPct(stats.totalCorrect, stats.totalWrong)
  const weak = useMemo(() => weakFacts(stats, 10), [stats])
  const recentDays = stats.days.slice(0, 14)
  const playerLabel = activeProfile?.name

  return (
    <div className="screen stats">
      <header className="stats__head">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
          ← Terug
        </button>
        <h1>Statistieken</h1>
        <p className="lede">
          {playerLabel ? (
            <>
              Voor <strong>{playerLabel}</strong> — wanneer je oefende en waar je
              extra op moet inzetten.
            </>
          ) : (
            <>Zo zie je wanneer je oefende en waar je extra op moet inzetten.</>
          )}
        </p>
      </header>

      <section className="stats__section" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="stats__section-title">
          Overzicht
        </h2>
        {total === 0 ? (
          <p className="stats__empty">Nog geen sommen gemaakt. Ga een gevecht in of herstel!</p>
        ) : (
          <div className="stats__overview">
            <div className="stats__metric">
              <span className="stats__metric-value">{stats.totalCorrect}</span>
              <span className="stats__metric-label">goed</span>
            </div>
            <div className="stats__metric stats__metric--wrong">
              <span className="stats__metric-value">{stats.totalWrong}</span>
              <span className="stats__metric-label">fout</span>
            </div>
            <div className="stats__metric">
              <span className="stats__metric-value">{overallPct ?? 0}%</span>
              <span className="stats__metric-label">score</span>
            </div>
          </div>
        )}
        {today && today.correct + today.wrong > 0 && (
          <p className="stats__today">
            Vandaag: {today.correct} goed · {today.wrong} fout
          </p>
        )}
      </section>

      <section className="stats__section" aria-labelledby="weak-heading">
        <h2 id="weak-heading" className="stats__section-title">
          Extra oefenen
        </h2>
        {weak.length === 0 ? (
          <p className="stats__empty">
            Nog geen fouten bijgehouden — of alles ging goed!
          </p>
        ) : (
          <>
            <p className="stats__hint">Deze sommen gingen het vaakst mis:</p>
            <ul className="stats__facts">
              {weak.map((f) => {
                const pct = accuracyPct(f.correct, f.wrong)
                return (
                  <li key={f.display} className="stats__fact">
                    <span className="stats__fact-sum">{f.display}</span>
                    <span className="stats__fact-meta">
                      {f.wrong}× fout · {f.correct}× goed
                      {pct !== null ? ` · ${pct}%` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="stats__section" aria-labelledby="days-heading">
        <h2 id="days-heading" className="stats__section-title">
          Wanneer geoefend
        </h2>
        {recentDays.length === 0 ? (
          <p className="stats__empty">Nog geen oefendagen.</p>
        ) : (
          <ul className="stats__days">
            {recentDays.map((d) => {
              const pct = accuracyPct(d.correct, d.wrong)
              const isToday = d.date === todayKey
              return (
                <li key={d.date} className={`stats__day ${isToday ? 'stats__day--today' : ''}`}>
                  <span className="stats__day-date">
                    {isToday ? 'Vandaag' : formatPracticeDate(d.date)}
                  </span>
                  <span className="stats__day-meta">
                    {d.correct + d.wrong} sommen · {d.correct} goed · {d.wrong} fout
                    {pct !== null ? ` · ${pct}%` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {total > 0 && (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            const who = playerLabel ? ` van “${playerLabel}”` : ''
            if (
              window.confirm(
                `Statistieken${who} wissen? Pokémon en team blijven bewaard.`,
              )
            ) {
              clearPracticeStats()
            }
          }}
        >
          Alleen statistieken wissen
        </button>
      )}
    </div>
  )
}
