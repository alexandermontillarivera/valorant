import { useState } from "react"
import clsx from "clsx"
import { ChevronRight } from "lucide-react"

const PREVIEW_ITEMS = 25

function Value({ value }: { value: unknown }) {
	if (value === null) return <span className="text-fg-4">null</span>
	if (typeof value === "string")
		return <span className="text-win break-all">"{value}"</span>
	if (typeof value === "number")
		return <span className="text-info">{value}</span>
	if (typeof value === "boolean")
		return <span className="text-gold">{String(value)}</span>
	return null
}

function Node({
	name,
	value,
	depth,
	last,
}: {
	name?: string
	value: unknown
	depth: number
	last: boolean
}) {
	const isArray = Array.isArray(value)
	const isObject = value !== null && typeof value === "object"
	const [open, setOpen] = useState(depth < 2)
	const [shown, setShown] = useState(PREVIEW_ITEMS)
	const comma = last ? "" : ","
	const label = name !== undefined && (
		<span className="text-fg-2">"{name}"</span>
	)

	if (!isObject)
		return (
			<div className="pl-4">
				{label}
				{label && <span className="text-fg-4">: </span>}
				<Value value={value} />
				<span className="text-fg-4">{comma}</span>
			</div>
		)

	const entries = isArray
		? (value as unknown[]).map((v, i) => [String(i), v] as const)
		: Object.entries(value as Record<string, unknown>)
	const [openBr, closeBr] = isArray ? ["[", "]"] : ["{", "}"]
	const visible = entries.slice(0, shown)

	return (
		<div className={clsx(depth > 0 && "pl-4")}>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="group -ml-4 inline-flex items-center text-left"
			>
				<ChevronRight
					size={12}
					className={clsx(
						"mr-1 text-fg-4 transition-transform duration-200 group-hover:text-fg-2",
						open && "rotate-90",
					)}
				/>
				{label}
				{label && <span className="text-fg-4">: </span>}
				<span className="text-fg-3">{openBr}</span>
				{!open && (
					<span className="text-fg-4">
						{" "}
						{entries.length} {isArray ? "elementos" : "campos"} {closeBr}
						{comma}
					</span>
				)}
			</button>
			{open && (
				<>
					{visible.map(([k, v], i) => (
						<Node
							key={k}
							name={isArray ? undefined : k}
							value={v}
							depth={depth + 1}
							last={i === entries.length - 1}
						/>
					))}
					{entries.length > shown && (
						<button
							type="button"
							onClick={() => setShown((n) => n + PREVIEW_ITEMS * 4)}
							className="pl-4 text-fg-3 hover:text-fg"
						>
							… ver {Math.min(PREVIEW_ITEMS * 4, entries.length - shown)} más de{" "}
							{entries.length - shown}
						</button>
					)}
					<div>
						<span className="text-fg-3">{closeBr}</span>
						<span className="text-fg-4">{comma}</span>
					</div>
				</>
			)}
		</div>
	)
}

export function JsonView({ value }: { value: unknown }) {
	return (
		<div className="pl-4 font-mono text-[12px] leading-[1.7]">
			<Node value={value} depth={0} last />
		</div>
	)
}
