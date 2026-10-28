import { HpBar } from '../components/HpBar'
import { PokemonSprite } from '../components/PokemonSprite'
import { TypeBadges } from '../components/TypeBadges'
import { useGame } from '../context/GameContext'
import { getPokemon } from '../lib/pokemon'
import { MAX_PARTY_SIZE } from '../lib/types'
import './Party.css'

export function Party() {
  const { setScreen, progress, setActivePartner } = useGame()
  const emptySlots = Math.max(0, MAX_PARTY_SIZE - progress.party.length)

  return (
    <div className="screen party">
      <header className="party__head">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
          ← Terug
        </button>
        <h1>Mijn team</h1>
        <p className="lede">
          {progress.party.length}/{MAX_PARTY_SIZE} Pokémon. Tik om je favoriet te
          kiezen. Bij een knock-out kies je een volgende.
        </p>
      </header>

      <ul className="party__list">
        {progress.party.map((m) => {
          const p = getPokemon(m.pokemonId)
          const active = m.instanceId === progress.activePartnerInstanceId
          const canSelect = m.hp > 0
          return (
            <li key={m.instanceId}>
              <button
                type="button"
                className={`party__item ${active ? 'party__item--active' : ''}`}
                disabled={!canSelect}
                onClick={() => setActivePartner(m.instanceId)}
              >
                <PokemonSprite id={p.id} name={p.name} size={72} anim="none" />
                <div className="party__info">
                  <strong>
                    {p.name}
                    {active ? ' ★' : ''}
                  </strong>
                  <TypeBadges types={p.types} size="sm" />
                  <HpBar hp={m.hp} maxHp={m.maxHp} />
                </div>
              </button>
            </li>
          )
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <li key={`empty-${i}`} className="party__empty" aria-hidden>
            Lege plek
          </li>
        ))}
      </ul>
    </div>
  )
}
