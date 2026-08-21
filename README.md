# Design System AI

Design system open source con documentación viva y un asistente de IA que responde **solo** con la documentación real del sistema. Proyecto de portfolio de arquitectura frontend: monorepo, design tokens, componentes React accesibles, testing multi-nivel y una capa de IA desacoplada del proveedor.

## Demo pública

- **Documentación**: https://ods-ai-docs.onrender.com
- **Asistente**: https://ods-ai-docs.onrender.com/assistant
- **API (health check)**: https://ods-ai-api.onrender.com/api/health

> La demo se sirve desde el plan gratuito de Render. Tras un periodo de inactividad, la primera petición a la API tarda en arrancar (~1 min de cold start); es una limitación conocida del despliegue, documentada en la propia UI del asistente.

## ¿Qué es este proyecto?

Es un design system de código abierto (licencia MIT, nombre técnico **Open Design System AI** / ODS AI) que reúne:

- **Design tokens** framework-agnósticos en tres capas (primitivos, semánticos y temas), con CSS y TypeScript generados.
- **Ocho componentes React accesibles** (WCAG 2.2 AA): Button, Input, FormField, Checkbox, Select, Modal, Badge y Spinner.
- **Documentación viva** en una SPA (guía de inicio, fichas de componentes, tokens y un playground) que se genera en build-time a partir del propio código.
- **Un asistente de IA grounded**: responde preguntas sobre el sistema exclusivamente con la documentación recuperada; si no hay contexto relevante, rechaza la pregunta **antes** de llamar al modelo.

Como proyecto de portfolio, demuestra una arquitectura frontend de producción: monorepo pnpm + Turborepo, tokens como contrato entre diseño y código, componentes con API explícita y metadata generada como fuente de verdad, testing en cuatro niveles (unitario, integración, e2e y accesibilidad), CI/CD en GitHub Actions y una capa de IA modular e intercambiable (Mock para tests, NVIDIA en producción).

## Arquitectura

Monorepo de dos aplicaciones y cinco paquetes, con dependencias estrictas entre capas (ESLint con reglas de boundaries) y build orquestado por Turborepo:

```
apps/docs (SPA React) ──► apps/api (Hono, HTTP) ──► packages/ai-core
apps/playground         packages/knowledge ◄──────┘        │
                            ▲                            packages/ai-providers
packages/react (metadata)   │                            (Mock | NVIDIA)
packages/tokens (CSS+TS) ───┘
```

- **packages/tokens** genera el CSS y el TypeScript de los design tokens; es la base de todo lo demás.
- **packages/react** consume los tokens y expone los componentes; en build genera `dist/metadata/index.json`, la metadata que alimenta la capa de conocimiento.
- **packages/knowledge** convierte esa metadata en un corpus recuperable y ofrece un retriever determinista (sin IA).
- **packages/ai-core** orquesta la respuesta: retrieval → gate → contexto → prompt → provider, y devuelve una respuesta estructurada.
- **packages/ai-providers** implementa el contrato de provider: MockProvider (offline y determinista, para tests) y NvidiaProvider (NVIDIA Build, endpoint OpenAI-compatible).
- **apps/api** es una capa HTTP fina sobre AI Core (POST `/api/ask`, GET `/api/health`): valida, llama y serializa; no contiene retrieval, prompts ni conocimiento del modelo.
- **apps/docs** es la documentación pública: SPA con React + Vite, fichas de componentes, tokens y la UI del asistente en `/assistant`.

## Stack tecnológico

Node 22 LTS · pnpm 10 · Turborepo · React 19 · TypeScript 5.9 (estricto) · Vite · Hono · Storybook 10 · Vitest 4 · React Testing Library · Playwright · ESLint 9 · Prettier · GitHub Actions · npm Trusted Publishing (OIDC) con SLSA provenance · NVIDIA Build (OpenAI-compatible) · Render (Static Site + Web Service)

## Estructura del monorepo

```
apps/
  docs/        Documentación pública (SPA) + UI del asistente
  playground/  Playground de componentes
  api/         API HTTP (Hono): POST /api/ask y GET /api/health
packages/
  tokens/      Design tokens (primitivos, semánticos, temas) → CSS + TypeScript
  react/       Componentes React accesibles + metadata generada
  knowledge/   Corpus de conocimiento + retriever determinista
  ai-core/     Pipeline de respuesta grounded (retrieval → gate → contexto → provider)
  ai-providers/ Providers de IA: MockProvider y NvidiaProvider
e2e/           Tests de extremo a extremo (Playwright)
docs/          SPEC, ADRs y documentación técnica interna
```

## IA / RAG

El asistente sigue un flujo en seis pasos. Es importante ser precisos: **no es un sistema RAG avanzado** — no hay embeddings ni base de datos vectorial. La recuperación es determinista (keywords + sinónimos + scoring) sobre un corpus de 8 componentes, y el modelo solo redacta la respuesta a partir del contexto recuperado:

1. **Pregunta del usuario** — `POST /api/ask` con la pregunta en texto libre.
2. **Recuperación de contexto** — el retriever de `packages/knowledge` puntúa los componentes del corpus (match de nombre, sinónimos en español, tags, variantes y props propias) y devuelve el top-K con su score. Es lógica pura, testeable y sin IA.
3. **Comprobación de contexto relevante (gate)** — `packages/ai-core` aplica un umbral (`minScore = 20`); solo pasan los componentes con evidencia suficiente. Si ninguno pasa, el sistema **rechaza la pregunta antes de llamar al LLM** (respuesta determinista `hasRelevantContext: false`, `confidence: "none"`).
4. **Construcción del prompt y contexto** — con los componentes que pasaron el gate se construye un contexto compacto (API propia, variantes, tokens usados, resumen de accesibilidad y ejemplos canónicos) y un prompt que instruye al modelo a responder exclusivamente con ese contexto.
5. **NVIDIA Build (OpenAI-compatible)** — el modelo redacta la respuesta fundamentada (modelo configurable vía `NVIDIA_MODEL`; timeout configurable). Es la única parte del flujo que usa IA.
6. **Respuesta fundamentada** — la API devuelve `answer`, `referencedComponents` (solo los que pasaron el gate), `confidence` (derivada del score: high ≥ 100, medium ≥ 50, low < 50) y el detalle de retrieval.

Resumen de responsabilidades: **retrieval** → `packages/knowledge` (determinista, sin IA); **gate y construcción de contexto** → `packages/ai-core` (determinista, sin IA); **modelo** → `packages/ai-providers` + NVIDIA (única parte con IA). El corpus se evalúa con 56 casos de consulta: Top-1 30/30 (100 %), Top-3 36/36 (100 %) y 20/20 consultas sin evidencia correctamente rechazadas.

## Paquetes

- **@ods-ai/tokens** `0.1.1` — design tokens en tres capas (primitivos, semánticos, temas) con CSS y TypeScript generados. Framework-agnóstico: puede usarse fuera de React.
- **@ods-ai/react** `0.1.2` — componentes React accesibles (WCAG 2.2 AA) con APIs pequeñas y explícitas basadas en la semántica nativa de HTML. No incluye estilos propios: consume el CSS de `@ods-ai/tokens`. Expone además la metadata generada (`@ods-ai/react/metadata`) que alimenta al asistente.

Ambos están publicados en npm mediante GitHub Actions con **Trusted Publishing (OIDC)** y **provenance SLSA v1** (el push a `main` nunca publica; el workflow de release es manual). El resto de paquetes (`knowledge`, `ai-core`, `ai-providers`, `api`, `docs`, `playground`) son internos y privados.

## Desarrollo

Requisitos: Node ≥ 22 y pnpm 10 (el repo fija `packageManager: pnpm@10.34.5`).

```bash
pnpm install            # instalar dependencias del workspace
pnpm build              # build de todos los paquetes (genera tokens + metadata)
pnpm typecheck          # TypeScript estricto
pnpm lint               # ESLint (incluye boundaries entre paquetes)
pnpm validate           # validación de tokens + contraste WCAG
pnpm test               # Vitest (incluye suite de evaluación del retriever)
pnpm format:check       # Prettier
pnpm storybook          # Storybook dev (puerto 6006)
pnpm build-storybook    # build estático de Storybook
pnpm e2e                # Playwright (requiere build-storybook previo)
pnpm dev:docs           # docs en http://localhost:5173
```

API local con MockProvider (sin API key, offline y determinista):

```bash
pnpm -F @ods-ai/api dev
curl -X POST localhost:3001/api/ask -H 'Content-Type: application/json' \
  -d '{"question":"¿Cómo uso Button?"}'
```

Con NVIDIA (requiere `NVIDIA_API_KEY` y `NVIDIA_MODEL`, nunca versionadas): `cp .env.example .env`, rellenar valores y `AI_PROVIDER=nvidia pnpm -F @ods-ai/api dev`.

Documentación técnica interna: [SPEC](docs/SPEC.md) · [ADRs](docs/adr/) · [knowledge/retrieval](docs/knowledge.md) · [AI Core](docs/ai-core.md) · [API](docs/api.md) · [release](docs/release.md).

## Despliegue

Despliegue gratuito en Render mediante un [Blueprint](render.yaml):

- **Documentación** → Static Site (Vite SPA). `routes` con rewrite de SPA: cualquier refresco directo (p. ej. `/components/button`) sirve `index.html`.
- **API** → Web Service (Node + Hono, plan free, región frankfurt) con health check en `/api/health`.
- **IA** → NVIDIA Build (endpoint OpenAI-compatible). La API key vive solo en el servidor (`NVIDIA_API_KEY`), nunca en el navegador, logs ni respuestas.
- **Variables de entorno**: `NVIDIA_API_KEY` (secreta), `CORS_ORIGIN` (orígenes permitidos de la UI), `VITE_API_BASE_URL` (URL pública de la API, build-time), `AI_PROVIDER`, `NVIDIA_MODEL`, `NVIDIA_TIMEOUT_MS`, `NODE_VERSION=22` y `TRUST_PROXY=1`. Los valores reales se piden al crear el Blueprint; nada de esto se versiona.

**Limitación conocida (plan free de Render)**: tras inactividad, la primera petición a la API tarda ~1 min en responder (cold start). La UI del asistente lo gestiona con un health check con timeout de 10 s y un aviso honesto al usuario. En la práctica las peticiones sucesivas responden en segundos.

## Licencia

MIT — ver [LICENSE](LICENSE).
