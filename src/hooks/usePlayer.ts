import { createContext, useContext } from "react"

/** Slug of the tracked player whose views are being shown. */
export const PlayerContext = createContext<string | undefined>(undefined)

export const usePlayerSlug = () => useContext(PlayerContext)
