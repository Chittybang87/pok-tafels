import { useEffect, useState } from 'react'
import './CatchAnimation.css'

type Phase = 'throw' | 'wiggle' | 'success' | 'fail'

interface Props {
  playing: boolean
  success: boolean | null
  onDone: () => void
}

export function CatchAnimation({ playing, success, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('throw')

  useEffect(() => {
    if (!playing || success === null) return

    setPhase('throw')
    const t1 = window.setTimeout(() => setPhase('wiggle'), 600)
    const t2 = window.setTimeout(
      () => setPhase(success ? 'success' : 'fail'),
      600 + 1100,
    )
    const t3 = window.setTimeout(onDone, 600 + 1100 + 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [playing, success, onDone])

  if (!playing) return null

  return (
    <div className={`catch catch--${phase}`} aria-hidden>
      <div className="catch__ball" />
      {phase === 'success' && <div className="catch__stars">★ ★ ★</div>}
      {phase === 'fail' && <div className="catch__msg">Oh nee!</div>}
      {phase === 'success' && <div className="catch__msg">Gevangen!</div>}
    </div>
  )
}
