import { typeColor, typeLabel } from '../lib/typeChart'
import './TypeBadges.css'

export function TypeBadges({
  types,
  size = 'md',
}: {
  types: readonly string[]
  size?: 'sm' | 'md'
}) {
  return (
    <span className={`type-badges type-badges--${size}`}>
      {types.map((t) => (
        <span
          key={t}
          className="type-badge"
          style={{ backgroundColor: typeColor(t) }}
        >
          {typeLabel(t)}
        </span>
      ))}
    </span>
  )
}
