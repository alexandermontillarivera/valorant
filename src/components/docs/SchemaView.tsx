import { useState } from "react"
import clsx from "clsx"
import { ChevronRight } from "lucide-react"
import type { JsonSchema } from "@/interfaces/openapi"

type Schemas = Record<string, JsonSchema>

const refName = (ref: string) => ref.split("/").pop() ?? ref

function resolve(schema: JsonSchema, schemas: Schemas): JsonSchema {
	if (!schema.$ref) return schema
	const target = schemas[refName(schema.$ref)] ?? {}
	return { ...target, description: schema.description ?? target.description }
}

function typeLabel(schema: JsonSchema): string {
	if (schema.$ref) return refName(schema.$ref)
	if (schema.type === "array" && schema.items)
		return `${typeLabel(schema.items)}[]`
	if (Array.isArray(schema.type)) return schema.type.join(" | ")
	if (schema.type === "object" && schema.additionalProperties) return "map"
	return schema.type ?? "any"
}

function children(schema: JsonSchema, schemas: Schemas) {
	const s = resolve(schema, schemas)
	if (s.properties) return s.properties
	if (s.type === "array" && s.items) {
		const item = resolve(s.items, schemas)
		if (item.properties) return item.properties
	}
	if (s.additionalProperties && typeof s.additionalProperties === "object") {
		const value = resolve(s.additionalProperties, schemas)
		if (value.properties) return value.properties
	}
	return null
}

function Field({
	name,
	schema,
	schemas,
	depth,
}: {
	name: string
	schema: JsonSchema
	schemas: Schemas
	depth: number
}) {
	const resolved = resolve(schema, schemas)
	const nested = depth < 4 ? children(schema, schemas) : null
	const [open, setOpen] = useState(depth === 0 && name === "data")
	return (
		<li className="border-t border-line first:border-t-0">
			<div
				className={clsx(
					"flex items-start gap-3 py-2.5",
					nested && "cursor-pointer",
				)}
				style={{ paddingLeft: depth * 16 }}
				onClick={() => nested && setOpen((o) => !o)}
			>
				<span className="mt-0.5 w-3 shrink-0">
					{nested && (
						<ChevronRight
							size={12}
							className={clsx(
								"text-fg-3 transition-transform duration-200",
								open && "rotate-90",
							)}
						/>
					)}
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-baseline gap-x-2">
						<code className="font-mono text-[12.5px] font-medium text-fg">
							{name}
						</code>
						<span className="font-mono text-[11px] text-info">
							{typeLabel(schema)}
						</span>
						{resolved.enum && (
							<span className="flex flex-wrap gap-1">
								{resolved.enum.map((v) => (
									<code
										key={String(v)}
										className="rounded bg-white/[0.06] px-1 font-mono text-[10.5px] text-fg-2"
									>
										{String(v)}
									</code>
								))}
							</span>
						)}
					</div>
					{resolved.description && (
						<p className="mt-0.5 text-[12.5px] text-fg-3">
							{resolved.description}
						</p>
					)}
				</div>
			</div>
			{open && nested && (
				<ul>
					{Object.entries(nested).map(([k, v]) => (
						<Field
							key={k}
							name={k}
							schema={v}
							schemas={schemas}
							depth={depth + 1}
						/>
					))}
				</ul>
			)}
		</li>
	)
}

export function SchemaView({
	schema,
	schemas,
}: {
	schema: JsonSchema
	schemas: Schemas
}) {
	const props = children(schema, schemas)
	if (!props) return null
	return (
		<ul className="rounded-2xl bg-white/[0.02] px-4 ring-1 ring-line">
			{Object.entries(props).map(([k, v]) => (
				<Field key={k} name={k} schema={v} schemas={schemas} depth={0} />
			))}
		</ul>
	)
}
