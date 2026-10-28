import { useCallback, useEffect, useMemo, useState } from 'react'
import { CatchAnimation } from '../components/CatchAnimation'
import { HpBar } from '../components/HpBar'
import { Keypad } from '../components/Keypad'
import { PokemonSprite } from '../components/PokemonSprite'
import { TypeBadges } from '../components/TypeBadges'
import { useGame } from '../context/GameContext'
import {
  catchChance,
  computeMatchup,
  encounterTier,
  pickWildId,
  rollCatch,
  wildMaxHp,
} from '../lib/battle'
import { getPokemon } from '../lib/pokemon'
import { nextQuestion } from '../lib/questions'
import { getActivePartner } from '../lib/storage'
import type { MathQuestion, PartyMember } from '../lib/types'
import './Battle.css'

type Phase = 'pick' | 'fight' | 'catching' | 'caught' | 'fled' | 'defeat'

export function Battle() {
  const {
    setScreen,
    startBattle,
    settings,
    progress,
    setActivePartner,
    updatePartyMember,
    catchPokemon,
    markSeen,
    recordAnswer,
  } = useGame()

  const wildId = useMemo(
    () =>
      pickWildId(
        progress.caughtIds,
        settings.activeGenerations,
        progress.correctAnswers,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- één wild per battle-mount
    [],
  )
  const wildSpecies = getPokemon(wildId)
  const wildTier = useMemo(
    () => encounterTier(progress.correctAnswers),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot bij battle-start
    [],
  )
  const wildMax = wildMaxHp(wildId, wildTier)

  const available = useMemo(
    () => progress.party.filter((m) => m.hp > 0),
    [progress.party],
  )

  const [partner, setPartner] = useState<PartyMember | null>(null)
  const [partnerHp, setPartnerHp] = useState(0)
  const [wildHp, setWildHp] = useState(wildMax)
  const [question, setQuestion] = useState<MathQuestion>(() =>
    nextQuestion(settings),
  )
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [partnerAnim, setPartnerAnim] = useState<'idle' | 'attack' | 'hit'>('idle')
  const [wildAnim, setWildAnim] = useState<'idle' | 'attack' | 'hit'>('idle')
  const [phase, setPhase] = useState<Phase>('pick')
  const [ballsLeft, setBallsLeft] = useState(3)
  const [turns, setTurns] = useState(0)
  const [catchPlay, setCatchPlay] = useState(false)
  const [catchSuccess, setCatchSuccess] = useState<boolean | null>(null)
  const [joinedParty, setJoinedParty] = useState(true)
  const [pickReason, setPickReason] = useState<'start' | 'faint' | 'manual'>('start')
  const [faintedName, setFaintedName] = useState<string | null>(null)

  useEffect(() => {
    markSeen(wildId)
  }, [wildId, markSeen])

  useEffect(() => {
    if (available.length === 0) {
      setScreen('home')
    }
  }, [available.length, setScreen])

  const partnerSpecies = partner ? getPokemon(partner.pokemonId) : null

  const offense = useMemo(() => {
    if (!partnerSpecies) return null
    return computeMatchup(partnerSpecies.types, wildSpecies.types)
  }, [partnerSpecies, wildSpecies.types])

  const defense = useMemo(() => {
    if (!partnerSpecies) return null
    return computeMatchup(wildSpecies.types, partnerSpecies.types)
  }, [partnerSpecies, wildSpecies.types])

  const refreshQuestion = useCallback(() => {
    setQuestion(nextQuestion(settings))
    setAnswer('')
  }, [settings])

  const persistPartnerHp = useCallback(
    (member: PartyMember, hp: number) => {
      updatePartyMember({ ...member, hp })
    },
    [updatePartyMember],
  )

  const choosePartner = (member: PartyMember) => {
    if (member.hp <= 0 || busy) return
    if (partner && partner.instanceId !== member.instanceId && partnerHp > 0) {
      persistPartnerHp(partner, partnerHp)
    }
    setActivePartner(member.instanceId)
    setPartner(member)
    setPartnerHp(member.hp)
    setPhase('fight')
    setFeedback(null)
    setFaintedName(null)
    setPickReason('start')
    refreshQuestion()
  }

  const openSwitch = () => {
    if (phase !== 'fight' || busy || !partner) return
    persistPartnerHp(partner, partnerHp)
    setPickReason('manual')
    setPhase('pick')
  }

  const submit = () => {
    if (phase !== 'fight' || busy || answer === '' || !partner || !offense || !defense)
      return
    const num = Number(answer)
    setBusy(true)
    setTurns((t) => t + 1)

    if (num === question.answer) {
      recordAnswer(question, true)
      setPartnerAnim('attack')
      setWildAnim('hit')
      const dmg = offense.damage
      const nextWild = Math.max(0, wildHp - dmg)
      setWildHp(nextWild)
      if (offense.kind === 'super') {
        setFeedback(`Super effectief! −${dmg} HP`)
      } else if (offense.kind === 'weak') {
        setFeedback(`Niet zo effectief… −${dmg} HP`)
      } else if (offense.kind === 'immune') {
        setFeedback('Geen effect! Wissel van Pokémon?')
      } else {
        setFeedback(`Raak! −${dmg} HP`)
      }
      window.setTimeout(() => {
        setPartnerAnim('idle')
        setWildAnim('idle')
        setFeedback(null)
        if (nextWild <= 0) {
          setPhase('catching')
          setBusy(false)
        } else {
          setBusy(false)
          refreshQuestion()
        }
      }, 750)
    } else {
      recordAnswer(question, false)
      setWildAnim('attack')
      setPartnerAnim('hit')
      const dmg = Math.max(1, defense.damage)
      const nextHp = Math.max(0, partnerHp - dmg)
      setPartnerHp(nextHp)
      persistPartnerHp(partner, nextHp)
      const typeHint =
        defense.kind === 'super'
          ? ` (sterk tegen jou! −${dmg} HP)`
          : defense.kind === 'weak'
            ? ` (−${dmg} HP)`
            : ` (−${dmg} HP)`
      setFeedback(`Fout… het was ${question.answer}${typeHint}`)
      window.setTimeout(() => {
        setPartnerAnim('idle')
        setWildAnim('idle')
        setFeedback(null)
        if (nextHp <= 0) {
          const othersUp = progress.party.some(
            (m) => m.instanceId !== partner.instanceId && m.hp > 0,
          )
          if (othersUp) {
            setFaintedName(partnerSpecies?.name ?? 'Je Pokémon')
            setPickReason('faint')
            setPhase('pick')
          } else {
            setPhase('defeat')
          }
          setBusy(false)
        } else {
          setBusy(false)
          refreshQuestion()
        }
      }, 1400)
    }
  }

  const throwBall = () => {
    if (phase !== 'catching' || catchPlay || ballsLeft <= 0) return
    const chance = catchChance(wildMax, turns)
    const ok = rollCatch(chance)
    setCatchSuccess(ok)
    setCatchPlay(true)
    setBallsLeft((b) => b - 1)
  }

  const onCatchAnimDone = useCallback(() => {
    const succeeded = catchSuccess === true
    const remaining = ballsLeft
    setCatchPlay(false)
    setCatchSuccess(null)
    if (succeeded) {
      setJoinedParty(catchPokemon(wildId))
      setPhase('caught')
    } else if (remaining <= 0) {
      setPhase('fled')
    }
  }, [catchSuccess, ballsLeft, catchPokemon, wildId])

  if (available.length === 0) return null

  if (phase === 'defeat' && partnerSpecies) {
    return (
      <div className="screen battle battle--end">
        <h1>Oh nee…</h1>
        <p className="lede">{partnerSpecies.name} is uitgeput. Ga herstellen!</p>
        <PokemonSprite id={partnerSpecies.id} anim="none" size={140} />
        <button type="button" className="btn btn--primary" onClick={() => setScreen('heal')}>
          Herstellen
        </button>
        <button type="button" className="btn" onClick={() => setScreen('home')}>
          Home
        </button>
      </div>
    )
  }

  if (phase === 'caught') {
    return (
      <div className="screen battle battle--end">
        <h1>Gevangen!</h1>
        <p className="lede">
          {joinedParty
            ? `${wildSpecies.name} zit in je team.`
            : `${wildSpecies.name} is gevangen! Je team is vol (max 6) — je vindt ${wildSpecies.name} in de Pokédex.`}
        </p>
        <TypeBadges types={wildSpecies.types} />
        <PokemonSprite id={wildId} name={wildSpecies.name} size={160} />
        <button type="button" className="btn btn--primary" onClick={() => setScreen('home')}>
          Super!
        </button>
      </div>
    )
  }

  if (phase === 'fled') {
    return (
      <div className="screen battle battle--end">
        <h1>Weggevlogen…</h1>
        <p className="lede">{wildSpecies.name} is ontsnapt. Volgende keer!</p>
        <button type="button" className="btn btn--primary" onClick={() => setScreen('home')}>
          Home
        </button>
        <button type="button" className="btn" onClick={startBattle}>
          Opnieuw
        </button>
      </div>
    )
  }

  if (phase === 'pick') {
    const preferred = getActivePartner(progress)
    const sorted = [...available].sort((a, b) => {
      if (preferred && a.instanceId === preferred.instanceId) return -1
      if (preferred && b.instanceId === preferred.instanceId) return 1
      const ma = computeMatchup(getPokemon(a.pokemonId).types, wildSpecies.types)
      const mb = computeMatchup(getPokemon(b.pokemonId).types, wildSpecies.types)
      return mb.multiplier - ma.multiplier
    })

    const pickHint =
      pickReason === 'faint'
        ? `${faintedName ?? 'Je Pokémon'} is uitgeput! Kies een volgende.`
        : pickReason === 'manual'
          ? 'Kies wie je inzet. Let op de types!'
          : 'Kies wie je inzet. Let op de types!'

    return (
      <div className="screen battle battle--pick">
        <header className="battle__pick-head">
          {pickReason === 'faint' ? (
            <p className="lede">Wissel van Pokémon!</p>
          ) : (
            <p className="lede">Een wilde Pokémon verschijnt!</p>
          )}
          <h1>{wildSpecies.name}</h1>
          <TypeBadges types={wildSpecies.types} />
          <PokemonSprite id={wildId} name={wildSpecies.name} size={140} anim="idle" />
          <p className="lede battle__pick-hint">{pickHint}</p>
        </header>

        <ul className="battle__pick-list">
          {sorted.map((m) => {
            const p = getPokemon(m.pokemonId)
            const match = computeMatchup(p.types, wildSpecies.types)
            return (
              <li key={m.instanceId}>
                <button
                  type="button"
                  className={`battle__pick-item battle__pick-item--${match.kind}`}
                  onClick={() => choosePartner(m)}
                >
                  <PokemonSprite id={p.id} name={p.name} size={64} anim="none" />
                  <div className="battle__pick-info">
                    <strong>{p.name}</strong>
                    <TypeBadges types={p.types} size="sm" />
                    <HpBar hp={m.hp} maxHp={m.maxHp} />
                    <span className={`battle__matchup battle__matchup--${match.kind}`}>
                      {match.kind === 'immune'
                        ? match.label
                        : `${match.label} (−${match.damage} HP)`}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {pickReason !== 'faint' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScreen('home')}>
            Wegwezen
          </button>
        )}
      </div>
    )
  }

  if (!partner || !partnerSpecies || !offense) return null

  return (
    <div className="screen battle">
      <div className="battle__arena">
        <div className="battle__wild">
          <HpBar hp={wildHp} maxHp={wildMax} label={wildSpecies.name} />
          <TypeBadges types={wildSpecies.types} size="sm" />
          <div className="battle__sprite-wrap">
            <PokemonSprite
              id={wildId}
              name={wildSpecies.name}
              size={140}
              anim={wildAnim}
            />
            <CatchAnimation
              playing={catchPlay}
              success={catchSuccess}
              onDone={onCatchAnimDone}
            />
          </div>
        </div>

        <div className="battle__partner">
          <PokemonSprite
            id={partnerSpecies.id}
            name={partnerSpecies.name}
            size={110}
            anim={partnerAnim}
            className="battle__partner-sprite"
          />
          <div className="battle__partner-meta">
            <TypeBadges types={partnerSpecies.types} size="sm" />
            <HpBar
              hp={partnerHp}
              maxHp={partner.maxHp}
              label={partnerSpecies.name}
            />
            <span className={`battle__matchup battle__matchup--${offense.kind}`}>
              {offense.label}
            </span>
          </div>
        </div>
      </div>

      {phase === 'fight' && (
        <>
          <div className="battle__question" aria-live="polite">
            <span className="battle__prompt">{question.display} = ?</span>
            {feedback && <p className="battle__feedback">{feedback}</p>}
          </div>
          <Keypad
            value={answer}
            onChange={setAnswer}
            onSubmit={submit}
            disabled={busy}
          />
          <div className="battle__actions">
            {available.length > 1 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={busy}
                onClick={openSwitch}
              >
                Wissel Pokémon
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busy}
              onClick={() => {
                persistPartnerHp(partner, partnerHp)
                setScreen('home')
              }}
            >
              Wegwezen
            </button>
          </div>
        </>
      )}

      {phase === 'catching' && !catchPlay && (
        <div className="battle__catch">
          <p className="lede">
            {wildSpecies.name} is verzwakt! Ballen: {ballsLeft}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            disabled={ballsLeft <= 0}
            onClick={throwBall}
          >
            Gooi een Pokébal
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setScreen('home')}>
            Laat gaan
          </button>
        </div>
      )}
    </div>
  )
}
