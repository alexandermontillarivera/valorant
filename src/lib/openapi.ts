import type {
	ApiParameter,
	JsonSchema,
	OpenApiSpec,
} from "@/interfaces/openapi"
import { PLAYERS } from "@/lib/players"

const ref = (name: string): JsonSchema => ({
	$ref: `#/components/schemas/${name}`,
})
const num = (description: string): JsonSchema => ({
	type: "number",
	description,
})
const int = (description: string): JsonSchema => ({
	type: "integer",
	description,
})
const str = (description: string): JsonSchema => ({
	type: "string",
	description,
})
const nullable = (type: string, description: string): JsonSchema => ({
	type: [type, "null"],
	description,
})
const obj = (
	description: string,
	properties: Record<string, JsonSchema>,
): JsonSchema => ({
	type: "object",
	description,
	properties,
})
const list = (description: string, items: JsonSchema): JsonSchema => ({
	type: "array",
	description,
	items,
})
const envelope = (data: JsonSchema, meta?: JsonSchema): JsonSchema =>
	obj("Respuesta", meta ? { data, meta } : { data })

const PLAYER: ApiParameter = {
	name: "player",
	in: "query",
	description:
		"Slug del jugador (de `/players`). Si se omite se usa el primero configurado.",
	schema: {
		type: "string",
		default: PLAYERS[0]?.slug,
		enum: PLAYERS.map((p) => p.slug),
	},
}
const MODE: ApiParameter = {
	name: "mode",
	in: "query",
	description:
		"Modo de juego. `all` incluye todos. Los valores disponibles dependen de las partidas jugadas.",
	schema: {
		type: "string",
		default: "competitive",
		enum: [
			"competitive",
			"unrated",
			"swiftplay",
			"premier",
			"deathmatch",
			"teamdeathmatch",
			"all",
		],
	},
}
const PERIOD: ApiParameter = {
	name: "period",
	in: "query",
	description:
		"Periodo: todo el historial, el acto más reciente o las últimas N partidas.",
	schema: { type: "string", default: "all", enum: ["all", "act", "50", "20"] },
}
const FILTERS = [PLAYER, MODE, PERIOD]
const filtersMeta = obj("Filtros aplicados", {
	player: str("Slug del jugador"),
	mode: str("Modo de juego aplicado"),
	period: str("Periodo aplicado"),
})

const ERROR: JsonSchema = obj("Error", {
	error: obj("Detalle del error", {
		status: int("Código HTTP"),
		message: str("Mensaje legible"),
	}),
})

const ok = (description: string, schema: JsonSchema) => ({
	"200": { description, content: { "application/json": { schema } } },
	"503": {
		description: "Todavía no hay datos sincronizados",
		content: { "application/json": { schema: ref("Error") } },
	},
})

const schemas: Record<string, JsonSchema> = {
	Error: ERROR,
	Rank: obj("Rango", {
		tier: int("Nivel de rango: 0 sin rango, 3 Hierro 1 … 27 Radiante"),
		name: str("Nombre del rango"),
		rr: int("RR dentro del rango (0-100)"),
		lastChange: int("RR ganado o perdido en la última partida"),
		elo: int("Puntuación acumulada: (tier − 3) × 100 + rr"),
	}),
	Season: obj("Resultado de un acto", {
		season: str("Acto, p. ej. `e11a5`"),
		wins: int("Victorias"),
		games: int("Partidas"),
		endTier: int("Rango final del acto"),
		endTierName: str("Nombre del rango final"),
		actWins: list("Rangos de las victorias del triángulo del acto", {
			type: "integer",
		}),
	}),
	Profile: obj("Perfil del jugador", {
		puuid: str("Identificador único del jugador"),
		name: str("Nombre del Riot ID"),
		tag: str("Tag del Riot ID"),
		region: str("Región"),
		level: int("Nivel de cuenta"),
		cardId: nullable("string", "Id de la player card"),
		title: nullable("string", "Id del título"),
		rank: ref("Rank"),
		peak: {
			...obj("Rango máximo alcanzado", {
				tier: int("Rango"),
				name: str("Nombre"),
				season: str("Acto"),
			}),
			type: ["object", "null"],
		},
		seasons: list(
			"Historial por acto, del más reciente al más antiguo",
			ref("Season"),
		),
	}),
	Perf: obj("Performance Score oficial de Riot (solo partidas recientes)", {
		score: int("Puntuación de 0 a 500"),
		grade: str("Nota: `pass`, `merit`, `distinction`…"),
		breakdown: {
			type: "object",
			description: "Contribución por ronda en cada categoría",
			additionalProperties: { type: "number" },
		},
		ratings: {
			type: "object",
			description: "Valoración frente al lobby: `double_down` … `double_up`",
			additionalProperties: { type: "string" },
		},
	}),
	Detail: obj(
		"Estadísticas avanzadas de una partida (requiere el detalle ronda a ronda)",
		{
			perf: {
				...ref("Perf"),
				description: "Performance Score, o null si Riot no lo da",
			},
			placement: int("Puesto en la partida por combat score (1-10)"),
			teamPlacement: int("Puesto en tu equipo (1-5)"),
			mvp: int("1 = MVP de la partida, 2 = MVP del equipo, 0 = ninguno"),
			durationMs: int("Duración en milisegundos"),
			kast: num(
				"KAST: % de rondas con kill, asistencia, supervivencia o trade (0-1)",
			),
			fk: int("First kills"),
			fd: int("First deaths"),
			tradeKills: int("Kills vengando a un compañero en ≤5 s"),
			tradedDeaths: int("Muertes vengadas por un compañero en ≤5 s"),
			multi: list("Rondas con 2K, 3K, 4K y ACE", { type: "integer" }),
			clutch: obj("Clutches", {
				att: list("Intentos 1v1…1v5", { type: "integer" }),
				won: list("Ganados 1v1…1v5", { type: "integer" }),
			}),
			flawless: int("Rondas ganadas sin bajas en tu equipo"),
			thrifty: int("Rondas ganadas gastando bastante menos que el rival"),
			buys: {
				type: "object",
				description:
					"Por tipo de compra (`pistol`, `eco`, `force`, `full`): [ganadas, total]",
				additionalProperties: list("[ganadas, total]", { type: "integer" }),
			},
			sides: {
				type: "object",
				description: "Por lado (`atk`, `def`): [ganadas, total]",
				additionalProperties: list("[ganadas, total]", { type: "integer" }),
			},
			casts: obj("Usos de habilidades", {
				c: int("C"),
				q: int("Q"),
				e: int("E"),
				x: int("Ultimate"),
			}),
			plants: int("Spikes plantados"),
			defuses: int("Spikes desactivados"),
			spent: int("Créditos gastados"),
			friendlyFire: int("Daño a aliados"),
			allyTier: num("Rango medio de tus aliados"),
			enemyTier: num("Rango medio de los rivales"),
			party: int("Tamaño de tu grupo (1 = solo)"),
			weapons: {
				type: "object",
				description: "Por arma o habilidad: kills, impactos, daño y distancia",
				additionalProperties: { type: "object" },
			},
			killedBy: {
				type: "object",
				description: "Muertes por arma o habilidad",
				additionalProperties: { type: "integer" },
			},
			pts: list("Posiciones en el mapa: [x, y, 0 = kill | 1 = muerte]", {
				type: "array",
				items: { type: "number" },
			}),
		},
	),
	Game: obj("Partida del historial", {
		id: str("Id de la partida"),
		map: str("Mapa"),
		mode: str("Modo (nombre)"),
		queue: str("Modo (id): `competitive`, `unrated`…"),
		startedAt: str("Fecha de inicio (ISO 8601)"),
		season: str("Acto"),
		agent: str("Agente"),
		tier: int("Tu rango en esa partida"),
		team: { type: "string", enum: ["Red", "Blue"], description: "Tu equipo" },
		score: int("Combat score total"),
		kills: int("Kills"),
		deaths: int("Muertes"),
		assists: int("Asistencias"),
		head: int("Impactos en la cabeza"),
		body: int("Impactos en el cuerpo"),
		leg: int("Impactos en las piernas"),
		dealt: int("Daño infligido"),
		received: int("Daño recibido"),
		my: int("Rondas ganadas por tu equipo"),
		their: int("Rondas ganadas por el rival"),
		result: {
			type: "string",
			enum: ["W", "L", "D"],
			description: "Victoria, derrota o empate",
		},
		rr: {
			type: ["integer", "null"],
			description: "RR ganado o perdido (solo competitivo)",
		},
		detail: {
			...ref("Detail"),
			description: "Solo con `detail=true`; null si aún no está sincronizado",
		},
	}),
	PlayerLine: obj("Línea de un jugador en el marcador", {
		puuid: str("Id del jugador"),
		name: str("Nombre"),
		tag: str("Tag"),
		team: { type: "string", enum: ["Red", "Blue"], description: "Equipo" },
		agent: str("Agente"),
		tier: int("Rango"),
		score: int("Combat score"),
		kills: int("Kills"),
		deaths: int("Muertes"),
		assists: int("Asistencias"),
		damageDealt: int("Daño infligido"),
		firstKills: int("First kills"),
		firstDeaths: int("First deaths"),
		kast: num("KAST (0-1)"),
		multiKills: int("Rondas con 3+ kills"),
		perf: { ...ref("Perf"), description: "Performance Score" },
	}),
	Round: obj("Ronda", {
		index: int("Número de ronda (desde 0)"),
		winner: {
			type: "string",
			enum: ["Red", "Blue"],
			description: "Equipo ganador",
		},
		attackers: {
			type: "string",
			enum: ["Red", "Blue"],
			description: "Equipo atacante",
		},
		result: str("Cómo terminó: `Elimination`, `Defuse`, `Detonate`, `Timer`…"),
		planted: { type: "boolean", description: "Si se plantó el spike" },
		defused: { type: "boolean", description: "Si se desactivó" },
	}),
	Kill: obj("Kill", {
		round: int("Ronda"),
		timeMs: int("Momento de la ronda en ms"),
		killer: str("puuid de quien mata"),
		victim: str("puuid de la víctima"),
		assistants: list("puuids de los asistentes", { type: "string" }),
		weapon: str("Arma o habilidad"),
		victimPos: list("Posición de la víctima [x, y]", { type: "number" }),
		killerPos: list("Posición de quien mata [x, y]", { type: "number" }),
	}),
	Match: obj("Partida completa", {
		id: str("Id"),
		map: str("Mapa"),
		mode: str("Modo"),
		startedAt: str("Fecha de inicio"),
		durationMs: int("Duración en ms"),
		mvp: nullable("string", "puuid del MVP de la partida"),
		teams: {
			type: "object",
			description: "Rondas ganadas y resultado por equipo",
			additionalProperties: obj("Equipo", {
				rounds: int("Rondas ganadas"),
				won: { type: "boolean", description: "Si ganó" },
			}),
		},
		players: list("Los 10 jugadores", ref("PlayerLine")),
		rounds: list("Rondas", ref("Round")),
		kills: list("Kill feed completo", ref("Kill")),
	}),
	Summary: obj("Estadísticas agregadas", {
		games: int("Partidas"),
		wins: int("Victorias"),
		losses: int("Derrotas"),
		winRate: num("% de victorias (0-1)"),
		kd: num("Kills / muertes"),
		kda: num("(Kills + asistencias) / muertes"),
		kpr: num("Kills por ronda"),
		hs: num("% de impactos en la cabeza (0-1)"),
		acs: num("Combat score medio por ronda"),
		adr: num("Daño medio por ronda"),
		damageDelta: num("Daño infligido − recibido por ronda"),
		detailed: int("Partidas con detalle ronda a ronda"),
		perf: num("Performance Score medio"),
		perfN: int("Partidas con Performance Score"),
		grades: {
			type: "object",
			description: "Partidas por nota",
			additionalProperties: { type: "integer" },
		},
		kast: num("KAST medio (0-1)"),
		fkPerMatch: num("First kills por partida"),
		fdPerMatch: num("First deaths por partida"),
		fkRatio: num("% de duelos de apertura ganados (0-1)"),
		mvps: int("Veces MVP de la partida"),
		teamMvps: int("Veces MVP del equipo"),
		multi: list("Rondas 2K, 3K, 4K, ACE", { type: "integer" }),
		clutchAtt: list("Intentos de clutch 1v1…1v5", { type: "integer" }),
		clutchWon: list("Clutches ganados 1v1…1v5", { type: "integer" }),
		tradeKills: int("Trade kills"),
		tradedPct: num("% de tus muertes vengadas (0-1)"),
		atkWinRate: num("% de rondas ganadas en ataque"),
		defWinRate: num("% de rondas ganadas en defensa"),
		econ: num("Econ rating: daño por cada 1000 créditos"),
		allyTier: num("Rango medio de aliados"),
		enemyTier: num("Rango medio de rivales"),
		best: {
			type: "object",
			description:
				"Récords (`kills`, `acs`, `adr`, `perf`) con la partida en que se lograron",
			additionalProperties: obj("Récord", {
				value: num("Valor"),
				matchId: str("Partida"),
				map: str("Mapa"),
				agent: str("Agente"),
				startedAt: str("Fecha"),
			}),
		},
		streak: obj("Rachas", {
			current: int("Racha actual"),
			currentType: nullable("string", "`W` o `L`"),
			longestWin: int("Mejor racha de victorias"),
			longestLoss: int("Peor racha de derrotas"),
		}),
	}),
	Group: obj("Estadísticas agrupadas (por agente o mapa)", {
		key: str("Agente o mapa"),
		games: int("Partidas"),
		wins: int("Victorias"),
		losses: int("Derrotas"),
		winRate: num("% de victorias (0-1)"),
		kd: num("K/D"),
		kda: num("KDA"),
		acs: num("ACS"),
		adr: num("ADR"),
		hs: num("% headshot (0-1)"),
		kast: nullable("number", "KAST (0-1), si hay detalle"),
		perf: nullable("number", "Performance Score medio"),
		fkPerMatch: nullable("number", "First kills por partida"),
		atkWinRate: nullable("number", "% rondas ganadas en ataque"),
		defWinRate: nullable("number", "% rondas ganadas en defensa"),
		detailed: int("Partidas con detalle"),
		role: nullable("string", "Rol del agente (solo en /agents)"),
	}),
	WeaponStat: obj("Estadísticas de un arma o habilidad", {
		weapon: str("Nombre"),
		kills: int("Kills"),
		deaths: int("Veces que te mataron con ella"),
		share: num("% de tus kills (0-1)"),
		hs: num("% de impactos en la cabeza mientras la llevabas (0-1)"),
		shots: int("Impactos registrados"),
		damage: int("Daño infligido"),
		avgDist: nullable("number", "Distancia media de tus kills en metros"),
		icon: nullable("string", "URL del icono"),
		ability: { type: "boolean", description: "true si es una habilidad" },
	}),
	RRPoint: obj("Cambio de RR tras una partida", {
		matchId: str("Partida"),
		date: str("Fecha"),
		tier: int("Rango tras la partida"),
		tierName: str("Nombre del rango"),
		rr: int("RR tras la partida"),
		change: int("RR ganado o perdido"),
		elo: int("Puntuación acumulada"),
		map: str("Mapa"),
		season: str("Acto"),
	}),
	SyncStatus: obj("Estado de la sincronización", {
		total: int("Partidas que existen en el historial"),
		known: int("Partidas guardadas"),
		detailed: int("Partidas con detalle ronda a ronda"),
		detailable: int("Partidas que admiten detalle (no deathmatch)"),
		rrPoints: int("Cambios de RR guardados"),
		working: {
			type: "boolean",
			description: "Si aún queda historial por descargar",
		},
		lastSyncAt: nullable("string", "Última sincronización (ISO 8601)"),
	}),
}

export const spec: OpenApiSpec = {
	openapi: "3.1.0",
	info: {
		title: "Valorant Stats API",
		version: "1.0.0",
		description:
			"API pública de solo lectura con las estadísticas de las cuentas seguidas. Sin autenticación y con CORS abierto. Los datos salen de la base de datos y se actualizan cada pocos minutos.",
	},
	servers: [{ url: "/api/v1" }],
	tags: [
		{ name: "Jugador", description: "Perfil y rango" },
		{ name: "Partidas", description: "Historial y detalle de partidas" },
		{
			name: "Estadísticas",
			description: "Agregados por periodo, agente, mapa y arma",
		},
		{ name: "Sistema", description: "Estado y especificación" },
	],
	paths: {
		"/players": {
			get: {
				operationId: "listPlayers",
				summary: "Jugadores",
				description:
					"Cuentas seguidas. Usa su `slug` en el parámetro `player` del resto de endpoints.",
				tags: ["Jugador"],
				responses: ok(
					"Jugadores",
					envelope(
						list(
							"Jugadores",
							obj("Jugador", {
								slug: str("Identificador para `player`"),
								name: str("Nombre de Riot"),
								tag: str("Tag de Riot"),
							}),
						),
					),
				),
			},
		},
		"/profile": {
			get: {
				operationId: "getProfile",
				summary: "Perfil",
				description:
					"Riot ID, nivel, rango actual, rango máximo y resultados de cada acto.",
				tags: ["Jugador"],
				parameters: [PLAYER],
				responses: ok("Perfil", envelope(ref("Profile"))),
			},
		},
		"/rr-history": {
			get: {
				operationId: "getRRHistory",
				summary: "Historial de RR",
				description:
					"Cambios de RR tras cada partida competitiva, del más antiguo al más reciente.",
				tags: ["Jugador"],
				parameters: [
					PLAYER,
					{
						name: "limit",
						in: "query",
						description: "Últimos N puntos",
						schema: {
							type: "integer",
							default: 100,
							minimum: 1,
							maximum: 1000,
						},
					},
					{
						name: "season",
						in: "query",
						description: "Solo un acto, p. ej. `e11a5`",
						schema: { type: "string" },
					},
				],
				responses: ok(
					"Historial",
					envelope(
						list("Puntos", ref("RRPoint")),
						obj("Paginación", {
							total: int("Puntos disponibles"),
							limit: int("Límite"),
							season: nullable("string", "Acto filtrado"),
						}),
					),
				),
			},
		},
		"/matches": {
			get: {
				operationId: "listMatches",
				summary: "Partidas",
				description:
					"Historial de partidas, de la más reciente a la más antigua.",
				tags: ["Partidas"],
				parameters: [
					...FILTERS,
					{
						name: "limit",
						in: "query",
						description: "Partidas por página",
						schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
					},
					{
						name: "offset",
						in: "query",
						description: "Saltar las primeras N",
						schema: { type: "integer", default: 0, minimum: 0 },
					},
					{
						name: "detail",
						in: "query",
						description: "Incluir las estadísticas avanzadas de cada partida",
						schema: {
							type: "string",
							enum: ["false", "true"],
							default: "false",
						},
					},
				],
				responses: ok(
					"Página de partidas",
					envelope(
						list("Partidas", ref("Game")),
						obj("Paginación y filtros", {
							player: str("Slug del jugador"),
							mode: str("Modo"),
							period: str("Periodo"),
							total: int("Total con estos filtros"),
							limit: int("Límite"),
							offset: int("Desplazamiento"),
							detail: { type: "boolean", description: "Si incluye detalle" },
						}),
					),
				),
			},
		},
		"/matches/{id}": {
			get: {
				operationId: "getMatch",
				summary: "Partida completa",
				description:
					"Marcador de los 10 jugadores, rondas y kill feed con posiciones.",
				tags: ["Partidas"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						description: "Id de la partida (de `/matches`)",
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "Partida",
						content: { "application/json": { schema: envelope(ref("Match")) } },
					},
					"404": {
						description: "No existe o aún no tiene detalle",
						content: { "application/json": { schema: ref("Error") } },
					},
				},
			},
		},
		"/summary": {
			get: {
				operationId: "getSummary",
				summary: "Resumen",
				description:
					"Todas las estadísticas agregadas para el modo y periodo elegidos.",
				tags: ["Estadísticas"],
				parameters: FILTERS,
				responses: ok("Resumen", envelope(ref("Summary"), filtersMeta)),
			},
		},
		"/agents": {
			get: {
				operationId: "getAgents",
				summary: "Agentes",
				description: "Estadísticas por agente, ordenadas por partidas jugadas.",
				tags: ["Estadísticas"],
				parameters: FILTERS,
				responses: ok(
					"Agentes",
					envelope(list("Agentes", ref("Group")), filtersMeta),
				),
			},
		},
		"/maps": {
			get: {
				operationId: "getMaps",
				summary: "Mapas",
				description: "Estadísticas por mapa, ordenadas por partidas jugadas.",
				tags: ["Estadísticas"],
				parameters: FILTERS,
				responses: ok(
					"Mapas",
					envelope(list("Mapas", ref("Group")), filtersMeta),
				),
			},
		},
		"/weapons": {
			get: {
				operationId: "getWeapons",
				summary: "Armas y habilidades",
				description: "Kills, precisión, daño y distancia por arma y habilidad.",
				tags: ["Estadísticas"],
				parameters: FILTERS,
				responses: ok(
					"Armas",
					envelope(list("Armas", ref("WeaponStat")), filtersMeta),
				),
			},
		},
		"/sync": {
			get: {
				operationId: "getSync",
				summary: "Estado de sincronización",
				description: "Cuánto historial hay guardado y si sigue descargándose.",
				tags: ["Sistema"],
				parameters: [PLAYER],
				responses: ok("Estado", envelope(ref("SyncStatus"))),
			},
		},
		"/openapi.json": {
			get: {
				operationId: "getSpec",
				summary: "Especificación OpenAPI",
				description:
					"Esta misma documentación en formato OpenAPI 3.1, para generar clientes o importarla en Postman.",
				tags: ["Sistema"],
				responses: { "200": { description: "Especificación" } },
			},
		},
	},
	components: { schemas },
}
