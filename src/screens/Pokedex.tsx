import { useMemo } from 'react'
import { PokemonSprite } from '../components/PokemonSprite'
import { TypeBadges } from '../components/TypeBadges'
import { useGame } from '../context/GameContext'
import { pokemonForGenerations } from '../lib/pokemon'
import './Pokedex.css'

export function Pokedex() {
  const { setScreen, progress, settings } = useGame()

  const list = useMemo(
    () => pokemonForGenerations(settings.activeGenerations),
    [settings.activeGenerations],
  )

  const caughtInActive = useMemo(
    () => list.filter((p) => progress.caughtIds.includes(p.id)).length,
    [list, progress.caughtIds],
  )

  return (
    <div className="screen pokedex">
      <header className="pokedex__head">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
          ← Terug
        </button>
        <h1>Pokédex</h1>
        <p className="lede">
          {caughtInActive} / {list.length} gevangen
        </p>
      </header>

      <div className="pokedex__grid">
        {list.map((p) => {
          const caught = progress.caughtIds.includes(p.id)
          const seen = progress.seenIds.includes(p.id) || caught
          return (
            <div
              key={p.id}
              className={`pokedex__cell ${caught ? 'pokedex__cell--caught' : ''}`}
              title={caught || seen ? p.name : '???'}
            >
              <span className="pokedex__num">
                #{String(p.id).padStart(3, '0')}
              </span>
              {seen ? (
                <PokemonSprite
                  id={p.id}
                  name={p.name}
                  size={64}
                  anim="none"
                  silhouette={!caught}
                />
              ) : (
                <div className="pokedex__empty">?</div>
              )}
              <span className="pokedex__name">
                {caught ? p.name : seen ? p.name : '???'}
              </span>
              {caught && <TypeBadges types={p.types} size="sm" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
