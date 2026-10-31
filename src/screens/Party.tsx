import { useCallback, useMemo, useState } from 'react'
import { EvolutionAnimation } from '../components/EvolutionAnimation'
import { HpBar } from '../components/HpBar'
import { PokemonSprite } from '../components/PokemonSprite'
import { TypeBadges } from '../components/TypeBadges'
import { useGame } from '../context/GameContext'
import {
  EVOLVE_CORRECT_NEEDED,
  canEvolveSpecies,
  evolvesToIds,
} from '../lib/evolution'
import { getPokemon } from '../lib/pokemon'
import { MAX_PARTY_SIZE } from '../lib/types'
import './Party.css'

export function Party() {
  const {
    setScreen,
    progress,
    settings,
    setActivePartner,
    evolveMember,
    replacePartyMember,
  } = useGame()
  const emptySlots = Math.max(0, MAX_PARTY_SIZE - progress.party.length)
  const gens = settings.activeGenerations

  const [evolving, setEvolving] = useState<{
    instanceId: string
    fromId: number
    intoId: number
  } | null>(null)
  const [pickFor, setPickFor] = useState<{
    instanceId: string
    fromId: number
    options: number[]
  } | null>(null)
  const [swapFor, setSwapFor] = useState<{
    instanceId: string
    pokemonId: number
  } | null>(null)

  const partyIds = useMemo(
    () => new Set(progress.party.map((m) => m.pokemonId)),
    [progress.party],
  )

  const boxOptions = useMemo(
    () =>
      progress.caughtIds
        .filter((id) => !partyIds.has(id))
        .slice()
        .sort((a, b) => a - b),
    [progress.caughtIds, partyIds],
  )

  const startEvolve = (instanceId: string, fromId: number) => {
    const options = evolvesToIds(fromId, gens)
    if (options.length === 0) return
    if (options.length === 1) {
      setEvolving({ instanceId, fromId, intoId: options[0]! })
      return
    }
    setPickFor({ instanceId, fromId, options })
  }

  const onEvoDone = useCallback(() => {
    if (!evolving) return
    evolveMember(evolving.instanceId, evolving.intoId)
    setEvolving(null)
  }, [evolving, evolveMember])

  const confirmSwap = (pokemonId: number) => {
    if (!swapFor) return
    replacePartyMember(swapFor.instanceId, pokemonId)
    setSwapFor(null)
  }

  return (
    <div className="screen party">
      <header className="party__head">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
          ← Terug
        </button>
        <h1>Mijn team</h1>
        <p className="lede">
          {progress.party.length}/{MAX_PARTY_SIZE} Pokémon. Tik om je favoriet te
          kiezen. Wissel een plek met een andere gevangen Pokémon. Na{' '}
          {EVOLVE_CORRECT_NEEDED} goede antwoorden kan een Pokémon evolueren.
        </p>
      </header>

      <ul className="party__list">
        {progress.party.map((m) => {
          const p = getPokemon(m.pokemonId)
          const active = m.instanceId === progress.activePartnerInstanceId
          const canSelect = m.hp > 0
          const ready =
            canEvolveSpecies(m.pokemonId, gens) &&
            m.correctCount >= EVOLVE_CORRECT_NEEDED
          const progressLabel = canEvolveSpecies(m.pokemonId, gens)
            ? `${Math.min(m.correctCount, EVOLVE_CORRECT_NEEDED)}/${EVOLVE_CORRECT_NEEDED} tot evolutie`
            : null
          const canSwap = boxOptions.length > 0

          return (
            <li key={m.instanceId}>
              <div
                className={`party__row ${active ? 'party__row--active' : ''} ${
                  ready ? 'party__row--ready' : ''
                }`}
              >
                <button
                  type="button"
                  className="party__item"
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
                    {progressLabel && (
                      <p className="party__evo-progress">{progressLabel}</p>
                    )}
                  </div>
                </button>
                <div className="party__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm party__swap-btn"
                    disabled={!canSwap}
                    onClick={() =>
                      setSwapFor({
                        instanceId: m.instanceId,
                        pokemonId: m.pokemonId,
                      })
                    }
                  >
                    Wissel
                  </button>
                  {ready && (
                    <button
                      type="button"
                      className="btn btn--primary party__evolve-btn"
                      onClick={() => startEvolve(m.instanceId, m.pokemonId)}
                    >
                      Evolueer!
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <li key={`empty-${i}`} className="party__empty" aria-hidden>
            Lege plek
          </li>
        ))}
      </ul>

      {swapFor && (
        <div className="party__pick" role="dialog" aria-label="Wissel Pokémon">
          <div className="party__pick-card">
            <h2>Wissel {getPokemon(swapFor.pokemonId).name}</h2>
            <p className="lede">
              Kies een andere gevangen Pokémon voor deze plek in je team.
            </p>
            {boxOptions.length === 0 ? (
              <p className="lede">Je hebt geen andere gevangen Pokémon klaar.</p>
            ) : (
              <ul className="party__pick-list">
                {boxOptions.map((id) => {
                  const opt = getPokemon(id)
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className="party__pick-option"
                        onClick={() => confirmSwap(id)}
                      >
                        <PokemonSprite
                          id={opt.id}
                          name={opt.name}
                          size={64}
                          anim="none"
                        />
                        <strong>{opt.name}</strong>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSwapFor(null)}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {pickFor && (
        <div className="party__pick" role="dialog" aria-label="Kies evolutie">
          <div className="party__pick-card">
            <h2>Kies een evolutie</h2>
            <p className="lede">
              {getPokemon(pickFor.fromId).name} kan meerdere vormen worden.
            </p>
            <ul className="party__pick-list">
              {pickFor.options.map((id) => {
                const opt = getPokemon(id)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="party__pick-option"
                      onClick={() => {
                        setEvolving({
                          instanceId: pickFor.instanceId,
                          fromId: pickFor.fromId,
                          intoId: id,
                        })
                        setPickFor(null)
                      }}
                    >
                      <PokemonSprite id={opt.id} name={opt.name} size={64} anim="none" />
                      <strong>{opt.name}</strong>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setPickFor(null)}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {evolving && (
        <EvolutionAnimation
          fromId={evolving.fromId}
          intoId={evolving.intoId}
          onDone={onEvoDone}
        />
      )}
    </div>
  )
}
