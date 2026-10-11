# Valorant stats

Dashboard de estadísticas de Valorant para varias cuentas, con comparador versus, hecho con Astro + React.

## Arrancar

```bash
npm install
cp .env.example .env   # rellena la API key, los Riot IDs y (opcional) SQL Server
npm run dev            # http://localhost:4321
```

`PLAYER_RIOT_IDS` es una lista separada por comas y va entre comillas (`"Nombre#TAG,Otro#TAG"`): sin ellas
`#` empieza un comentario en `.env`. También se acepta `Nombre/TAG`, y el antiguo `PLAYER_RIOT_ID` de una sola cuenta.

## Páginas

- `/` — perfiles seguidos (con una sola cuenta redirige a su perfil)
- `/p/{slug}` — dashboard de un jugador, p. ej. `/p/nombre-tag`
- `/versus?a={slug}&b={slug}` — comparación: categorías ganadas, evolución de rango, partidas juntos y
  enfrentados, agentes, roles y mapas
- `/docs` — documentación de la API

## Sincronización

Cargar la página nunca llama a la API: lee el archivo local que un sincronizador en segundo plano
(`src/lib/sync.ts`) va rellenando, una tarea cada 2,5 s y solo si quedan peticiones del límite por minuto
(siempre deja margen). El presupuesto se reparte por turnos entre todas las cuentas. Prioridad:

1. Cuenta (cada 24 h), rango y partidas/RR nuevos (cada 2 min) de todas las cuentas.
2. Historial completo de partidas y de RR.
3. Detalle ronda a ronda de cada partida, de la más reciente a la más antigua.

Si dos cuentas seguidas jugaron la misma partida, el detalle se descarga una sola vez.
Una tarea que falla espera con backoff exponencial en vez de bloquear las demás.

## Almacenamiento

- **SQL Server** si defines `MSSQL_SERVER`. Crea la base de datos y las tablas (`vs_games`, `vs_matches`,
  `vs_rr_history`, `vs_meta`) si no existen, e importa una sola vez lo que hubiera en `.cache/`.
  Partidas y RR se guardan por (partida, jugador); las bases creadas con una sola cuenta se migran solas al
  arrancar (la primera vez puede tardar uno o dos minutos).
- Si no, o si SQL Server no responde al arrancar, JSON local en `.cache/`.

## API pública

`/api/v1` — solo lectura, sin autenticación y con CORS abierto. Lee únicamente de la base de datos
(caché de 30 s), nunca de la API externa. Documentación interactiva en **`/docs`** y especificación en
`/api/v1/openapi.json` (generadas desde `src/lib/openapi.ts`).

| Endpoint | Devuelve |
| --- | --- |
| `GET /players` | Cuentas seguidas y su `slug` |
| `GET /profile` | Perfil, rango, peak y actos |
| `GET /summary` | Estadísticas agregadas |
| `GET /matches` | Historial paginado (`limit`, `offset`, `detail`) |
| `GET /matches/{id}` | Partida completa: marcador, rondas y kill feed |
| `GET /rr-history` | Cambios de RR (`limit`, `season`) |
| `GET /agents`, `/maps`, `/weapons` | Desglose por agente, mapa y arma/habilidad |
| `GET /sync` | Estado de la sincronización |

Todos menos `/players` y `/matches/{id}` aceptan `player` (slug; por defecto la primera cuenta).
`/summary`, `/matches`, `/agents`, `/maps` y `/weapons` aceptan además `mode` y `period` (`all`, `act`, `50`, `20`).

## Producción

```bash
npm run build
npm start   # servidor Node standalone (dist/server/entry.mjs)
```

## Estructura

- `src/interfaces/` — tipos (`.d.ts`)
- `src/lib/sync.ts` — sincronizador en segundo plano y archivo en memoria
- `src/lib/storage.ts` — persistencia: SQL Server o JSON local
- `src/lib/api.ts` — cliente de la API y normalización
- `src/lib/derive.ts` — KAST, FK/FD, clutches, multikills, trades, economía, armas y posiciones
- `src/lib/stats.ts` — agregaciones y filtros
- `src/lib/players.ts` — cuentas seguidas (`PLAYER_RIOT_IDS`)
- `src/lib/dashboard.ts` — datos de la página
- `src/lib/versus.ts` — comparación entre dos cuentas
- `src/lib/catalog.ts` — iconos, minimapas y habilidades
- `src/components/player/*`, `home/*`, `versus/*` — interfaz

Estilo: sin punto y coma, tabs (Prettier, ver `.prettierrc`), imports con alias `@/`.
