import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { warmSpriteCache } from '../lib/pokemon'
import { applyAnswer, defaultPracticeStats } from '../lib/stats'
import {
  createPartyMember,
  createProfile as createProfileInStore,
  defaultProgress,
  deleteProfile as deleteProfileInStore,
  loadProfiles,
  loadSettings,
  renameProfile as renameProfileInStore,
  resetProfileProgress,
  saveProfiles,
  saveSettings,
  updateProfileProgress,
} from '../lib/storage'
import type {
  Generation,
  MathMode,
  MathQuestion,
  PartyMember,
  Profile,
  ProfilesState,
  Progress,
  Screen,
  Settings,
  SumMax,
} from '../lib/types'
import { MAX_PARTY_SIZE } from '../lib/types'

interface GameContextValue {
  screen: Screen
  setScreen: (s: Screen) => void
  battleKey: number
  startBattle: () => void
  settings: Settings
  profiles: Profile[]
  activeProfileId: string | null
  activeProfile: Profile | null
  progress: Progress
  selectProfile: (id: string) => void
  switchPlayer: () => void
  createProfile: (name: string) => boolean
  deleteProfile: (id: string) => void
  renameProfile: (id: string, name: string) => boolean
  toggleTable: (table: number) => void
  toggleGeneration: (generation: Generation) => void
  setMathMode: (mode: MathMode) => void
  setIncludeMultiply: (on: boolean) => void
  setIncludeDivision: (on: boolean) => void
  setSumMax: (max: SumMax) => void
  chooseStarter: (pokemonId: number) => void
  setActivePartner: (instanceId: string) => void
  updatePartyMember: (member: PartyMember) => void
  healMember: (instanceId: string, amount: number) => void
  /** @returns of de Pokémon in het team (max 6) is gezet */
  catchPokemon: (pokemonId: number) => boolean
  markSeen: (pokemonId: number) => void
  /** Registreert een antwoord voor progress + statistieken */
  recordAnswer: (
    question: MathQuestion,
    correct: boolean,
    partyInstanceId?: string,
  ) => void
  /** Evolueer een partij-Pokémon naar intoId */
  evolveMember: (instanceId: string, intoId: number) => void
  /** Vervang een teamlid door een andere reeds gevangen soort */
  replacePartyMember: (instanceId: string, pokemonId: number) => boolean
  clearPracticeStats: () => void
  /** Reset alleen het actieve profiel */
  resetGame: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('profiles')
  const [battleKey, setBattleKey] = useState(0)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [profilesState, setProfilesState] = useState<ProfilesState>(() =>
    loadProfiles(),
  )
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)

  const profiles = profilesState.profiles
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? null
  const progress = activeProfile?.progress ?? defaultProgress()

  useEffect(() => {
    void warmSpriteCache(settings.activeGenerations)
  }, [settings.activeGenerations])

  const persistProfiles = useCallback((next: ProfilesState) => {
    setProfilesState(next)
    saveProfiles(next)
  }, [])

  const persistProgress = useCallback(
    (next: Progress | ((prev: Progress) => Progress)) => {
      setProfilesState((prev) => {
        const id = activeProfileId
        if (!id) return prev
        const current = prev.profiles.find((p) => p.id === id)
        if (!current) return prev
        const resolved =
          typeof next === 'function' ? next(current.progress) : next
        const updated = updateProfileProgress(prev, id, resolved)
        saveProfiles(updated)
        return updated
      })
    },
    [activeProfileId],
  )

  const persistSettings = useCallback((next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const selectProfile = useCallback(
    (id: string) => {
      const profile = profilesState.profiles.find((p) => p.id === id)
      if (!profile) return
      setActiveProfileId(id)
      setScreen(profile.progress.starterChosen ? 'home' : 'starter')
    },
    [profilesState.profiles],
  )

  const switchPlayer = useCallback(() => {
    setActiveProfileId(null)
    setScreen('profiles')
  }, [])

  const createProfile = useCallback(
    (name: string) => {
      const result = createProfileInStore(profilesState, name)
      if (!result) return false
      persistProfiles(result.state)
      return true
    },
    [profilesState, persistProfiles],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      const next = deleteProfileInStore(profilesState, id)
      persistProfiles(next)
      if (activeProfileId === id) {
        setActiveProfileId(null)
        setScreen('profiles')
      }
    },
    [profilesState, persistProfiles, activeProfileId],
  )

  const renameProfile = useCallback(
    (id: string, name: string) => {
      const next = renameProfileInStore(profilesState, id, name)
      if (!next) return false
      persistProfiles(next)
      return true
    },
    [profilesState, persistProfiles],
  )

  const startBattle = useCallback(() => {
    setBattleKey((k) => k + 1)
    setScreen('battle')
  }, [])

  const toggleTable = useCallback(
    (table: number) => {
      const has = settings.activeTables.includes(table)
      let activeTables: number[]
      if (has) {
        if (settings.activeTables.length <= 1) return
        activeTables = settings.activeTables.filter((t) => t !== table)
      } else {
        activeTables = [...settings.activeTables, table].sort((a, b) => a - b)
      }
      persistSettings({ ...settings, activeTables })
    },
    [settings, persistSettings],
  )

  const setMathMode = useCallback(
    (mathMode: MathMode) => {
      persistSettings({ ...settings, mathMode })
    },
    [settings, persistSettings],
  )

  const setIncludeMultiply = useCallback(
    (includeMultiply: boolean) => {
      if (!includeMultiply && !settings.includeDivision) return
      persistSettings({ ...settings, includeMultiply })
    },
    [settings, persistSettings],
  )

  const setIncludeDivision = useCallback(
    (includeDivision: boolean) => {
      if (!includeDivision && !settings.includeMultiply) return
      persistSettings({ ...settings, includeDivision })
    },
    [settings, persistSettings],
  )

  const setSumMax = useCallback(
    (sumMax: SumMax) => {
      persistSettings({ ...settings, sumMax })
    },
    [settings, persistSettings],
  )

  const toggleGeneration = useCallback(
    (generation: Generation) => {
      const has = settings.activeGenerations.includes(generation)
      let activeGenerations: Generation[]
      if (has) {
        if (settings.activeGenerations.length <= 1) return
        activeGenerations = settings.activeGenerations.filter(
          (g) => g !== generation,
        )
      } else {
        activeGenerations = [...settings.activeGenerations, generation].sort(
          (a, b) => a - b,
        )
      }
      persistSettings({ ...settings, activeGenerations })
    },
    [settings, persistSettings],
  )

  const chooseStarter = useCallback(
    (pokemonId: number) => {
      if (!activeProfileId) return
      const member = createPartyMember(pokemonId)
      persistProgress((prev) => ({
        ...prev,
        starterChosen: true,
        party: [member],
        activePartnerInstanceId: member.instanceId,
        caughtIds: [pokemonId],
        seenIds: [pokemonId],
      }))
      setScreen('home')
    },
    [activeProfileId, persistProgress],
  )

  const setActivePartner = useCallback(
    (instanceId: string) => {
      persistProgress((prev) => {
        const member = prev.party.find((p) => p.instanceId === instanceId)
        if (!member || member.hp <= 0) return prev
        return { ...prev, activePartnerInstanceId: instanceId }
      })
    },
    [persistProgress],
  )

  const updatePartyMember = useCallback(
    (member: PartyMember) => {
      // Functionele update: mag niet stale progress gebruiken — bij een fout
      // antwoord roept Battle recordAnswer + persistPartnerHp kort na elkaar aan.
      persistProgress((prev) => ({
        ...prev,
        party: prev.party.map((p) =>
          p.instanceId === member.instanceId ? member : p,
        ),
      }))
    },
    [persistProgress],
  )

  const healMember = useCallback(
    (instanceId: string, amount: number) => {
      persistProgress((prev) => ({
        ...prev,
        party: prev.party.map((p) => {
          if (p.instanceId !== instanceId) return p
          return { ...p, hp: Math.min(p.maxHp, p.hp + amount) }
        }),
      }))
    },
    [persistProgress],
  )

  const catchPokemon = useCallback(
    (pokemonId: number) => {
      const already = progress.caughtIds.includes(pokemonId)
      const partyFull = progress.party.length >= MAX_PARTY_SIZE
      const addedToParty = !already && !partyFull
      persistProgress((prev) => {
        const wasCaught = prev.caughtIds.includes(pokemonId)
        const full = prev.party.length >= MAX_PARTY_SIZE
        const add = !wasCaught && !full
        return {
          ...prev,
          party: add
            ? [...prev.party, createPartyMember(pokemonId)]
            : prev.party,
          caughtIds: wasCaught
            ? prev.caughtIds
            : [...prev.caughtIds, pokemonId],
          seenIds: prev.seenIds.includes(pokemonId)
            ? prev.seenIds
            : [...prev.seenIds, pokemonId],
          battlesWon: prev.battlesWon + 1,
        }
      })
      return addedToParty
    },
    [progress, persistProgress],
  )

  const markSeen = useCallback(
    (pokemonId: number) => {
      persistProgress((prev) => {
        if (prev.seenIds.includes(pokemonId)) return prev
        return {
          ...prev,
          seenIds: [...prev.seenIds, pokemonId],
        }
      })
    },
    [persistProgress],
  )

  const recordAnswer = useCallback(
    (question: MathQuestion, correct: boolean, partyInstanceId?: string) => {
      persistProgress((prev) => ({
        ...prev,
        correctAnswers: correct ? prev.correctAnswers + 1 : prev.correctAnswers,
        practiceStats: applyAnswer(prev.practiceStats, question, correct),
        party:
          correct && partyInstanceId
            ? prev.party.map((p) =>
                p.instanceId === partyInstanceId
                  ? { ...p, correctCount: p.correctCount + 1 }
                  : p,
              )
            : prev.party,
      }))
    },
    [persistProgress],
  )

  const evolveMember = useCallback(
    (instanceId: string, intoId: number) => {
      persistProgress((prev) => {
        const member = prev.party.find((p) => p.instanceId === instanceId)
        if (!member) return prev
        const party = prev.party.map((p) =>
          p.instanceId === instanceId
            ? { ...p, pokemonId: intoId, correctCount: 0 }
            : p,
        )
        const caughtIds = prev.caughtIds.includes(intoId)
          ? prev.caughtIds
          : [...prev.caughtIds, intoId]
        const seenIds = prev.seenIds.includes(intoId)
          ? prev.seenIds
          : [...prev.seenIds, intoId]
        return { ...prev, party, caughtIds, seenIds }
      })
    },
    [persistProgress],
  )

  const replacePartyMember = useCallback(
    (instanceId: string, pokemonId: number) => {
      const partyIds = new Set(progress.party.map((p) => p.pokemonId))
      if (!progress.caughtIds.includes(pokemonId) || partyIds.has(pokemonId)) {
        return false
      }
      if (!progress.party.some((p) => p.instanceId === instanceId)) {
        return false
      }
      persistProgress((prev) => {
        const idx = prev.party.findIndex((p) => p.instanceId === instanceId)
        if (idx < 0) return prev
        if (!prev.caughtIds.includes(pokemonId)) return prev
        if (prev.party.some((p) => p.pokemonId === pokemonId)) return prev
        const next = createPartyMember(pokemonId)
        const party = [...prev.party]
        party[idx] = next
        const wasActive = prev.activePartnerInstanceId === instanceId
        return {
          ...prev,
          party,
          activePartnerInstanceId: wasActive
            ? next.instanceId
            : prev.activePartnerInstanceId,
        }
      })
      return true
    },
    [progress, persistProgress],
  )

  const clearPracticeStats = useCallback(() => {
    persistProgress((prev) => ({
      ...prev,
      practiceStats: defaultPracticeStats(),
    }))
  }, [persistProgress])

  const resetGame = useCallback(() => {
    if (!activeProfileId) return
    const next = resetProfileProgress(profilesState, activeProfileId)
    persistProfiles(next)
    setScreen('starter')
  }, [activeProfileId, profilesState, persistProfiles])

  const value = useMemo(
    () => ({
      screen,
      setScreen,
      battleKey,
      startBattle,
      settings,
      profiles,
      activeProfileId,
      activeProfile,
      progress,
      selectProfile,
      switchPlayer,
      createProfile,
      deleteProfile,
      renameProfile,
      toggleTable,
      toggleGeneration,
      setMathMode,
      setIncludeMultiply,
      setIncludeDivision,
      setSumMax,
      chooseStarter,
      setActivePartner,
      updatePartyMember,
      healMember,
      catchPokemon,
      markSeen,
      recordAnswer,
      evolveMember,
      replacePartyMember,
      clearPracticeStats,
      resetGame,
    }),
    [
      screen,
      battleKey,
      startBattle,
      settings,
      profiles,
      activeProfileId,
      activeProfile,
      progress,
      selectProfile,
      switchPlayer,
      createProfile,
      deleteProfile,
      renameProfile,
      toggleTable,
      toggleGeneration,
      setMathMode,
      setIncludeMultiply,
      setIncludeDivision,
      setSumMax,
      chooseStarter,
      setActivePartner,
      updatePartyMember,
      healMember,
      catchPokemon,
      markSeen,
      recordAnswer,
      evolveMember,
      replacePartyMember,
      clearPracticeStats,
      resetGame,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame buiten GameProvider')
  return ctx
}
