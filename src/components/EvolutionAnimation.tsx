import { useEffect, useState } from 'react'
import { getPokemon } from '../lib/pokemon'
import { PokemonSprite } from './PokemonSprite'
import './EvolutionAnimation.css'

type Phase = 'charge' | 'flash' | 'reveal' | 'done'

interface Props {
  fromId: number
  intoId: number
  onDone: () => void
}

export function EvolutionAnimation({ fromId, intoId, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('charge')
  const from = getPokemon(fromId)
  const into = getPokemon(intoId)
  const showInto = phase === 'reveal' || phase === 'done'

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('flash'), 1400)
    const t2 = window.setTimeout(() => setPhase('reveal'), 1400 + 700)
    const t3 = window.setTimeout(() => setPhase('done'), 1400 + 700 + 1200)
    const t4 = window.setTimeout(onDone, 1400 + 700 + 1200 + 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [onDone])

  return (
    <div className={`evo evo--${phase}`} role="dialog" aria-label="Evolutie">
      <div className="evo__glow" aria-hidden />
      <div className="evo__sprite-wrap">
        <PokemonSprite
          id={showInto ? intoId : fromId}
          name={showInto ? into.name : from.name}
          size={160}
          anim={phase === 'charge' ? 'idle' : 'none'}
          className="evo__sprite"
        />
        {phase === 'flash' && <div className="evo__burst" aria-hidden />}
      </div>
      {phase === 'charge' && (
        <p className="evo__msg">Wat? {from.name} is aan het evolueren!</p>
      )}
      {(phase === 'reveal' || phase === 'done') && (
        <p className="evo__msg">
          Gefeliciteerd! Je {from.name} evolueerde in {into.name}!
        </p>
      )}
      {phase === 'done' && <div className="evo__stars" aria-hidden>✦ ✦ ✦</div>}
    </div>
  )
}
