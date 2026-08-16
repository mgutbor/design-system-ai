# apps/api — HTTP API sobre AI Core (F5)

`apps/api` es una **capa HTTP fina** sobre AI Core (ADR-005): valida la
petición, llama a `answerQuestion` y devuelve el `AIAnswer` estructurado. **No
contiene retrieval, ni prompt building, ni conocimiento del modelo** — todo eso
vive en `packages/knowledge` + `packages/ai-core`. El provider se inyecta
(MockProvider en tests; el entrypoint lo elige por entorno).

> Contenido de la **F5 original** (SPEC §11). Implementado en la fase de
> trabajo F7; ver SPEC §11 reconciliado para el estado del roadmap.

```
HTTP → apps/api (validación) → AI Core (retrieval → gate → context → prompt)
     → AIProvider (Mock | NVIDIA) → AIAnswer → HTTP response
```

## Endpoints

### `POST /api/ask`

Request:

```json
{ "question": "¿Cómo uso Button?" }
```

Response (200) — derivada directamente de `AIAnswer`, sin campos inventados:

```json
{
  "requestId": "uuid",
  "answer": "...",
  "referencedComponents": ["button"],
  "confidence": "high",
  "hasRelevantContext": true,
  "providerId": "nvidia",
  "model": "...",
  "retrieval": {
    "query": "...",
    "components": [{ "component": "button", "score": 100 }],
    "minScore": 20
  }
}
```

Refusal (sin contexto relevante, p.ej. "Necesito un DatePicker"): mismo 200 con
`hasRelevantContext: false`, `confidence: "none"`, `referencedComponents: []`,
`answer` = plantilla `NO_RELEVANT_CONTEXT_MESSAGE`. **El provider nunca se
llama** en ese caso (gate de AI Core).

### `GET /api/health`

```json
{ "status": "ok", "provider": "mock" }
```

Nunca expone la API key ni la configuración.

## Validación (400)

| Caso                             | Status |
| -------------------------------- | ------ |
| body inexistente / JSON inválido | 400    |
| `question` ausente               | 400    |
| `question` no string             | 400    |
| `question` vacía (tras trim)     | 400    |
| `question` > 4000 caracteres     | 400    |

`MAX_QUESTION_LENGTH = 4000` (límite de mensaje de la SPEC §7; no hay un límite
definido para una pregunta individual, este es el mínimo necesario contra
abuso).

## Status codes de error

| Status | Significado                                        | Código                 |
| ------ | -------------------------------------------------- | ---------------------- |
| 400    | request inválido                                   | `invalid_request`      |
| 429    | rate limit del provider (se propaga)               | `rate_limit`           |
| 502    | provider no disponible / auth / respuesta inválida | `provider_unavailable` |
| 503    | provider timeout                                   | `provider_timeout`     |
| 500    | error interno no esperado                          | `internal`             |

Formato de error: `{ "error": { "code", "message", "requestId" } }`. Los
mensajes son genéricos y seguros: **nunca** contienen stack traces, rutas
internas (`packages/`, `node_modules/`, `sourcePath`), bodies de petición/
respuesta, headers ni API keys.

## Seguridad (F7 §12)

- La API key vive solo en el servidor (`process.env.NVIDIA_API_KEY`), nunca
  en el navegador, repositorio, logs o respuestas HTTP.
- Errores del provider mapeados por el código estable de la causa
  (`NvidiaProviderError.code`), recorriendo la cadena de causas; el detalle
  interno nunca se serializa.
- **CORS (F5, V1 FINAL)**: la UI del asistente en `apps/docs` consume la API
  desde otro origen (dev `5173 → 3001`, e2e `6007 → 3001`). Sin
  `CORS_ORIGIN` (dev) → `Access-Control-Allow-Origin: *`; en producción solo
  los orígenes de `CORS_ORIGIN` reciben la cabecera (reflejada + `Vary:
Origin`), preflight ajeno → 204 sin cabecera, petición ajena → 403. Métodos
  `GET, POST, OPTIONS`; sin credenciales ni cookies; no se expone información
  interna.
- **Rate limiting (V1-0, V1 FINAL)**: fixed window en memoria por IP
  (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`), `429` + `Retry-After`, exento en
  `/api/health`; IP desde socket salvo `TRUST_PROXY=1` (anti-spoofing).
  Limitación documentada: por instancia, asume una sola instancia en v1.
- Autenticación de usuario y cuotas: diferidos (decisión pendiente, post-v1).

## Consumo desde apps/docs (F5)

La UI del asistente (`/assistant`) consume exclusivamente `POST /api/ask`:

- El origen se configura en build con `VITE_API_BASE_URL` (default
  `http://localhost:3001`, el puerto local de `apps/api`).
- El cliente tipado vive en `apps/docs/src/assistant/api.ts`; define sus tipos
  locales (reflejo del contrato HTTP) y no importa `ai-core`/`knowledge` — el
  dependency graph se mantiene: docs → HTTP → api.
- El panel de fuentes de la UI se construye únicamente desde
  `AIAnswer.retrieval.components`; es imposible que la UI muestre un
  componente que no haya pasado el gate (garantía de ai-core, reforzada por
  tests de la UI).

## Configuración

Variables (ver `.env.example`):

| Variable            | Obligatoria | Default                               | Uso                                                                        |
| ------------------- | ----------- | ------------------------------------- | -------------------------------------------------------------------------- |
| `AI_PROVIDER`       | no          | `mock`                                | `mock` \| `nvidia`                                                         |
| `NVIDIA_API_KEY`    | solo nvidia | —                                     | API key (solo server)                                                      |
| `NVIDIA_MODEL`      | solo nvidia | —                                     | model string (sin default; validado: `deepseek-ai/deepseek-v4-flash-0731`) |
| `NVIDIA_BASE_URL`   | no          | `https://integrate.api.nvidia.com/v1` | endpoint OpenAI-compatible de NVIDIA Build                                 |
| `NVIDIA_TIMEOUT_MS` | no          | `60000`                               | timeout de petición (latencia real 8.5–25.3 s)                             |

Si `AI_PROVIDER=nvidia` y falta `NVIDIA_API_KEY` o `NVIDIA_MODEL`, el
provider falla en la construcción (fail-fast determinista).

> Nota de validación real (2026-08-16): el ID sin sufijo
> `deepseek-ai/deepseek-v4-flash` fue retirado del catálogo de NVIDIA Build
> (HTTP 410 Gone); el ID vigente y validado es
> `deepseek-ai/deepseek-v4-flash-0731`. Latencia observada por respuesta
> grounded: **8.5–25.3 s** (variable). Si recibes 503 por timeout del
> provider, sube `NVIDIA_TIMEOUT_MS` (default 60000).

## Ejecución local

Con MockProvider (sin API key, offline, determinista):

```bash
pnpm install
pnpm -F @ods-ai/api dev        # AI_PROVIDER por defecto = mock
curl -X POST localhost:3001/api/ask -H 'Content-Type: application/json' \
  -d '{"question":"¿Cómo uso Button?"}'
```

Con NVIDIA (requiere variables, nunca commits):

```bash
cp .env.example .env   # rellena NVIDIA_API_KEY y NVIDIA_MODEL
AI_PROVIDER=nvidia pnpm -F @ods-ai/api dev
```

## Tests

- `packages/ai-providers` — NvidiaProvider offline con fetch mockeado
  (request/headers/body, parsing, errores, timeout, sin fugas de secretos) +
  intercambiabilidad Mock/NVIDIA a través de AI Core.
- `apps/api` — tests HTTP offline con `app.request()`: 200 grounded, refusal
  sin llamada al provider, 400s, 429/502/503, sin secretos ni rutas internas,
  invariante `referencedComponents ⊆ gate-passing`.

## Auditoría F7.1 (hardening transversal)

F7.1 fue una auditoría de hardening sobre F5/F7 (ver SPEC §11), no una fase
funcional independiente:

Hardening demostrado por tests (nunca asumido):

1. **Matriz de entradas (44 casos)**: body vacío/null, JSON inválido/array/
   primitive, `question` null/123/[]/{}, vacía/espacios/Unicode, límite 4000
   exacto y 4001, props extra, prototype-pollution-like, anidación profunda,
   Content-Type incorrecto, métodos HTTP incorrectos, rutas inexistentes.
   Ninguna entrada inválida produce 500; formato de error estable
   `{ error: { code, message, requestId } }`; sin fugas.
2. **Secretos (7 casos)**: una key distintiva (fake) nunca aparece en
   respuestas HTTP, errores serializados, AIAnswer, RetrievalTrace,
   excepciones públicas, bundles de frontend ni código de apps/docs/playground.
   `.env` no versionado; `.env.example` sin secretos; key solo server-side
   (solo `entrypoints/node.ts` lee `NVIDIA_API_KEY`).
3. **NvidiaProvider A–Q (22 casos)**: 200 válido/inválido/schema
   incompleto/content no-string, 400/401/403/404/408/429/500/502/503, timeout,
   AbortError, network error, respuesta enorme. Cada fallo → código
   `AIProviderError` correcto; auth nunca se confunde con rate limit; sin
   falsos éxitos; body/headers del proveedor nunca se filtran.
4. **Request audit (4 casos)**: fetch spy verifica URL, POST, Content-Type,
   `Authorization: Bearer` (key solo ahí), messages exactos (system con
   instrucciones de grounding + `[RETRIEVED_CONTEXT]` del gate-passing + user),
   temperature default 0.2, sin sourcePath/node_modules/props heredadas, sin
   campos inventados; refusal no envía request.
5. **Prompt injection (8 casos)**: las queries de inyección nunca generan
   refs desde el texto, nunca exponen secretos, y sin contexto → refusal sin
   llamada al provider. Garantías de AI Core (separación estructural) vs
   responsabilidad del modelo (obedecer "ignore") documentadas.
6. **referencedComponents (8 casos)**: provider que menciona
   DatePicker/Card/Tabs/Toast/inventados/vacíos/duplicados — las refs derivan
   solo del retrieval gate-passing; duplicados colapsados.
7. **Refusal (7 consultas)**: 200, confidence none, refs [], provider no
   llamado, sin HTTP externo.
8. **Config (12 casos)**: NVIDIA_MODEL faltante/vacío/espacios → fallo
   claro y determinista; "undefined"/"null" literales aceptados (documentado,
   no se inventa una regla); tests usan `delete process.env` (nunca
   `= undefined`).
9. **Contrato + concurrencia (9 casos)**: requestId único por request, cambia
   entre requests, sin secretos; 20 requests simultáneas aisladas (sin
   contaminación cruzada de retrieval/context/config).
10. **Dependencias**: direcciones verificadas estáticamente — api → ai-core
    (+ ai-providers solo en entrypoint), ai-core → knowledge, sin inversiones.
11. **Smoke real NVIDIA**: opt-in (`RUN_NVIDIA_SMOKE=1` + credenciales);
    skip en CI por defecto; sin credenciales válidas no se ejecuta ni se
    inventa el resultado.
