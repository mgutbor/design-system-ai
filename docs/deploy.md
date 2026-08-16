# Despliegue de ODS AI (v1)

Guía oficial para publicar la documentación y el asistente. Estado:
**validada en auditoría pre-release (V1 FINAL)**. La decisión de hosting y las
credenciales (cuenta, dominios, `NVIDIA_API_KEY` de producción) las toma el
responsable del proyecto.

## Arquitectura

```
apps/docs (estático, Vite SPA)          apps/api (Node + Hono)
        │  POST /api/ask { question }          │
        │  GET  /api/health                    │
        └──────────────►  HTTP (CORS por      ▼
                            CORS_ORIGIN)  ai-core → knowledge → AIProvider
                                                       (NVIDIA | Mock)
```

- **apps/docs**: build estático (`pnpm -F @ods-ai/docs build`) → `dist/`. Sirve
  HTML/JS/CSS + `favicon.svg`. No requiere Node en runtime.
- **apps/api**: servidor Node (`pnpm -F @ods-ai/api start`), puerto `PORT`
  (default 3001). No tiene estado de base de datos; el rate limiting es en
  memoria (ver §Rate limiting).

## Variables de entorno

| Variable               | Dónde             | Obligatoria                   | Valor                                                                                                                                                                               |
| ---------------------- | ----------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NVIDIA_API_KEY`       | apps/api          | solo con `AI_PROVIDER=nvidia` | key de NVIDIA Build (nunca en el repo/navegador/logs)                                                                                                                               |
| `NVIDIA_MODEL`         | apps/api          | solo nvidia                   | p. ej. `deepseek-ai/deepseek-v4-flash-0731` (validado)                                                                                                                              |
| `AI_PROVIDER`          | apps/api          | no                            | `nvidia` (o se activa con `NVIDIA_API_KEY` presente); ausente → `mock`                                                                                                              |
| `NVIDIA_BASE_URL`      | apps/api          | no                            | default `https://integrate.api.nvidia.com/v1`                                                                                                                                       |
| `NVIDIA_TIMEOUT_MS`    | apps/api          | no                            | default `60000` (latencia real 8.5–25.3 s)                                                                                                                                          |
| `RATE_LIMIT_MAX`       | apps/api          | no                            | peticiones por IP por ventana; default `60`; `0` desactiva                                                                                                                          |
| `RATE_LIMIT_WINDOW_MS` | apps/api          | no                            | default `60000`                                                                                                                                                                     |
| `CORS_ORIGIN`          | apps/api          | sí en producción              | lista separada por comas de orígenes permitidos, p. ej. `https://docs.ods-ai.dev` (placeholder hasta conocer el dominio). Sin ella, default de desarrollo `*`                       |
| `TRUST_PROXY`          | apps/api          | no                            | `1` solo detrás de un proxy de confianza que sobrescribe `X-Forwarded-For` (p. ej. Vercel/Fly). Sin ella, la IP se toma del socket y `X-Forwarded-For` no se confía (anti-spoofing) |
| `PORT`                 | apps/api          | no                            | default `3001`                                                                                                                                                                      |
| `VITE_API_BASE_URL`    | apps/docs (build) | sí en producción              | URL pública de apps/api, p. ej. `https://api.ods-ai.dev`; sin ella, en producción el cliente usa mismo origen (`''`, requiere proxy `/api`) y en dev `http://localhost:3001`        |

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

Implementado en `apps/api` (V1-0, verificado V1 FINAL): **fixed window en
memoria por IP**, default 60 req/min, configurable
(`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`), exento en `/api/health`, respuesta
`429` con `Retry-After` (segundos restantes).

- **IP utilizada**: con `TRUST_PROXY=1` se lee el primer valor de
  `X-Forwarded-For`; sin él, la dirección del socket. Un `X-Forwarded-For`
  enviado a pelo por el cliente NO crea contadores distintos (test
  anti-spoofing en `app.test.ts`).
- **Limitación documentada para v1**: es por **instancia** (memoria) y asume
  una **única instancia**. En despliegues multi-instancia o serverless cada
  instancia tiene su contador; para un límite global estricto haría falta un
  store compartido (p. ej. Redis) — diferido, documentado en `docs/api.md`.

## Health check (P1-3)

- Endpoint: `GET /api/health` → `{ status: 'ok', provider }`. Sin auth, sin
  llamadas a NVIDIA, rápido, no expone secrets ni configuración (verificado
  en vivo).
- UI (`/assistant`): **una** comprobación al montar la página, timeout 3 s
  (`AbortController`), **sin polling**. Disponible → "Servicio disponible";
  caída → aviso "El asistente no está disponible en este momento…" (no
  bloquea el formulario). Sin `VITE_API_BASE_URL` en producción el cliente usa
  mismo origen; si no hay proxy, el health falla y se muestra "no disponible"
  (comportamiento correcto y documentado).

## Seguridad

- **CORS**: sin `CORS_ORIGIN` (dev) → `*`; en producción solo los orígenes de
  `CORS_ORIGIN` reciben `Access-Control-Allow-Origin` (reflejado + `Vary:
Origin`). Preflight de origen ajeno → `204` sin cabecera CORS (el navegador
  bloquea); petición real de origen ajeno → `403 origin_not_allowed`. Sin
  cookies ni credenciales. Verificado en vivo.
- Límite de body: 64 KB durante la lectura del stream (`413
payload_too_large`, no depende de `Content-Length`); pregunta ≤ 4000 chars.
- Errores mapeados: `400` inválido · `403` origen · `413` body grande · `429`
  rate limit · `502` provider · `503` timeout · `500` interno; sin stack
  traces, rutas internas, claves ni configuración.
- La API key solo existe server-side (env); nunca en bundle (verificado: el
  bundle de producción de docs no contiene secretos), logs ni respuestas.

## Fallback SPA (rutas directas)

apps/docs es una SPA: un refresh en `/components/button` debe servir
`index.html`. Configuración por hosting (sin server-side):

- **Vercel**: `vercel.json` → `{ "rewrites": [{ "source": "/(.*)",
"destination": "/index.html" }] }`.
- **Netlify / Cloudflare Pages**: archivo `_redirects` con `/* /index.html
200`.
- **Vite preview** (local/CI) ya hace fallback a `index.html` (verificado).

## Pasos exactos (una vez decidido el hosting)

1. **Desplegar apps/api** (p. ej. Fly.io / Render):
   - Servicio Node, comando de arranque `pnpm -F @ods-ai/api start`
     (o `node --import tsx apps/api/src/entrypoints/node.ts`).
   - Env: `AI_PROVIDER=nvidia`, `NVIDIA_API_KEY`, `NVIDIA_MODEL`,
     `CORS_ORIGIN=https://docs.<dominio>` (lista separada por comas si hay
     varios), `TRUST_PROXY=1` si el hosting es un proxy de confianza,
     `PORT` (o el que asigne el proveedor), opcional
     `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`.
   - Verificar: `curl https://api.<dominio>/api/health` → `{"status":"ok"}`.
2. **Desplegar apps/docs** (Vercel/Cloudflare Pages/GitHub Pages):
   - Build: `pnpm -F @ods-ai/docs build` (el bundle de producción no contiene
     localhost ni secretos; el asistente usa `VITE_API_BASE_URL` o mismo
     origen).
   - Env de build: `VITE_API_BASE_URL=https://api.<dominio>`.
   - Publicar `apps/docs/dist` + configuración de **fallback SPA** (ver
     arriba).
3. **Verificación final**:
   - `GET /api/health` responde desde el origen de docs (CORS).
   - `/assistant` muestra "Servicio disponible" y responde grounded
     ("¿Cómo uso Button?") y refusal ("Necesito un DatePicker", sin llamar al
     LLM).
   - Copiar un token y un ejemplo en docs; móvil; axe.
   - Rate limit en vivo: 3 peticiones seguidas → `429` con `Retry-After`.

## Smoke test de los paquetes publicados

Procedimiento verificado (V1 FINAL) para probar que `@ods-ai/react` y
`@ods-ai/tokens` funcionan desde un proyecto externo, fuera del monorepo:

```bash
mkdir /tmp/ods-smoke && cd /tmp/ods-smoke
npm init -y
npm i @ods-ai/react @ods-ai/tokens react react-dom @types/react @types/react-dom \
  vite @vitejs/plugin-react typescript
```

App mínima: `import '@ods-ai/tokens/tokens.css'`; `Button`, `FormField` +
`Input`; `getToken('color.action.primary')`; `tokens.space[4]`; toggle
`data-theme="dark"`. Luego `npm run build` (TypeScript + Vite) y `vite preview`.

- Nota: `Input` **no** tiene prop `label` (pertenece a `FormField`); `Button`
  extiende la API nativa (`onClick` válido).
- `@types/react`/`@types/react-dom` son necesarios para TypeScript (peer
  estándar, no incluidos como dependencia).

## Troubleshooting

| Síntoma                                         | Causa probable                                   | Solución                                                          |
| ----------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| Assistant muestra "no disponible" en producción | `VITE_API_BASE_URL` sin fijar o sin proxy `/api` | Fijar `VITE_API_BASE_URL` en el build (o proxy)                   |
| Assistant responde desde docs pero CORS bloquea | `CORS_ORIGIN` sin el dominio de docs             | Añadir el origen a `CORS_ORIGIN`                                  |
| `429 Too many requests` legítimos               | Rate limit por IP compartida (NAT/corporativo)   | Subir `RATE_LIMIT_MAX`                                            |
| Timeouts en Vercel serverless                   | Duración de función < 60 s                       | Mover la API a Fly.io/Render (larga duración)                     |
| Todas las IPs comparten contador sin proxy      | `TRUST_PROXY=1` sin proxy real                   | Quitar `TRUST_PROXY` (usa socket) o ponerlo solo detrás del proxy |

## Riesgos restantes

- **Vercel serverless**: duración de funciones vs timeout LLM de 60 s y rate
  limiting por instancia → si se observan timeouts, mover la API a un host de
  larga duración (Fly.io/Render).
- **Sin autenticación/quotas por usuario**: la API es pública y solo tiene
  rate limit por IP (decisión documentada; el upgrade es post-v1).
- **MockProvider en producción**: válido como fallback sin coste, pero el
  asistente responde plantillas (no LLM).
