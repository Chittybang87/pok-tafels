import { spriteUrl } from '../lib/pokemon'
import './PokemonSprite.css'

interface Props {
  id: number
  name?: string
  size?: number
  silhouette?: boolean
  anim?: 'idle' | 'attack' | 'hit' | 'none'
  className?: string
}

export function PokemonSprite({
  id,
  name,
  size = 128,
  silhouette = false,
  anim = 'idle',
  className = '',
}: Props) {
  return (
    <img
      src={spriteUrl(id)}
      alt={silhouette ? 'Onbekend' : (name ?? '')}
      width={size}
      height={size}
      className={`poke-sprite poke-sprite--${anim} ${silhouette ? 'poke-sprite--sil' : ''} ${className}`}
      draggable={false}
      style={{ width: size, height: size }}
    />
  )
}
