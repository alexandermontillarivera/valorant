# Vantage — Valorant stats

Dashboard de estadísticas de Valorant para una cuenta, hecho con Astro + React.

## Arrancar

```bash
npm install
cp .env.example .env   # rellena la API key, el Riot ID y (opcional) SQL Server
npm run dev            # http://localhost:4321
```

`PLAYER_RIOT_ID` va entre comillas (`"Nombre#TAG"`): sin ellas `#` empieza un comentario en `.env`.

## Sincronización

Cargar la página nunca llama a la API: lee el archivo local que un sincronizador en segundo plano
(`src/lib/sync.ts`) va rellenando, una tarea cada 2,5 s y solo si quedan peticiones del límite por minuto
(siempre deja margen). Prioridad:

1. Cuenta (cada 24 h), rango y partidas/RR nuevos (cada 2 min).
2. Historial completo de partidas y de RR.
3. Detalle ronda a ronda de cada partida, de la más reciente a la más antigua.

Una tarea que falla espera con backoff exponencial en vez de bloquear las demás.

## Almacenamiento

- **SQL Server** si defines `MSSQL_SERVER`. Crea la base de datos y las tablas (`vs_games`, `vs_matches`,
  `vs_rr_history`, `vs_meta`) si no existen, e importa una sola vez lo que hubiera en `.cache/`.
- Si no, o si SQL Server no responde al arrancar, JSON local en `.cache/`.

## API pública

`/api/v1` — solo lectura, sin autenticación y con CORS abierto. Lee únicamente de la base de datos
(caché de 30 s), nunca de la API externa. Documentación interactiva en **`/docs`** y especificación en
`/api/v1/openapi.json` (generadas desde `src/lib/openapi.ts`).

| Endpoint | Devuelve |
| --- | --- |
| `GET /profile` | Perfil, rango, peak y actos |
| `GET /summary` | Estadísticas agregadas |
| `GET /matches` | Historial paginado (`limit`, `offset`, `detail`) |
| `GET /matches/{id}` | Partida completa: marcador, rondas y kill feed |
| `GET /rr-history` | Cambios de RR (`limit`, `season`) |
| `GET /agents`, `/maps`, `/weapons` | Desglose por agente, mapa y arma/habilidad |
| `GET /sync` | Estado de la sincronización |

`/summary`, `/matches`, `/agents`, `/maps` y `/weapons` aceptan `mode` y `period` (`all`, `act`, `50`, `20`).

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
- `src/lib/dashboard.ts` — datos de la página
- `src/lib/catalog.ts` — iconos, minimapas y habilidades
- `src/components/player/*` — interfaz

Estilo: sin punto y coma, tabs (Prettier, ver `.prettierrc`), imports con alias `@/`.
