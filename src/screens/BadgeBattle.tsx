import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeIcon } from '../components/BadgeIcon'
import { HpBar } from '../components/HpBar'
import { Keypad } from '../components/Keypad'
import { PokemonSprite } from '../components/PokemonSprite'
import { TypeBadges } from '../components/TypeBadges'
import { useGame } from '../context/GameContext'
import {
  BADGE_BOSS_HP,
  BADGE_PARTNER_DAMAGE,
  BADGE_PASS_SCORE,
  BADGE_QUESTION_COUNT,
  BADGE_SECONDS,
  badgeIdForSelection,
  badgeVisual,
  pickBadgeBossIds,
} from '../lib/badges'
import { getPokemon } from '../lib/pokemon'
import { nextQuestionForChallenge } from '../lib/questions'
import { getActivePartner } from '../lib/storage'
import type { MathQuestion, PartyMember } from '../lib/types'
import './BadgeBattle.css'

type Phase = 'pick' | 'fight' | 'won' | 'lost' | 'defeat'

export function BadgeBattle() {
  const {
    setScreen,
    settings,
    progress,
    badgeChallenge,
    startBadgeChallenge,
    recordBadgeAttempt,
    setActivePartner,
    updatePartyMember,
    recordAnswer,
  } = useGame()

  const selection = badgeChallenge

  const bossIds = useMemo(
    () => pickBadgeBossIds(settings.activeGenerations),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- één set bosses per mount
    [],
  )

  const badgeId = useMemo(
    () => (selection ? badgeIdForSelection(selection) : null),
    [selection],
  )

  const available = useMemo(
    () => progress.party.filter((p) => p.hp > 0),
    [progress.party],
  )

  const makeQuestion = useCallback((): MathQuestion => {
    if (!selection) {
      return nextQuestionForChallenge({ mode: 'tables', tables: [1] })
    }
    if (selection.mode === 'sums') {
      return nextQuestionForChallenge({
        mode: 'sums',
        sumMax: selection.sumMax,
      })
    }
    return nextQuestionForChallenge({
      mode: 'tables',
      tables: selection.tables,
      includeMultiply: settings.includeMultiply,
      includeDivision: settings.includeDivision,
    })
  }, [selection, settings.includeMultiply, settings.includeDivision])

  const [phase, setPhase] = useState<Phase>('pick')
  const [partner, setPartner] = useState<PartyMember | null>(null)
  const [partnerHp, setPartnerHp] = useState(0)
  const [bossIndex, setBossIndex] = useState(0)
  const [bossHp, setBossHp] = useState(BADGE_BOSS_HP)
  const [question, setQuestion] = useState<MathQuestion>(() => makeQuestion())
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [attempted, setAttempted] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(BADGE_SECONDS)
  const [partnerAnim, setPartnerAnim] = useState<'idle' | 'attack' | 'hit'>(
    'idle',
  )
  const [bossAnim, setBossAnim] = useState<'idle' | 'attack' | 'hit'>('idle')
  const [pickReason, setPickReason] = useState<'start' | 'faint'>('start')
  const [faintedName, setFaintedName] = useState<string | null>(null)
  const [badgeSaved, setBadgeSaved] = useState(false)

  const timerRef = useRef<number | null>(null)
  const resolvingRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const persistPartnerHp = useCallback(
    (member: PartyMember, hp: number) => {
      updatePartyMember({ ...member, hp })
    },
    [updatePartyMember],
  )

  const refreshQuestion = useCallback(() => {
    setQuestion(makeQuestion())
    setAnswer('')
    setSecondsLeft(BADGE_SECONDS)
  }, [makeQuestion])

  useEffect(() => {
    if (!selection) {
      setScreen('badges')
    }
  }, [selection, setScreen])

  useEffect(() => {
    if (available.length === 0 && phase === 'pick') {
      setPhase('defeat')
    }
  }, [available.length, phase])

  useEffect(() => {
    if (phase !== 'fight' || busy) {
      clearTimer()
      return
    }
    clearTimer()
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return 0
        return s - 1
      })
    }, 1000)
    return clearTimer
  }, [phase, busy, question, clearTimer])

  const finishRun = useCallback(
    (finalCorrect: number, opts?: { aborted?: boolean; total?: number }) => {
      clearTimer()
      if (partner) persistPartnerHp(partner, partnerHp)
      if (!badgeId) {
        setBadgeSaved(false)
        setPhase(opts?.aborted ? 'defeat' : 'lost')
        return
      }
      const total = opts?.total ?? BADGE_QUESTION_COUNT
      const aborted = opts?.aborted === true
      const passed = !aborted && finalCorrect >= BADGE_PASS_SCORE
      recordBadgeAttempt({
        id: badgeId,
        score: finalCorrect,
        total,
        aborted,
      })
      setBadgeSaved(passed)
      if (aborted) setPhase('defeat')
      else setPhase(passed ? 'won' : 'lost')
    },
    [
      badgeId,
      clearTimer,
      recordBadgeAttempt,
      partner,
      partnerHp,
      persistPartnerHp,
    ],
  )

  const resolveAttempt = useCallback(
    (correct: boolean, timedOut: boolean) => {
      if (phase !== 'fight' || resolvingRef.current || !partner || !selection) {
        return
      }
      resolvingRef.current = true
      setBusy(true)
      clearTimer()

      const sumMaxOpt =
        selection.mode === 'sums' ? { sumMax: selection.sumMax } : undefined

      const nextAttempted = attempted + 1
      setAttempted(nextAttempted)

      if (correct) {
        recordAnswer(question, true, partner.instanceId, sumMaxOpt)
        const nextCorrect = correctCount + 1
        setCorrectCount(nextCorrect)
        setPartnerAnim('attack')
        setBossAnim('hit')
        const nextBossHp = Math.max(0, bossHp - 1)
        setBossHp(nextBossHp)
        setFeedback('Raak! −1 HP')

        window.setTimeout(() => {
          setPartnerAnim('idle')
          setBossAnim('idle')
          setFeedback(null)

          let nextBossIndex = bossIndex
          let hpAfter = nextBossHp
          if (nextBossHp <= 0 && bossIndex < bossIds.length - 1) {
            nextBossIndex = bossIndex + 1
            setBossIndex(nextBossIndex)
            hpAfter = BADGE_BOSS_HP
            setBossHp(BADGE_BOSS_HP)
          }

          resolvingRef.current = false

          if (nextAttempted >= BADGE_QUESTION_COUNT) {
            finishRun(nextCorrect)
            return
          }

          // Alle bosses weg maar nog sommen over: blijf op laatste boss met 0 HP
          if (hpAfter <= 0 && nextBossIndex >= bossIds.length - 1) {
            setBossHp(0)
          }

          setBusy(false)
          refreshQuestion()
        }, 550)
      } else {
        recordAnswer(question, false, undefined, sumMaxOpt)
        setBossAnim('attack')
        setPartnerAnim('hit')
        const nextHp = Math.max(0, partnerHp - BADGE_PARTNER_DAMAGE)
        setPartnerHp(nextHp)
        persistPartnerHp(partner, nextHp)
        setFeedback(
          timedOut
            ? `Tijd op! Het was ${question.answer} (−${BADGE_PARTNER_DAMAGE} HP)`
            : `Fout… het was ${question.answer} (−${BADGE_PARTNER_DAMAGE} HP)`,
        )

        window.setTimeout(() => {
          setPartnerAnim('idle')
          setBossAnim('idle')
          setFeedback(null)
          resolvingRef.current = false

          if (nextHp <= 0) {
            const othersUp = progress.party.some(
              (m) => m.instanceId !== partner.instanceId && m.hp > 0,
            )
            if (othersUp) {
              setFaintedName(getPokemon(partner.pokemonId).name)
              setPickReason('faint')
              setPhase('pick')
              setBusy(false)
              return
            }
            finishRun(correctCount, {
              aborted: true,
              total: nextAttempted,
            })
            setBusy(false)
            return
          }

          if (nextAttempted >= BADGE_QUESTION_COUNT) {
            finishRun(correctCount)
            return
          }

          setBusy(false)
          refreshQuestion()
        }, 900)
      }
    },
    [
      phase,
      partner,
      selection,
      attempted,
      clearTimer,
      question,
      correctCount,
      bossHp,
      bossIndex,
      bossIds.length,
      recordAnswer,
      persistPartnerHp,
      partnerHp,
      progress.party,
      finishRun,
      refreshQuestion,
    ],
  )

  useEffect(() => {
    if (phase === 'fight' && !busy && secondsLeft <= 0) {
      resolveAttempt(false, true)
    }
  }, [secondsLeft, phase, busy, resolveAttempt])

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
    resolvingRef.current = false
    setBusy(false)
    refreshQuestion()
  }

  const submit = () => {
    if (phase !== 'fight' || busy || answer === '' || !partner) return
    const num = Number(answer)
    resolveAttempt(num === question.answer, false)
  }

  const retry = () => {
    if (!selection) {
      setScreen('badges')
      return
    }
    startBadgeChallenge(selection)
  }

  if (!selection || !badgeId) return null

  const visual = badgeVisual(badgeId)
  const currentBossId = bossIds[bossIndex] ?? bossIds[0]!
  const bossSpecies = getPokemon(currentBossId)
  const partnerSpecies = partner ? getPokemon(partner.pokemonId) : null
  const timerPct = (secondsLeft / BADGE_SECONDS) * 100

  if (phase === 'defeat') {
    return (
      <div className="screen badge-battle badge-battle--end">
        <h1>Team uitgeput</h1>
        <p className="lede">
          Score: {correctCount}/{BADGE_QUESTION_COUNT}. Ga herstellen en probeer
          opnieuw!
        </p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setScreen('heal')}
        >
          Herstellen
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setScreen('badges')}
        >
          Badges
        </button>
      </div>
    )
  }

  if (phase === 'won' || phase === 'lost') {
    const passed = phase === 'won'
    return (
      <div className="screen badge-battle badge-battle--end">
        <h1>{passed ? 'Badge verdiend!' : 'Net niet…'}</h1>
        <p className="lede">
          {passed
            ? `Super! ${correctCount} van de ${BADGE_QUESTION_COUNT} goed.`
            : `${correctCount} van de ${BADGE_QUESTION_COUNT} goed — je hebt er ${BADGE_PASS_SCORE} nodig.`}
        </p>
        <BadgeIcon id={badgeId} size="lg" earned={passed && badgeSaved} locked={!passed} />
        <strong>{visual.label}</strong>
        <button type="button" className="btn btn--primary" onClick={retry}>
          Opnieuw
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setScreen('badges')}
        >
          Naar badges
        </button>
      </div>
    )
  }

  if (phase === 'pick') {
    if (available.length === 0) return null
    const preferred = getActivePartner(progress)
    const sorted = [...available].sort((a, b) => {
      if (preferred && a.instanceId === preferred.instanceId) return -1
      if (preferred && b.instanceId === preferred.instanceId) return 1
      return 0
    })
    const pickHint =
      pickReason === 'faint'
        ? `${faintedName ?? 'Je Pokémon'} is uitgeput! Kies een volgende.`
        : `Badge-uitdaging: ${visual.label}. Kies wie je inzet!`

    return (
      <div className="screen badge-battle badge-battle--pick">
        <header className="badge-battle__pick-head">
          <p className="lede">Badge-uitdaging</p>
          <h1>{visual.label}</h1>
          <BadgeIcon id={badgeId} size="md" earned={false} />
          <div className="badge-battle__boss-row">
            {bossIds.map((id, i) => (
              <PokemonSprite
                key={`${id}-${i}`}
                id={id}
                name={getPokemon(id).name}
                size={72}
                anim="none"
              />
            ))}
          </div>
          <p className="lede">{pickHint}</p>
        </header>
        <ul className="badge-battle__pick-list">
          {sorted.map((m) => {
            const c = getPokemon(m.pokemonId)
            return (
              <li key={m.instanceId}>
                <button
                  type="button"
                  className="badge-battle__pick-item"
                  onClick={() => choosePartner(m)}
                >
                  <PokemonSprite id={c.id} name={c.name} size={64} anim="none" />
                  <div className="badge-battle__pick-info">
                    <strong>{c.name}</strong>
                    <TypeBadges types={c.types} size="sm" />
                    <HpBar hp={m.hp} maxHp={m.maxHp} />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
        {pickReason !== 'faint' && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setScreen('badges')}
          >
            Annuleren
          </button>
        )}
      </div>
    )
  }

  if (!partner || !partnerSpecies) return null

  return (
    <div className="screen badge-battle">
      <div className="badge-battle__top">
        <div className="badge-battle__score">
          <span>
            {correctCount}/{BADGE_QUESTION_COUNT} goed
          </span>
          <span>
            Som {Math.min(attempted + 1, BADGE_QUESTION_COUNT)}/
            {BADGE_QUESTION_COUNT}
          </span>
          <span>
            Boss {bossIndex + 1}/{bossIds.length}
          </span>
        </div>
        <div
          className={`badge-battle__timer${
            secondsLeft <= 3 ? ' badge-battle__timer--urgent' : ''
          }`}
          role="timer"
          aria-label={`${secondsLeft} seconden`}
        >
          <div
            className="badge-battle__timer-fill"
            style={{ width: `${timerPct}%` }}
          />
          <span className="badge-battle__timer-label">{secondsLeft}s</span>
        </div>
      </div>

      <div className="badge-battle__arena">
        <div className="badge-battle__wild">
          <HpBar
            hp={bossHp}
            maxHp={BADGE_BOSS_HP}
            label={bossSpecies.name}
          />
          <TypeBadges types={bossSpecies.types} size="sm" />
          <PokemonSprite
            id={currentBossId}
            name={bossSpecies.name}
            size={140}
            anim={bossAnim}
          />
        </div>
        <div className="badge-battle__partner">
          <PokemonSprite
            id={partnerSpecies.id}
            name={partnerSpecies.name}
            size={110}
            anim={partnerAnim}
            className="badge-battle__partner-sprite"
          />
          <div className="badge-battle__partner-meta">
            <TypeBadges types={partnerSpecies.types} size="sm" />
            <HpBar
              hp={partnerHp}
              maxHp={partner.maxHp}
              label={partnerSpecies.name}
            />
          </div>
        </div>
      </div>

      <div className="badge-battle__question" aria-live="polite">
        <span className="badge-battle__prompt">{question.display} = ?</span>
        {feedback && <p className="badge-battle__feedback">{feedback}</p>}
      </div>
      <Keypad
        value={answer}
        onChange={setAnswer}
        onSubmit={submit}
        disabled={busy}
      />
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={busy}
        onClick={() => {
          persistPartnerHp(partner, partnerHp)
          setScreen('badges')
        }}
      >
        Stoppen
      </button>
    </div>
  )
}
