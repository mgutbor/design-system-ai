# SPEC v3 — Open Design System AI

Especificación arquitectónica definitiva. Estado: **aprobada**. Estado real del
proyecto: **F0–F6 completas** — `@ods-ai/tokens` y `@ods-ai/react` publicados
(0.1.0 bootstrap manual con 2FA; **0.1.1 publicado vía GitHub Actions + npm
Trusted Publishing/OIDC con SLSA provenance**, 2026-08-16). Actualizada para
reflejar la implementación real validada (retrieval server-side, `POST /api/ask`,
defaults reales).
Las fases de hardening F5.1/F6.1/F7.1 se incorporan como auditorías transversales, no
como fases funcionales. Los ADRs en `docs/adr/` desarrollan cada decisión.

## 1. Visión

Un Design System open source con documentación viva y un AI Assistant que enseña a usarlo correctamente, respondiendo **solo** con la documentación real del sistema (grounded). El proyecto demuestra arquitectura frontend de producción: monorepo, tokens, componentes accesibles, testing, CI/CD y una capa de IA desacoplada del proveedor.

## 2. Decisiones cerradas

| Ámbito      | Decisión                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack       | Node 22 LTS · pnpm 10 · Turborepo · React 19 + TypeScript 5.9 estricto · Vite · Storybook 10 · Vitest 4 + RTL · Playwright · ESLint 9 + Prettier |
| Proceso     | GitHub Actions · Changesets diferido a F6 · WCAG 2.2 AA · Documentación en español · MIT · light+dark desde F0                                   |
| Naming      | "Open Design System AI" · scope `@ods-ai/*` (verificado libre) · repo `open-design-system-ai`                                                    |
| Componentes | React (ADR-002) · APIs pequeñas, sin polimorfismo en v1 (ADR-007)                                                                                |
| Diferidos   | Docker, PWA, i18n, visual regression, streaming SSE, Husky/lint-staged, metadata freshness check                                                 |

## 3. Arquitectura y dependency graph

Dependency graph **real** (verificado contra la implementación; enforcement con
`import-x/no-restricted-paths` + CI):

```
apps/docs ──► packages/react ──► packages/tokens
apps/docs ──► packages/react/metadata   (JSON de metadata generado, datos)
apps/docs ──► packages/tokens

apps/playground ──► packages/react ──► packages/tokens

packages/react ──► packages/tokens      (CSS custom properties + tipos)
packages/react ──► packages/react/metadata (generador consume tipos/examples)

packages/knowledge ──► packages/react/metadata   (JSON, datos; nunca tipos React)

packages/ai-core ──► packages/knowledge          (retrieval + corpus + buildContext)

packages/ai-providers ──► packages/ai-core        (implementa AIProvider)

apps/api ──► packages/ai-core                     (answerQuestion, AIAnswer)
apps/api ──► packages/ai-providers                (solo entrypoint: elige provider por env)

(.storybook: root, importa packages/react + packages/tokens)

Prohibido: api → knowledge/tokens/react · playground → ai-* · react → ai-* ·
           ai-core → ai-providers/apps · knowledge → ai-* · tokens → nada
(Enforced con import-x/no-restricted-paths + CI)
```

> **Cambio respecto a la SPEC pre-F6**: el grafo original mostraba
> `apps/docs → knowledge → ai-core` (retrieval client-side). F6 movió la
> orquestación completa a AI Core (server-side): **ninguna app importa
> knowledge ni ai-core** (verificado por grep). Las apps consumen `@ods-ai/react`
> (+ metadata JSON) y tokens únicamente. La UI del asistente (F5) consume
> `apps/api` por HTTP en runtime (`VITE_API_BASE_URL`, default
> `http://localhost:3001`); el retrieval nunca corre en el navegador.
>
> **Excepción de tooling (P0)**: `apps/docs` consume un artefacto estático
> **generado** (`apps/docs/src/data/own-props.generated.ts`, regenerado con
> `pnpm generate:docs-own-props` desde `OWN_PROPS_BY_COMPONENT` de knowledge).
> knowledge sigue **fuera del runtime** de apps/docs: las únicas referencias
> son el script de generación y el test de frescura (tooling/test), y un test
> guarda que `src/` nunca importe knowledge.
>
> **Excepción de tooling (P1 — tokens)**: la página `/foundations/tokens`
> consume otro artefacto generado (`apps/docs/src/data/tokens-data.generated.ts`,
> `pnpm generate:docs-tokens-data`) con los datos que **no** forman parte del
> export público de `@ods-ai/tokens` (referencias semantic → primitive y pares
> de `contrast.json`). Rutas y valores proceden del export público (objeto
> `tokens` + CSS custom properties); `packages/tokens` no se modifica.

| Paquete                | Rol                                            | Publicación                           |
| ---------------------- | ---------------------------------------------- | ------------------------------------- |
| `@ods-ai/tokens`       | Tokens + generador + validador                 | Público (0.1.1 publicado, 2026-08-16) |
| `@ods-ai/react`        | Componentes DS + metadata JSON                 | Público (0.1.1 publicado, 2026-08-16) |
| `@ods-ai/ai-core`      | Port AIProvider + PromptBuilder + orquestación | Privado                               |
| `@ods-ai/ai-providers` | NVIDIA + Mock                                  | Privado                               |
| `@ods-ai/knowledge`    | Corpus + retriever + context builder           | Privado                               |

## 4. Contratos públicos

Contratos **reales** de la implementación (verificados en `packages/*/src`):

```ts
// ai-core
interface AIProvider {
  readonly id: 'nvidia' | 'mock';
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>;
}
interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
interface AIResponse { content: string; model: string; providerId: AIProviderId; usage?: TokenUsage; finishReason: 'stop'|'length'|'aborted'|'error' }

// ai-core — respuesta estructurada (AIAnswer)
interface AIAnswer {
  answer: string
  referencedComponents: string[]            // SOLO del retrieval (ADR-004 regla 3)
  confidence: 'none' | 'low' | 'medium' | 'high'  // determinista, de los scores
  hasRelevantContext: boolean
  providerId: AIProviderId
  model: string
  retrieval: { query: string; components: { component: string; score: number }[]; minScore: number }
}
answerQuestion({ provider, question, retriever?, corpus?, options? }): Promise<AIAnswer>

// knowledge
interface Retriever { search(query: { text: string; topK?: number }): RetrievalResult[] }  // síncrono
interface RetrievalResult { component: string; score: number; matchedTerms: string[]; reasons: string[] }
buildContext(results, corpus): string       // contexto compacto para el LLM

// tokens
tokens.color.action.primary            // objeto tipado generado (valores light, literales)
getToken<T extends TokenPath>(path: T): string  // total para TokenPath; fail-fast en runtime
// CSS: var(--color-action-primary)

// react (Button v1)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}
```

> **Cambio**: el contrato original definía `Retriever.search(query, options):
Promise<SearchResult[]>` con `KnowledgeSource`/`SearchResult` (retrieval
> client-side, §7 pre-F6). La implementación real usa un retriever **síncrono**
> sobre `ComponentKnowledge` con `RetrievalResult`. El grounding (ADR-004) no
> cambia: las citas siguen procediendo exclusivamente del retrieval.

## 5. Design Tokens (ADR-003)

Capas: **Primitive → Semantic → Component → Theme**. Fuente: JSON en `packages/tokens/src/tokens/`. Generación: CSS custom properties (`:root` + `[data-theme="dark"]`) y TypeScript tipado con literales. Validación: naming kebab-case, refs sin ciclos, sin shadowing entre capas, themes solo sobre semánticos, warnings de _unreferenced_ y _alias-only_, y **contraste WCAG por tema** desde `contrast.json` (4.5:1 texto, 3:1 UI/foco/borde).

Reglas estrictas:

1. Un **component token** solo se crea si aporta semántica que los semánticos no expresan (alias 1:1 prohibido: `button.primary.background` no existe; se usa `color.action.primary`).
2. Un semántico nace cuando **2+ componentes** lo necesitan.
3. F0: 79 primitivos · 18 semánticos · 0 component tokens. Primitivos = escalas por diseño; semánticos = conjunto mínimo.
4. La auditoría de uso escanea `var(--…)` del código real (sin listas manuales): un semántico solo se reporta _unreferenced_ si no lo usa ni el JSON, ni el contraste, ni el código (ADR-003, Auditoría de uso).

## 6. IA — grounding contract (ADR-004)

- **Retrieval server-side** en `packages/ai-core` (`answerQuestion`), que consume `packages/knowledge` (corpus + retriever + `buildContext`). La metadata es pública y el retrieval determinista, pero se ejecuta en el servidor; la UI del asistente (`apps/docs` `/assistant`) consume `apps/api` por HTTP.
- **Gate**: pasa cuando **al menos un resultado alcanza `minScore`**; **solo las fuentes que lo alcanzan** se inyectan en el contexto. Sin fuentes → respuesta determinista "no cubierto", **sin llamada al LLM**.
- **Síntesis permitida**: el LLM explica, resume, compara, recomienda y combina información recuperada.
- **Prohibido**: introducir hechos no respaldados por el contexto; **generar código nuevo** (cualquier código mostrado procede verbatim de los ejemplos recuperados/canónicos de `examples.tsx`).
- **Citas exclusivamente del retrieval**: el LLM nunca decide fuentes; la UI las pinta desde los `referencedComponents` del `AIAnswer` (garantía programática, no por prompt — F6.1).
- **Umbral configurable** (`AskOptions.minScore`/`topK`/`temperature`) con **defaults reales**: `minScore = 20`, `topK = 3`, `temperature = 0.2`, sobre la **escala absoluta** del retriever (name=100 · name-contains=60 · tag=30 · variant=25 · prop=20 · token=10 · description/a11y=5 · example=3). La afinación está respaldada por la suite de evaluación determinista (ver §7b).

## 7. Flujo end-to-end de una pregunta

Flujo **real** implementado (F6/F7, verificado):

```
Usuario: pregunta
  ↓ (1) POST /api/ask { question }                    (apps/api)
  ↓ (2) validación (determinista)                     (400 si inválida; ≤4000 chars)
  ↓ (3) answerQuestion → retriever.search({ text, topK })   (ai-core → knowledge, determinista)
  ↓ (4) gate: filter(score >= minScore)               (determinista, sin IA)
        ├─ 0 fuentes → (4a) refusal plantilla · SIN LLM · provider NO llamado
        └─ ≥1 fuente → (5) buildContext(passing, corpus)     (determinista)
                     → (6) buildGroundedMessages(q, ctx)     (determinista; contexto delimitado)
                     → (7) AIProvider.chat(messages)         (ÚNICA parte IA; Mock | NVIDIA)
                     → (8) AIAnswer estructurado             (answer + refs + confidence + trace)
                     → (9) 200 { requestId, ...AIAnswer }    (apps/api, sin reconstruir el contrato)
```

**Contrato HTTP real**: `POST /api/ask` `{ question }` → `{ requestId, ...AIAnswer }` · errores 400/429/502/503/500 con forma estable `{ error: { code, message, requestId } }` · `GET /api/health`.

> **Cambio**: el contrato original era `POST /api/chat { messages }` con
> retrieval client-side y rate limiting en la API (pre-F6). F6 movió la
> orquestación a AI Core y F7 definió `/api/ask { question }` (ADR-005
> actualizado). **Rate limiting queda diferido; decisión pendiente.** Streaming
> SSE futuro.

## 7b. Evaluación determinista (F5/F5.1)

- Suite real en `packages/knowledge/src/eval/` (`dataset.ts` con **56 consultas**
  - `evaluate.ts` con métricas Top-1/Top-3, falsos positivos/negativos,
    negativas rechazadas). Corre como tests de Vitest (`pnpm test`), que está en CI.
- Resultados F5.1: **Top-1 100% (30/30) · Top-3 100% (36/36) · 20/20 negativas
  rechazadas · 0 falsos positivos** sobre el corpus real de 8 componentes.
- Contrato de evaluación garantizado: el retriever nunca devuelve componentes
  que no estén en el corpus; los ejemplos del corpus son exactamente los
  canónicos (`*.examples.tsx`, test de integridad); `buildContext` es
  determinista y ordenado.

## 8. Estrategia de documentación (ADR-006)

Fuente única en la carpeta del componente (`docs.mdx`, `examples.tsx`, tipos) + tokens. Storybook = entorno de desarrollo; docs app (F4) = producto público; playground (F4) = aplicación de referencia. Reglas anti-duplicación: ejemplos solo en `*.examples.tsx` (importados por stories y docs app, y embebidos en la metadata JSON consumida por knowledge), props generadas de tipos, tablas de tokens generadas.

## 9. Componentes v1 y Definition of Done

| Fase | Componentes                |
| ---- | -------------------------- |
| F1   | Button · Input · FormField |
| F2   | Checkbox · Select          |
| F3   | Modal · Badge · Spinner    |

Estructura por componente (ej. Button): `Button.tsx` · `Button.types.ts` · `Button.module.css` · `Button.test.tsx` · `Button.stories.tsx` · `Button.docs.mdx` · `Button.examples.tsx` · `index.ts`.

**DoD** (cada componente antes de pasar al siguiente grupo):

- [ ] TypeScript estricto, sin `any`; API pública pequeña y documentada
- [ ] 0 literales de color/spacing/radius; solo tokens
- [ ] Responsive correcto (320–1440+) cuando aplique
- [ ] Keyboard completo, focus-visible visible, sin trampas de foco
- [ ] ARIA: patrón documentado y aplicado
- [ ] axe: 0 violaciones (unit + addon-a11y en CI)
- [ ] Unit tests (variantes, estados, eventos, a11y)
- [ ] Stories 1+ por variante/estado; interaction tests donde aplique
- [ ] `docs.mdx` (usage, API, variantes, a11y, cuándo usar/cuándo no)
- [ ] Ejemplos canónicos en `*.examples.tsx` (fuente única)
- [ ] Metadata generada y válida; indexada por knowledge
- [ ] CI verde (lint, typecheck, unit, build)

## 10. Playground (ADR-009)

Showcase de composición "Healthcare Patient Portal" con datos ficticios y disclaimer: 1 layout responsive + ≤4 páginas (Dashboard, Citas, Perfil, Estados). Cero lógica de dominio, cero componentes propios (solo DS + shell), registro de gaps → roadmap.

## 11. Roadmap y estado real (reconciliado)

Estado verificado contra la implementación (2026-08). F5.1, F6.1 y F7.1 son
**hardening/auditorías transversales** (no fases funcionales independientes);
cada una endureció con tests la fase que le precede.

| Fase   | Contenido                                                                                                         | Estado real                         | Done cuando                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| **F0** | Infra + tokens (79 primitivos · 18 semánticos · 0 component) + ADR-001..009 + README                              | ✅ 100%                             | CI verde; tokens validados; Storybook con toggle de tema                              |
| **F1** | Button, Input, FormField (DoD completo)                                                                           | ✅ 100%                             | 3 componentes con DoD                                                                 |
| **F2** | Checkbox, Select (combobox auditado)                                                                              | ✅ 100%                             | DoD; combobox auditado                                                                |
| **F3** | Modal, Badge, Spinner + metadata madura (8 JSON + index)                                                          | ✅ 100%                             | 8 componentes                                                                         |
| **F4** | `apps/docs` + `apps/playground` (copy-code, theme, gaps.md)                                                       | ✅ 100%                             | Playground funcional; Lighthouse ≥95 como **objetivo** (ver F6)                       |
| **F5** | `knowledge` + eval + tuning · `ai-core` · `ai-providers` (Mock + NVIDIA) · `apps/api` · UI del asistente          | ✅ 100% (validada con llamada real) | Ver abajo: decisiones resueltas (timeout, formato de eval) y diferida (rate limiting) |
| **F6** | Release & Quality: build de publicación, Changesets, release workflow, a11y manual, Lighthouse, polish            | ✅ 100% (release 0.1.1 vía OIDC)    | Ver "Release (F6) — completado" abajo                                                 |
| F5.1   | Hardening knowledge/retrieval: dataset 56 consultas, whitelist de props propias, robustez, integridad de examples | ✅ (transversal)                    | —                                                                                     |
| F6.1   | Hardening AI Core: gate 20 (escala absoluta), confidence, anti-hallucination programático, invariantes            | ✅ (transversal)                    | —                                                                                     |
| F7.1   | Hardening API + NvidiaProvider: matriz de entradas, secretos, provider A–Q, prompt injection, concurrencia        | ✅ (transversal)                    | —                                                                                     |

### F5 — cerrada (2026-08)

**Implementado (F5):**

- **UI del asistente** en `apps/docs` (`/assistant`): entrada de pregunta + respuesta + badge grounded + panel de fuentes exclusivamente desde `AIAnswer.retrieval.components` + refusal + errores amigables.
- **Consumo de `apps/api` por HTTP** desde la UI (`VITE_API_BASE_URL` en build, default `http://localhost:3001`) + **CORS** en apps/api (origen `*`, sin credenciales — API pública de docs).
- **Tests**: 12 unitarios (RTL + axe) y 4 E2E contra la API real con MockProvider (offline, sin API key).

**Validado con llamada REAL (2026-08-16):**

- **Proveedor real conectado y validado**: smoke test opt-in (`RUN_NVIDIA_SMOKE=1`) con llamada real a NVIDIA Build. Caso grounded ("¿Cómo uso Button?" → HTTP 200, confidence `high`, `referencedComponents: ["button"]`, spy que confirma **1 llamada al LLM**) y caso refusal ("Necesito un DatePicker" → HTTP 200, confidence `none`, refs `[]`, spy que confirma **0 llamadas al LLM**). Modelo validado: `deepseek-ai/deepseek-v4-flash-0731` (el ID sin sufijo devuelve HTTP 410 Gone en el catálogo actual). Endpoint: `https://integrate.api.nvidia.com/v1` (default en código). La API key vive solo en el entorno local (`~/.ods-ai/nvidia.env`, fuera del repo).

**Decisiones resueltas y pendientes (2026-08):**

- **Resuelto — timeout de producción**: default `NVIDIA_TIMEOUT_MS` = **60000**
  (latencia real observada 8.5–25.3 s; 30 s dejaba margen insuficiente).
  Sigue siendo configurable por entorno.
- **Resuelto — formato de la eval suite**: se valida el formato TS actual como
  definitivo (SPEC §7b lo documenta); no se migra a `questions.json` + hit@5.
- **Pendiente — rate limiting**: la SPEC original lo incluía; hoy **diferido**
  como decisión abierta (no implementado; ver `docs/api.md`).

### Release (F6) — completado (2026-08-16)

**Implementado en F6:**

1. **Build de publicación**: `@ods-ai/react` compila a dist (tsc + d.ts + CSS modules copiados) sin dependencias nuevas; `@ods-ai/tokens` genera dist ya validado. Tarballs inspeccionados (`npm pack --dry-run`): solo dist + package.json, sin tests/stories/docs/coverage/secretos.
2. **Versiones/metadata**: `@ods-ai/tokens` y `@ods-ai/react` en **0.1.0**, `private: false`, `license: MIT`, `publishConfig.access: public`; paquetes internos (knowledge/ai-core/ai-providers/api) siguen privados.
3. **Changesets**: configurado (`.changeset/config.json`, acceso público, ignore de paquetes internos); primer changeset consumido → CHANGELOG.md de 0.1.0 generado.
4. **Release workflow**: `.github/workflows/release.yml` (changesets/action — solo `workflow_dispatch`, un push a main nunca publica; publica mediante **npm Trusted Publishing/OIDC** con `permissions.id-token: write` y npm CLI >= 11.5.1, **sin secreto `NPM_TOKEN`**; CI normal sigue offline).
5. **a11y manual**: [docs/a11y-audit.md](a11y-audit.md) — 8 componentes, 0 FAIL, SR real NO VERIFICABLE.
6. **Lighthouse**: docs en producción → **performance 99 · accessibility 100 · best-practices 100 · seo 100** (≥95 cumplido; ver [docs/release.md](release.md)).
7. **E2E asistente**: grounded + Sources + confidence + refusal + **error HTTP** + axe (5 tests).
8. **Timeout NVIDIA**: default `NVIDIA_TIMEOUT_MS` → **60000** (latencia real 8.5–25.3 s).

**Publicación realizada (2026-08-16):**

1. `@ods-ai/tokens@0.1.0` y `@ods-ai/react@0.1.0`: **bootstrap publicado
   manualmente con 2FA** (histórico).
2. **Trusted Publisher** configurado en npmjs.com para ambos paquetes
   (`mgutbor` / `design-system-ai` / `release.yml`, sin environment) y
   `repository.url` añadido a los package.json.
3. `@ods-ai/tokens@0.1.1` y `@ods-ai/react@0.1.1`: **publicados vía GitHub
   Actions + npm Trusted Publishing (OIDC)** con **SLSA provenance** verificada
   (buildType workflow v1, repo `mgutbor/design-system-ai`, commit `2d1e04d`,
   workflow `release.yml`). El workflow fija npm a **major 11** (fix del
   TypeError de changesets con npm 12; ver `docs/release.md`).

**Pendiente:** rate limiting (diferido a deployment, decisión abierta).

### Opcionales / diferidos (no bloqueantes)

Streaming SSE · embeddings · vector DB · agentes · tools · memoria conversacional · PWA · visual regression · Husky/lint-staged · metadata freshness check · Docker · i18n.

## 12. Riesgos

1. Scope del playground → acotado por ADR-009 + gaps log.
2. Select/Modal (F2/F3): complejidad a11y → tiempo reservado, DoD como puerta.
3. Churn Storybook/Vite/React → majors pineadas, bumps controlados.
4. NVIDIA Build (gratuito, OpenAI-compatible) solo se necesita al final de F5 (Mock primero); el modelo es configuración, nunca parte de ai-core.
5. Colisión conceptual "ODS" → asumida; rebrand preparado hasta F6.
6. Límite solo-dev: 5 paquetes + 3 apps + Storybook root — sin 4º app ni 6º paquete sin revisión.
