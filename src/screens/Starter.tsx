import { PokemonSprite } from '../components/PokemonSprite'
import { TypeBadges } from '../components/TypeBadges'
import { useGame } from '../context/GameContext'
import { getPokemon } from '../lib/pokemon'
import { STARTER_IDS } from '../lib/types'
import './Starter.css'

export function Starter() {
  const { chooseStarter } = useGame()

  return (
    <div className="screen starter">
      <header className="starter__hero">
        <p className="brand">Pokétafels</p>
        <h1>Kies je Pokémon</h1>
        <p className="lede">Dit wordt je partner in elk gevecht. Let op de types!</p>
      </header>
      <div className="starter__grid">
        {STARTER_IDS.map((id) => {
          const p = getPokemon(id)
          return (
            <button
              key={id}
              type="button"
              className="starter__card"
              onClick={() => chooseStarter(id)}
            >
              <PokemonSprite id={id} name={p.name} size={140} />
              <span className="starter__name">{p.name}</span>
              <TypeBadges types={p.types} size="sm" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
