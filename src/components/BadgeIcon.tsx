import type { CSSProperties } from 'react'
import type { BadgeId } from '../lib/types'
import { badgeVisual } from '../lib/badges'
import './BadgeIcon.css'

interface Props {
  id: BadgeId
  size?: 'sm' | 'md' | 'lg'
  earned?: boolean
  locked?: boolean
}

export function BadgeIcon({
  id,
  size = 'md',
  earned = false,
  locked = false,
}: Props) {
  const visual = badgeVisual(id)
  const state = locked ? 'locked' : earned ? 'earned' : 'progress'

  return (
    <span
      className={`badge-icon badge-icon--${size} badge-icon--${visual.kind} badge-icon--${state}`}
      style={{ '--badge-hue': String(visual.hue) } as CSSProperties}
      aria-hidden
    >
      <span className="badge-icon__shield">
        <span className="badge-icon__mark">{visual.shortLabel}</span>
      </span>
    </span>
  )
}
