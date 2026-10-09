export interface JsonSchema {
	type?: string | string[]
	description?: string
	properties?: Record<string, JsonSchema>
	items?: JsonSchema
	additionalProperties?: JsonSchema | boolean
	enum?: (string | number)[]
	$ref?: string
	example?: unknown
}

export interface ApiParameter {
	name: string
	in: "query" | "path"
	required?: boolean
	description: string
	schema: JsonSchema & { default?: unknown; minimum?: number; maximum?: number }
}

export interface ApiOperation {
	operationId: string
	summary: string
	description: string
	tags: string[]
	parameters?: ApiParameter[]
	responses: Record<
		string,
		{
			description: string
			content?: { "application/json": { schema: JsonSchema } }
		}
	>
}

export interface OpenApiSpec {
	openapi: string
	info: { title: string; version: string; description: string }
	servers: { url: string }[]
	tags: { name: string; description: string }[]
	paths: Record<string, { get: ApiOperation }>
	components: { schemas: Record<string, JsonSchema> }
}
