import { GameProvider, useGame } from './context/GameContext'
import { Battle } from './screens/Battle'
import { Heal } from './screens/Heal'
import { Home } from './screens/Home'
import { Party } from './screens/Party'
import { Pokedex } from './screens/Pokedex'
import { Settings } from './screens/Settings'
import { Starter } from './screens/Starter'

function Router() {
  const { screen, battleKey } = useGame()

  switch (screen) {
    case 'starter':
      return <Starter />
    case 'settings':
      return <Settings />
    case 'party':
      return <Party />
    case 'pokedex':
      return <Pokedex />
    case 'heal':
      return <Heal />
    case 'battle':
      return <Battle key={battleKey} />
    case 'home':
    default:
      return <Home />
  }
}

export default function App() {
  return (
    <GameProvider>
      <div className="app-shell">
        <Router />
      </div>
    </GameProvider>
  )
}
