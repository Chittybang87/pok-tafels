import { useCallback, useState } from 'react'
import { HpBar } from '../components/HpBar'
import { Keypad } from '../components/Keypad'
import { PokemonSprite } from '../components/PokemonSprite'
import { useGame } from '../context/GameContext'
import { getPokemon } from '../lib/pokemon'
import { nextQuestion } from '../lib/questions'
import type { MathQuestion, PartyMember } from '../lib/types'
import './Heal.css'

export function Heal() {
  const { setScreen, progress, settings, healMember, recordCorrectAnswer } =
    useGame()
  const injured = progress.party.filter((p) => p.hp < p.maxHp)
  const [target, setTarget] = useState<PartyMember | null>(null)
  const [question, setQuestion] = useState<MathQuestion>(() =>
    nextQuestion(settings),
  )
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [healFlash, setHealFlash] = useState(false)
  const [busy, setBusy] = useState(false)

  const current = target
    ? progress.party.find((p) => p.instanceId === target.instanceId) ?? target
    : null

  const refreshQuestion = useCallback(() => {
    setQuestion(nextQuestion(settings))
    setAnswer('')
  }, [settings])

  const submit = () => {
    if (!current || busy || answer === '') return
    const num = Number(answer)
    setBusy(true)

    if (num === question.answer) {
      recordCorrectAnswer()
      healMember(current.instanceId, 1)
      setHealFlash(true)
      setFeedback('Goed! +1 HP')
      window.setTimeout(() => {
        setHealFlash(false)
        setFeedback(null)
        setBusy(false)
        refreshQuestion()
      }, 700)
    } else {
      setFeedback(`Bijna… het was ${question.answer}`)
      window.setTimeout(() => {
        setFeedback(null)
        setBusy(false)
        refreshQuestion()
      }, 1200)
    }
  }

  if (current && current.hp >= current.maxHp) {
    return (
      <div className="screen heal">
        <header>
          <h1>Helemaal fris!</h1>
          <p className="lede">{getPokemon(current.pokemonId).name} is weer op volle HP.</p>
        </header>
        <PokemonSprite id={current.pokemonId} size={140} />
        <div className="heal__actions">
          <button type="button" className="btn btn--primary" onClick={() => setTarget(null)}>
            Ander herstellen
          </button>
          <button type="button" className="btn" onClick={() => setScreen('home')}>
            Klaar
          </button>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="screen heal">
        <header className="heal__head">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
            ← Terug
          </button>
          <h1>Herstellen</h1>
          <p className="lede">Los sommen op om HP terug te krijgen.</p>
        </header>

        {injured.length === 0 ? (
          <p>Iedereen is al helemaal fris!</p>
        ) : (
          <ul className="heal__list">
            {injured.map((m) => {
              const p = getPokemon(m.pokemonId)
              return (
                <li key={m.instanceId}>
                  <button
                    type="button"
                    className="heal__pick"
                    onClick={() => {
                      setTarget(m)
                      refreshQuestion()
                    }}
                  >
                    <PokemonSprite id={p.id} name={p.name} size={72} anim="none" />
                    <div>
                      <strong>{p.name}</strong>
                      <HpBar hp={m.hp} maxHp={m.maxHp} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  const species = getPokemon(current.pokemonId)

  return (
    <div className="screen heal heal--session">
      <header className="heal__session-head">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
          Klaar
        </button>
        <div className="heal__focus">
          <PokemonSprite id={species.id} name={species.name} size={96} />
          <HpBar
            hp={current.hp}
            maxHp={current.maxHp}
            label={species.name}
            healFlash={healFlash}
          />
        </div>
      </header>

      <div className="heal__question" aria-live="polite">
        <span className="heal__prompt">{question.display} = ?</span>
        {feedback && <p className="heal__feedback">{feedback}</p>}
      </div>

      <Keypad
        value={answer}
        onChange={setAnswer}
        onSubmit={submit}
        disabled={busy}
      />
    </div>
  )
}
