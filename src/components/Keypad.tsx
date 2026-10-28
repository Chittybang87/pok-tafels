import { useEffect } from 'react'
import './Keypad.css'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  maxLength?: number
}

export function Keypad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  maxLength = 4,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return
      if (e.key >= '0' && e.key <= '9') {
        if (value.length >= maxLength) return
        onChange(value + e.key)
      } else if (e.key === 'Backspace') {
        onChange(value.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onChange, onSubmit, disabled, maxLength])

  const press = (digit: string) => {
    if (disabled || value.length >= maxLength) return
    onChange(value + digit)
  }

  return (
    <div className="keypad">
      <div className="keypad__display" aria-live="polite">
        {value || '—'}
      </div>
      <div className="keypad__grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            className="keypad__btn"
            disabled={disabled}
            onClick={() => press(d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="keypad__btn keypad__btn--muted"
          disabled={disabled || value.length === 0}
          onClick={() => onChange(value.slice(0, -1))}
        >
          Wis
        </button>
        <button
          type="button"
          className="keypad__btn"
          disabled={disabled}
          onClick={() => press('0')}
        >
          0
        </button>
        <button
          type="button"
          className="keypad__btn keypad__btn--ok"
          disabled={disabled || value.length === 0}
          onClick={onSubmit}
        >
          OK
        </button>
      </div>
    </div>
  )
}
