import { useState, type FormEvent } from 'react'
import { useGame } from '../context/GameContext'
import { ALL_TABLES, GENERATIONS, SUM_MAX_OPTIONS } from '../lib/types'
import './Settings.css'

const SETTINGS_PASSWORD = 'admin'

export function Settings() {
  const {
    setScreen,
    settings,
    toggleTable,
    toggleGeneration,
    setMathMode,
    setIncludeMultiply,
    setIncludeDivision,
    setSumMax,
    resetGame,
  } = useGame()

  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const sums = settings.mathMode === 'sums'

  function handleUnlock(e: FormEvent) {
    e.preventDefault()
    if (password === SETTINGS_PASSWORD) {
      setUnlocked(true)
      setError(false)
      setPassword('')
      return
    }
    setError(true)
  }

  if (!unlocked) {
    return (
      <div className="screen settings">
        <header className="settings__head">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setScreen('home')}
          >
            ← Terug
          </button>
          <h1>Instellingen</h1>
          <p className="lede">Alleen voor ouders — voer het wachtwoord in.</p>
        </header>

        <form className="settings__lock" onSubmit={handleUnlock}>
          <label className="settings__lock-label" htmlFor="settings-password">
            Wachtwoord
          </label>
          <input
            id="settings-password"
            className={`settings__lock-input${error ? ' settings__lock-input--error' : ''}`}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError(false)
            }}
            aria-invalid={error}
            aria-describedby={error ? 'settings-password-error' : undefined}
          />
          {error ? (
            <p id="settings-password-error" className="settings__lock-error" role="alert">
              Dat wachtwoord klopt niet.
            </p>
          ) : null}
          <button type="submit" className="btn btn--primary">
            Openen
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="screen settings">
      <header className="settings__head">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
          ← Terug
        </button>
        <h1>Instellingen</h1>
        <p className="lede">Kies wat je wilt oefenen in gevechten en bij herstellen.</p>
      </header>

      <section className="settings__section" aria-labelledby="gens-heading">
        <h2 id="gens-heading" className="settings__section-title">
          Pokémon-generaties
        </h2>
        <p className="settings__hint settings__hint--tight">
          Zet generaties aan die in gevechten en de Pokédex meedoen. Minstens één.
        </p>
        <div className="settings__gens" role="group" aria-label="Actieve Pokémon-generaties">
          {GENERATIONS.map((g) => {
            const on = settings.activeGenerations.includes(g.id)
            return (
              <button
                key={g.id}
                type="button"
                className={`gen-toggle ${on ? 'gen-toggle--on' : ''}`}
                aria-pressed={on}
                onClick={() => toggleGeneration(g.id)}
              >
                <span className="gen-toggle__n">{g.label}</span>
                <span className="gen-toggle__label">{g.region}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="settings__section" aria-labelledby="mode-heading">
        <h2 id="mode-heading" className="settings__section-title">
          Oefenmodus
        </h2>
        <div className="settings__modes" role="group" aria-label="Oefenmodus">
          <button
            type="button"
            className={`mode-toggle ${!sums ? 'mode-toggle--on' : ''}`}
            aria-pressed={!sums}
            onClick={() => setMathMode('tables')}
          >
            Maaltafels
          </button>
          <button
            type="button"
            className={`mode-toggle ${sums ? 'mode-toggle--on' : ''}`}
            aria-pressed={sums}
            onClick={() => setMathMode('sums')}
          >
            Plus &amp; min
          </button>
        </div>
      </section>

      {sums ? (
        <section className="settings__section" aria-labelledby="sum-heading">
          <h2 id="sum-heading" className="settings__section-title">
            Moeilijkheid
          </h2>
          <p className="settings__hint settings__hint--tight">
            Getallen van 0 tot… (min-sommen geven nooit een negatief antwoord)
          </p>
          <div className="settings__tables" role="group" aria-label="Moeilijkheid plus en min">
            {SUM_MAX_OPTIONS.map((max) => {
              const on = settings.sumMax === max
              return (
                <button
                  key={max}
                  type="button"
                  className={`table-toggle ${on ? 'table-toggle--on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setSumMax(max)}
                >
                  <span className="table-toggle__n">0–{max}</span>
                  <span className="table-toggle__label">tot</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="settings__section" aria-labelledby="tables-heading">
          <h2 id="tables-heading" className="settings__section-title">
            Actieve tafels
          </h2>
          <p className="settings__hint settings__hint--tight">
            Zet de maaltafels aan die je wilt oefenen (0 t/m 10).
          </p>
          <div className="settings__tables" role="group" aria-label="Actieve maaltafels">
            {ALL_TABLES.map((t) => {
              const on = settings.activeTables.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  className={`table-toggle ${on ? 'table-toggle--on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggleTable(t)}
                >
                  <span className="table-toggle__n">{t}</span>
                  <span className="table-toggle__label">tafel</span>
                </button>
              )
            })}
          </div>
          <p className="settings__hint">
            Minstens één tafel moet aan staan. Nu actief:{' '}
            {settings.activeTables.join(', ')}
          </p>

          <h2 id="ops-heading" className="settings__section-title">
            Bewerkingen
          </h2>
          <p className="settings__hint settings__hint--tight">
            Kies ×, ÷ of beide (minstens één). Gedeeld door gebruikt dezelfde tafels.
          </p>
          <div className="settings__modes" role="group" aria-label="Maaltafel-bewerkingen">
            <button
              type="button"
              className={`mode-toggle ${settings.includeMultiply ? 'mode-toggle--on' : ''}`}
              aria-pressed={settings.includeMultiply}
              onClick={() => setIncludeMultiply(!settings.includeMultiply)}
            >
              × maal
            </button>
            <button
              type="button"
              className={`mode-toggle ${settings.includeDivision ? 'mode-toggle--on' : ''}`}
              aria-pressed={settings.includeDivision}
              onClick={() => setIncludeDivision(!settings.includeDivision)}
            >
              ÷ gedeeld door
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className="btn btn--danger"
        onClick={() => {
          if (
            window.confirm(
              'Weet je zeker dat je alle voortgang wilt wissen? Je begint opnieuw met een starter.',
            )
          ) {
            resetGame()
          }
        }}
      >
        Alles wissen
      </button>
    </div>
  )
}
