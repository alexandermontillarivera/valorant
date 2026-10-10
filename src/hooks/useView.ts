import { useEffect, useState } from "react"

const cache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

export type ViewParams = Record<string, string | number | string[] | undefined>

export function viewUrl(view: string, params: ViewParams) {
	const qs = new URLSearchParams()
	for (const [k, v] of Object.entries(params)) {
		if (Array.isArray(v)) for (const item of v) qs.append(k, item)
		else if (v !== undefined && v !== "") qs.set(k, String(v))
	}
	const q = qs.toString()
	return `/api/view/${view}${q ? `?${q}` : ""}`
}

export function fetchView<T>(url: string): Promise<T> {
	if (cache.has(url)) return Promise.resolve(cache.get(url) as T)
	let req = inflight.get(url)
	if (!req) {
		req = fetch(url)
			.then(async (res) => {
				const body = await res.json()
				if (!res.ok) throw new Error(body.message ?? "Error al cargar")
				cache.set(url, body)
				return body
			})
			.finally(() => inflight.delete(url))
		inflight.set(url, req)
	}
	return req as Promise<T>
}

/** Fetches a precomputed view; repeated or revisited requests are served from memory. */
export function useView<T>(view: string, params: ViewParams, enabled = true) {
	const url = viewUrl(view, params)
	const [state, setState] = useState<{
		url: string
		data?: T
		error?: string
	}>(() => ({ url, data: cache.get(url) as T | undefined }))

	useEffect(() => {
		if (!enabled) return
		if (cache.has(url)) {
			setState({ url, data: cache.get(url) as T })
			return
		}
		let alive = true
		setState({ url })
		fetchView<T>(url)
			.then((data) => alive && setState({ url, data }))
			.catch((e: Error) => alive && setState({ url, error: e.message }))
		return () => {
			alive = false
		}
	}, [url, enabled])

	const current = state.url === url
	return {
		data: current ? state.data : (cache.get(url) as T | undefined),
		error: current ? state.error : undefined,
	}
}
