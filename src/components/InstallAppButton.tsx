import { useEffect, useState } from 'react'
import './InstallAppButton.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [installed, setInstalled] = useState(false)
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
      return
    }
    setShowTip((v) => !v)
  }

  const ios = isIos()

  return (
    <div className="install-app">
      <button type="button" className="btn btn--install" onClick={handleInstall}>
        App installeren
      </button>
      {showTip ? (
        <p className="install-app__tip" role="status">
          {ios ? (
            <>
              Tik op Delen (□↑) en kies <strong>Zet op beginscherm</strong>.
            </>
          ) : deferred ? null : (
            <>
              Open het menu van je browser en kies{' '}
              <strong>App installeren</strong> of{' '}
              <strong>Toevoegen aan startscherm</strong>.
            </>
          )}
        </p>
      ) : null}
    </div>
  )
}
