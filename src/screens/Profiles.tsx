import { useGame } from '../context/GameContext'
import { MAX_PROFILES } from '../lib/types'
import './Profiles.css'

export function Profiles() {
  const { profiles, selectProfile, setScreen } = useGame()
  const empty = profiles.length === 0

  return (
    <div className="screen profiles">
      <header className="profiles__hero">
        <p className="brand">Pokétafels</p>
        <h1>Wie speelt er?</h1>
        <p className="lede">
          {empty
            ? 'Nog geen spelers. Een ouder kan ze aanmaken in Instellingen.'
            : 'Kies je naam om te beginnen.'}
        </p>
      </header>

      {empty ? null : (
        <ul className="profiles__list">
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="profiles__player"
                onClick={() => selectProfile(p.id)}
              >
                <span className="profiles__player-name">{p.name}</span>
                <span className="profiles__player-meta">
                  {p.progress.starterChosen
                    ? `${p.progress.caughtIds.length} gevangen`
                    : 'Nog starten'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <nav className="profiles__nav">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setScreen('settings')}
        >
          Instellingen
        </button>
        {!empty && profiles.length < MAX_PROFILES ? (
          <p className="profiles__hint">
            Nieuwe speler? Vraag een ouder om er één toe te voegen.
          </p>
        ) : null}
      </nav>
    </div>
  )
}
