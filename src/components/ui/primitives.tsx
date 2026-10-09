import {
	createContext,
	useCallback,
	useContext,
	useId,
	useState,
	type ReactNode,
} from "react"
import { motion, type Transition } from "motion/react"
import clsx from "clsx"
import { tierName } from "@/lib/format"
import { weaponInfo } from "@/lib/weapons"
import type { Catalog } from "@/interfaces/catalog"

export const spring: Transition = { type: "spring", bounce: 0, duration: 0.45 }
export const springSoft: Transition = {
	type: "spring",
	bounce: 0.15,
	duration: 0.5,
}

const EMPTY: Catalog = { agents: {}, maps: {}, tiers: {}, weapons: {} }
const CatalogCtx = createContext<Catalog>(EMPTY)
export const CatalogProvider = CatalogCtx.Provider
export const useCatalog = () => useContext(CatalogCtx)

export function useTierName() {
	const catalog = useCatalog()
	return useCallback(
		(tier: number) => catalog.tiers[tier]?.name ?? tierName(tier),
		[catalog],
	)
}

export function useWeaponInfo() {
	const catalog = useCatalog()
	return useCallback((key: string) => weaponInfo(catalog, key), [catalog])
}

export function Img({
	src,
	alt = "",
	className,
	fallback = null,
}: {
	src?: string | null
	alt?: string
	className?: string
	fallback?: ReactNode
}) {
	const [state, setState] = useState<"loading" | "ok" | "error">("loading")
	// SSR'd images can finish loading before hydration attaches onLoad — check on mount too.
	const ref = useCallback((img: HTMLImageElement | null) => {
		if (img?.complete) setState(img.naturalWidth ? "ok" : "error")
	}, [])
	if (!src || state === "error") return <>{fallback}</>
	return (
		<img
			ref={ref}
			src={src}
			alt={alt}
			draggable={false}
			decoding="async"
			loading="lazy"
			onLoad={() => setState("ok")}
			onError={() => setState("error")}
			className={clsx(className, "transition-opacity duration-500")}
			style={state === "ok" ? undefined : { opacity: 0 }}
		/>
	)
}

export function AgentIcon({
	name,
	size = 36,
	className,
}: {
	name: string
	size?: number
	className?: string
}) {
	const agent = useCatalog().agents[name.toLowerCase()]
	return (
		<div
			className={clsx(
				"relative shrink-0 overflow-hidden rounded-[30%] bg-white/5",
				className,
			)}
			style={{
				width: size,
				height: size,
				boxShadow: agent ? `inset 0 0 0 1px ${agent.color}33` : undefined,
			}}
			title={name}
		>
			<Img
				src={agent?.icon}
				alt={name}
				className="h-full w-full object-cover"
				fallback={
					<span className="grid h-full w-full place-items-center text-[10px] font-semibold text-fg-3">
						{name.slice(0, 2)}
					</span>
				}
			/>
		</div>
	)
}

export function RankIcon({
	tier,
	size = 32,
	className,
}: {
	tier: number
	size?: number
	className?: string
}) {
	const t = useCatalog().tiers[tier]
	const name = useTierName()(tier)
	return (
		<div
			className={clsx("shrink-0", className)}
			style={{ width: size, height: size }}
			title={name}
		>
			<Img
				src={t?.icon}
				alt={name}
				className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
				fallback={
					<div className="grid h-full w-full place-items-center rounded-full bg-white/5 text-[9px] text-fg-3">
						{tier || "–"}
					</div>
				}
			/>
		</div>
	)
}

export const tierColor = (catalog: Catalog, tier: number) =>
	catalog.tiers[tier]?.color ?? "#a1a1a6"

interface SegmentedProps<T extends string> {
	value: T
	onChange: (v: T) => void
	options: { value: T; label: ReactNode }[]
	size?: "sm" | "md"
	className?: string
}

export function Segmented<T extends string>({
	value,
	onChange,
	options,
	size = "md",
	className,
}: SegmentedProps<T>) {
	const id = useId()
	return (
		<div
			role="tablist"
			className={clsx(
				"relative inline-flex items-center rounded-full bg-white/[0.05] p-1 ring-1 ring-line ring-inset",
				className,
			)}
		>
			{options.map((o) => {
				const active = o.value === value
				return (
					<button
						key={o.value}
						role="tab"
						aria-selected={active}
						onClick={() => onChange(o.value)}
						className={clsx(
							"pressable relative z-0 rounded-full font-medium whitespace-nowrap transition-colors duration-200",
							size === "sm"
								? "px-3 py-1 text-[12px]"
								: "px-4 py-1.5 text-[13px]",
							active ? "text-fg" : "text-fg-3 hover:text-fg-2",
						)}
					>
						{active && (
							<motion.span
								layoutId={`seg-${id}`}
								transition={spring}
								className="absolute inset-0 -z-10 rounded-full bg-white/[0.11] shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
							/>
						)}
						{o.label}
					</button>
				)
			})}
		</div>
	)
}

export function Panel({
	children,
	className,
	title,
	action,
}: {
	children: ReactNode
	className?: string
	title?: ReactNode
	action?: ReactNode
}) {
	return (
		<section className={clsx("panel relative overflow-hidden p-5", className)}>
			{(title || action) && (
				<header className="mb-4 flex items-center justify-between gap-3">
					{title && (
						<h3 className="text-[13px] font-semibold tracking-[-0.01em] text-fg-2">
							{title}
						</h3>
					)}
					{action}
				</header>
			)}
			{children}
		</section>
	)
}

export function Bar({
	value,
	color = "var(--color-fg)",
	className,
	delay = 0,
}: {
	value: number
	color?: string
	className?: string
	delay?: number
}) {
	return (
		<div
			className={clsx(
				"h-1.5 overflow-hidden rounded-full bg-white/[0.06]",
				className,
			)}
		>
			<motion.div
				className="h-full rounded-full"
				style={{ background: color, transformOrigin: "left" }}
				initial={{ scaleX: 0 }}
				animate={{ scaleX: Math.max(0, Math.min(1, value)) }}
				transition={{ ...spring, delay }}
			/>
		</div>
	)
}

export { AnimatedNumber } from "@/components/ui/AnimatedNumber"
