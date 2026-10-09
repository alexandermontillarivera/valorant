interface Budget {
	remaining: number
	resetAt: number
}

const g = globalThis as typeof globalThis & { __vsBudget?: Budget }
const budget: Budget = (g.__vsBudget ??= { remaining: 30, resetAt: 0 })

export function canSpend(cost: number, reserve: number) {
	if (Date.now() >= budget.resetAt) return true
	return budget.remaining - cost >= reserve
}

export const retryInSec = () =>
	Math.max(0, Math.ceil((budget.resetAt - Date.now()) / 1000))
export const isLimited = () =>
	Date.now() < budget.resetAt && budget.remaining <= 2

export function recordLimits(res: Response) {
	const remaining = Number(res.headers.get("x-ratelimit-remaining"))
	const reset = Number(
		res.headers.get("x-ratelimit-reset") ?? res.headers.get("retry-after"),
	)
	if (res.status === 429) {
		budget.remaining = 0
		budget.resetAt =
			Date.now() + (Number.isFinite(reset) && reset > 0 ? reset : 60) * 1000
		return
	}
	if (Number.isFinite(remaining)) budget.remaining = remaining
	if (Number.isFinite(reset) && reset > 0)
		budget.resetAt = Date.now() + reset * 1000
}
