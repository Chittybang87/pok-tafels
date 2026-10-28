import { HpBar } from '../components/HpBar'
import { PokemonSprite } from '../components/PokemonSprite'
import { TypeBadges } from '../components/TypeBadges'
import { useGame } from '../context/GameContext'
import { encounterTier, encounterTierLabel } from '../lib/battle'
import { getPokemon } from '../lib/pokemon'
import { getActivePartner } from '../lib/storage'
import './Home.css'

export function Home() {
  const { setScreen, startBattle, progress } = useGame()
  const partner = getActivePartner(progress)
  const species = partner ? getPokemon(partner.pokemonId) : null
  const canBattle = progress.party.some((p) => p.hp > 0)
  const needsHeal = progress.party.some((p) => p.hp < p.maxHp)
  const tier = encounterTier(progress.correctAnswers)
  const routeLabel = encounterTierLabel(tier)

  return (
    <div className="screen home">
      <header className="home__hero">
        <p className="brand">Pokétafels</p>
        <h1>Klaar om te oefenen?</h1>
        <p className="lede">
          Gevangen: {progress.caughtIds.length}/151 · Wild: {routeLabel}
        </p>
      </header>

      {partner && species && (
        <div className="home__partner">
          <PokemonSprite id={species.id} name={species.name} size={120} />
          <div className="home__partner-info">
            <strong>{species.name}</strong>
            <TypeBadges types={species.types} size="sm" />
            <HpBar hp={partner.hp} maxHp={partner.maxHp} />
            {!canBattle ? (
              <p className="home__warn">Eerst herstellen voor een gevecht!</p>
            ) : partner.hp <= 0 ? (
              <p className="home__warn">
                Uitgeput — in het gevecht kies je een volgende.
              </p>
            ) : null}
          </div>
        </div>
      )}

      <nav className="home__nav">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canBattle}
          onClick={startBattle}
        >
          Wild gevecht
        </button>
        <button
          type="button"
          className="btn"
          disabled={!needsHeal}
          onClick={() => setScreen('heal')}
        >
          Herstellen
        </button>
        <button type="button" className="btn" onClick={() => setScreen('party')}>
          Mijn team
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setScreen('pokedex')}
        >
          Pokédex
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setScreen('settings')}
        >
          Instellingen
        </button>
      </nav>
    </div>
  )
}
