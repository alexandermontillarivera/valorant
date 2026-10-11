import clsx from "clsx"
import type { Result } from "@/interfaces/game"

/** Last results as dots, most recent first. */
export function Form({ results }: { results: Result[] }) {
	return (
		<div className="flex items-center gap-1" aria-label="Forma reciente">
			{results.map((r, i) => (
				<span
					key={i}
					title={r === "W" ? "Victoria" : r === "L" ? "Derrota" : "Empate"}
					className={clsx(
						"h-1.5 w-1.5 rounded-full",
						r === "W" ? "bg-win" : r === "L" ? "bg-loss" : "bg-draw",
						i > 0 && "opacity-70",
					)}
				/>
			))}
		</div>
	)
}
