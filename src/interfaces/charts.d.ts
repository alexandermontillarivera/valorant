import type { ReactNode } from "react"

export interface LinePoint {
	y: number
	tooltip: ReactNode
}

export interface BarDatum {
	value: number
	color: string
	tooltip: ReactNode
	onClick?: () => void
}
