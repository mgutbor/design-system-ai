# Despliegue de ODS AI (v1)

Guía oficial para publicar la documentación y el asistente. Estado: **propuesta
validada** — la decisión de hosting y las credenciales (cuenta, dominios,
`NVIDIA_API_KEY` de producción) las toma el responsable del proyecto.

## Arquitectura

```
apps/docs (estático, Vite SPA)          apps/api (Node + Hono)
        │  POST /api/ask { question }          │
        │  GET  /api/health                    │
        └──────────────►  HTTP (CORS *)        ▼
                                          ai-core → knowledge → AIProvider
                                                       (NVIDIA | Mock)
```

- **apps/docs**: build estático (`pnpm -F @ods-ai/docs build`) → `dist/`. Sirve
  HTML/JS/CSS + `favicon.svg`. No requiere Node en runtime.
- **apps/api**: servidor Node (`pnpm -F @ods-ai/api start`), puerto `PORT`
  (default 3001). No tiene estado de base de datos; el rate limiting es en
  memoria (ver §Rate limiting).

## Variables de entorno

| Variable               | Dónde             | Obligatoria                   | Valor                                                                  |
| ---------------------- | ----------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `NVIDIA_API_KEY`       | apps/api          | solo con `AI_PROVIDER=nvidia` | key de NVIDIA Build (nunca en el repo/navegador/logs)                  |
| `NVIDIA_MODEL`         | apps/api          | solo nvidia                   | p. ej. `deepseek-ai/deepseek-v4-flash-0731` (validado)                 |
| `AI_PROVIDER`          | apps/api          | no                            | `nvidia` (o se activa con `NVIDIA_API_KEY` presente); ausente → `mock` |
| `NVIDIA_BASE_URL`      | apps/api          | no                            | default `https://integrate.api.nvidia.com/v1`                          |
| `NVIDIA_TIMEOUT_MS`    | apps/api          | no                            | default `60000` (latencia real 8.5–25.3 s)                             |
| `RATE_LIMIT_MAX`       | apps/api          | no                            | peticiones por IP por ventana; default `60`; `0` desactiva             |
| `RATE_LIMIT_WINDOW_MS` | apps/api          | no                            | default `60000`                                                        |
| `PORT`                 | apps/api          | no                            | default `3001`                                                         |
| `VITE_API_BASE_URL`    | apps/docs (build) | sí en producción              | URL pública de apps/api, p. ej. `https://api.ods-ai.dev`               |

## Opciones de hosting

| Opción                   | apps/docs             | apps/api          | Gratuito                                 | Notas                                                                                                                                                                                           |
| ------------------------ | --------------------- | ----------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel** (recomendada) | ✅ (static)           | ✅ (serverless)   | ✅ Hobby                                 | CI/CD desde Git, pnpm/monorepo soportado. ⚠️ Límite de duración de funciones serverless: llamadas LLM de hasta 60 s pueden acercarse al límite; y el rate limiting en memoria es por instancia. |
| **Cloudflare Pages**     | ✅ (static)           | —                 | ✅                                       | Solo docs; la API iría en Workers (requiere adaptar el entrypoint a Workers).                                                                                                                   |
| **Fly.io**               | ✅ (static/container) | ✅ (long-running) | ✅ (tokens mensuales)                    | Contenedor de larga duración: mejor para timeouts de 60 s y rate limiting en memoria coherente.                                                                                                 |
| **Render**               | ✅ (static)           | ✅ (web service)  | ✅ (free tier, dormido tras inactividad) | Alternativa simple para ambos.                                                                                                                                                                  |

**Recomendación v1 (coste 0):** docs en **Vercel** (o Cloudflare Pages) y API
en **Fly.io** o **Render** — la API necesita un proceso de larga duración por
las latencias del LLM y el rate limiting en memoria. Si se prefiere un único
proveedor, Vercel funciona con la advertencia del límite de duración y del
rate limiting por instancia.

> **Coste**: 0 € con los free tiers anteriores (sujeto a los términos vigentes
> de cada proveedor). El único coste real es la API key de NVIDIA Build
> (cuenta gratuita) y el dominio si se quiere uno propio.

## Rate limiting (P0-2)

Implementado en `apps/api` (V1-0): **fixed window en memoria por IP**, default
60 req/min, configurable (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`), exento en
`/api/health`, respuesta `429` con `Retry-After`. **Limitación**: es por
**instancia** — en despliegues multi-instancia o serverless cada instancia
tiene su contador. Para un límite global estricto habría que mover el estado a
un store compartido (p. ej. Redis) — diferido; documentado en `docs/api.md`.

## Health check (P1-3)

- Endpoint: `GET /api/health` → `{ status: 'ok', provider }` (no expone la key).
- UI (`/assistant`): **una** comprobación al montar la página, timeout 3 s
  (`AbortController`), **sin polling**. Disponible → "Servicio disponible";
  caída → aviso "El asistente no está disponible en este momento…" (no
  bloquea el formulario). "No configurada" (default `localhost:3001` sin API)
  se muestra como "no disponible".

## Seguridad

- CORS `*` (API pública sin credenciales), sin cookies.
- Límite de body: 64 KB (`413 payload_too_large`); pregunta ≤ 4000 chars.
- Errores mapeados: `400` inválido · `413` body grande · `429` rate limit ·
  `502` provider · `503` timeout · `500` interno; sin stack traces, rutas
  internas ni secretos.
- La API key solo existe server-side (env); nunca en bundle, logs ni respuestas.

## Pasos exactos (una vez decidido el hosting)

1. **Desplegar apps/api** (p. ej. Fly.io / Render):
   - Servicio Node, comando de arranque `pnpm -F @ods-ai/api start`
     (o `node --import tsx apps/api/src/entrypoints/node.ts`).
   - Env: `AI_PROVIDER=nvidia`, `NVIDIA_API_KEY`, `NVIDIA_MODEL`,
     `PORT=3001` (o el que asigne el proveedor), opcional
     `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`.
   - Verificar: `curl https://api.<dominio>/api/health` → `{"status":"ok"}`.
2. **Desplegar apps/docs** (Vercel/Cloudflare Pages/GitHub Pages):
   - Build: `pnpm -F @ods-ai/docs build`.
   - Env de build: `VITE_API_BASE_URL=https://api.<dominio>`.
   - Publicar `apps/docs/dist`.
3. **Verificación final**:
   - `GET /api/health` responde desde el origen de docs (CORS).
   - `/assistant` muestra "Servicio disponible" y responde grounded
     ("¿Cómo uso Button?") y refusal ("Necesito un DatePicker", sin llamar al
     LLM).
   - Copiar un token y un ejemplo en docs; móvil; axe.

## Riesgos restantes

- **Vercel serverless**: duración de funciones vs timeout LLM de 60 s y rate
  limiting por instancia → si se observan timeouts, mover la API a un host de
  larga duración (Fly.io/Render).
- **Sin autenticación/quotas por usuario**: la API es pública y solo tiene
  rate limit por IP (decisión documentada; el upgrade es post-v1).
- **MockProvider en producción**: válido como fallback sin coste, pero el
  asistente responde plantillas (no LLM).
