import './HpBar.css'

interface Props {
  hp: number
  maxHp: number
  label?: string
  healFlash?: boolean
}

export function HpBar({ hp, maxHp, label, healFlash }: Props) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0
  const tone = pct > 50 ? 'ok' : pct > 25 ? 'mid' : 'low'

  return (
    <div className={`hpbar ${healFlash ? 'hpbar--heal' : ''}`}>
      {label && <div className="hpbar__label">{label}</div>}
      <div className="hpbar__track">
        <div
          className={`hpbar__fill hpbar__fill--${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="hpbar__nums">
        {hp}/{maxHp}
      </div>
    </div>
  )
}
