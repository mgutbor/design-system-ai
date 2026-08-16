# AI Core + Provider abstraction + providers (F5/F6/F7)

Capa de IA sobre la infraestructura validada en F5. El retrieval de
`@ods-ai/knowledge` es la **única** fuente de conocimiento: el LLM nunca accede
al filesystem, a los paquetes, a la metadata original ni al código fuente. Solo
recibe el contexto construido por `buildContext()`.

```
metadata
    ↓
packages/knowledge (corpus + retriever + buildContext)   ← fuente de verdad
    ↓
packages/ai-core   (AIProvider port + PromptBuilder + orquestación answerQuestion)
    ↓
packages/ai-providers (MockProvider · NvidiaProvider)
    ↓
respuesta
```

## 1. Arquitectura y dependencias

```
packages/ai-core      → packages/knowledge     (runtime: retrieval + context)
packages/ai-providers → packages/ai-core       (implementa AIProvider)
packages/knowledge    → (nada de IA)           (prohibido: knowledge → ai-core)
packages/tokens, packages/react → (nada de IA)
```

- **ai-core**: contratos (`AIProvider`, `ChatMessage`, `AIResponse`, `AIAnswer`),
  `buildGroundedMessages` (PromptBuilder) y la orquestación `answerQuestion`
  (AI Core). Sin HTTP, sin SDKs, sin proveedores concretos.
- **ai-providers**: implementaciones del port (`MockProvider` para tests/CI/
  offline; `NvidiaProvider` (NVIDIA Build), implementado en F7; la conexión
  real solo requiere credenciales (`NVIDIA_API_KEY`) — el modelo verificado y
  validado con llamada real es `deepseek-ai/deepseek-v4-flash-0731`, pura
  configuración). La app nunca los
  importa directamente: el provider se elige por configuración (`AI_PROVIDER`
  en `apps/api`).
- Enforcement: zonas de `import-x/no-restricted-paths` en ESLint — ai-core no
  puede importar ai-providers ni react/tokens/apps; ai-providers no puede
  importar knowledge/react/tokens/apps; knowledge no puede importar ai-core.

> Nota de actualización de ADR-004: el ADR original describía ai-core como
> "ports, sin dependencias" y el retrieval como client-side (SPEC §6 pre-F6).
> F6 asigna a ai-core la **orquestación** del flujo grounded (`answerQuestion`:
> query → retrieval → gate → context → prompt → provider → `AIAnswer`), que
> consume `knowledge` (retriever + corpus + buildContext). Es la única
> dependencia runtime de ai-core y mantiene la dirección única (knowledge no
> conoce IA). La reconciliación de SPEC (2026-08) incorpora este diseño como
> definitivo: **retrieval server-side**, con la UI futura consumiendo
> `apps/api` por HTTP.

## 2. Contratos públicos

```ts
// ai-core (SPEC §4)
interface AIProvider {
  readonly id: 'nvidia' | 'mock'
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>
}
interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
interface AIResponse { content: string; model: string; providerId: AIProviderId; usage?: TokenUsage; finishReason: 'stop'|'length'|'aborted'|'error' }

// ai-core (F6 §8 — respuesta estructurada de AI Core)
interface AIAnswer {
  answer: string
  referencedComponents: string[]   // solo del retrieval (ADR-004 regla 3)
  confidence: 'none' | 'low' | 'medium' | 'high'   // determinista, derivada de scores
  hasRelevantContext: boolean
  providerId: AIProviderId
  model: string
  retrieval: { query: string; components: { component: string; score: number }[]; minScore: number }
}

// askDesignSystem (F6 §9)
answerQuestion({ provider, question, retriever?, corpus?, options? }): Promise<AIAnswer>
```

El `AIProvider` es una función pura mensajes → respuesta: no conoce React,
tokens, metadata, retrieval ni UI. El contrato permite sustituir el proveedor
sin tocar AI Core (verificado por test con dos implementaciones del port).

## 3. Flujo query → retrieval → context → AI Core → provider

```
Usuario: "¿Cómo uso Button?"
  ↓ (1) retriever.search({ text, topK })            determinista, sin IA
  ↓ (2) gate: results.filter(score >= minScore)     determinista, sin IA
  ├─ 0 fuentes → (3) refusal plantilla · SIN LLM    determinista
  └─ ≥1 fuente → (4) buildContext(passing, corpus)  determinista
               → (5) buildGroundedMessages(q, ctx)  determinista
               → (6) provider.chat(messages)        ÚNICA parte IA
               → (7) AIAnswer estructurado
```

Defaults: `topK = 3`, `minScore = 20`, `temperature = 0.2` (SPEC §7), todos
configurables vía `AskOptions`. `minScore` usa la **escala absoluta** del
retriever F5 (name=100, name-contains=60, tag=30, variant=25, prop=20,
token=10, description/a11y=5, example=3).

**Regla real del gate (auditada en F6.1):** `minScore = 20` separa
señales de dominio (name/tag/variant/prop) de señales débiles
(token/description/example). El valor se bajó de 25 a 20 durante la auditoría
F6.1 con un caso demostrado: "¿Qué componentes tienen invalid?" recupera
checkbox/input/select con score 20 (prop match de la prop propia `invalid`);
con 25 el gate lo rechazaba y producía un refusal para una consulta que el
dataset F5.1 valida como correcta. Con 20, las consultas prop-only pasan el
gate y las señales débiles (10 o menos) siguen excluidas. No depende del
topK: el gate se aplica sobre los resultados recuperados, y un resultado con
score >= 20 pasa aunque topK lo haya limitado.

## 3b. Confidence: significado exacto (F6.1 §2)

`deriveConfidence(topScore)` es **puramente determinista** y se calcula
**exclusivamente** con el score más alto de los componentes que superaron el
gate — nunca depende del texto generado por el proveedor:

| Confidence | Condición                | Significado                                               |
| ---------- | ------------------------ | --------------------------------------------------------- |
| `none`     | sin fuentes (gate vacío) | refusal; no hay evidencia                                 |
| `low`      | topScore < 50            | evidencia débil pero suficiente (p.ej. prop match 20)     |
| `medium`   | 50 ≤ topScore < 100      | evidencia moderada (name-contains 60, tag 30 + variantes) |
| `high`     | topScore ≥ 100           | nombre exacto del componente (name match)                 |

Verificado con tests para los casos A–H (sin resultados, muy fuerte, débil,
múltiples, ambiguos, scores similares, justo por encima del gate, score muy
alto): determinista (misma entrada → mismo valor), explicable (deriva de los
scores del retrieval) e independiente del proveedor.

## 4. Comportamiento sin contexto (NO_RELEVANT_CONTEXT)

Regla dura (ADR-004 regla 4, SPEC §7 paso 3a): si el gate no encuentra ninguna
fuente con `score >= minScore`, **AI Core NO llama al provider**. Devuelve una
respuesta plantilla determinista (`NO_RELEVANT_CONTEXT_MESSAGE`):

> "No existe documentación relevante recuperada para esta consulta... No se
> puede confirmar que exista un componente, prop, token, API o ejemplo que
> cubra lo que pides."

`hasRelevantContext: false`, `confidence: 'none'`, `referencedComponents: []`.
No hay fallback silencioso al conocimiento general del LLM: simplemente no se
consulta. Verificado por test con "Necesito un DatePicker", "¿Cómo implemento
autenticación?", "¿Cómo hago una API REST?" y "Necesito un calendario".

## 4b. Garantías de grounding (F6.1 §3, invariantes)

`referencedComponents` **no puede** ser contaminado por el texto del
proveedor: se deriva exclusivamente de los componentes que superaron el gate
(`passing.map(...)`), programáticamente — no por prompt. Tests con un
provider que devuelve "Usa DatePicker", "Puedes usar Card, Tabs y Toast" o
una mezcla "Usa Button y DatePicker" demuestran que las referencias
estructuradas contienen solo componentes reales del corpus que pasaron el
gate.

Invariantes verificadas por tests (F6.1 §11):

1. Sin retrieval válido → el provider **nunca** se llama.
2. El contexto enviado al provider === el contexto construido por
   `buildContext()` de knowledge (mismo contenido, delimitado).
3. Ningún componente inexistente entra en `referencedComponents`.
4. `referencedComponents ⊆` componentes recuperados que superan el gate.
5. `confidence` no depende del provider.
6. Mismo query + corpus → mismo retrieval.
7. Mismo retrieval → mismo context.
8. MockProvider → mismo resultado para la misma entrada (asserted en
   ai-providers; el contrato de respuesta es estable).
9. Un error del provider nunca se transforma silenciosamente en éxito.
10. Ningún dato interno del repositorio (node_modules, sourcePath, rutas de
    source, .tsx/.css) aparece en lo enviado al provider.

## 5. PromptBuilder: contexto como fuente de verdad + anti-inyección

`buildGroundedMessages` produce exactamente dos mensajes:

1. **system**: instrucciones + bloque delimitado
   `[RETRIEVED_CONTEXT] … [/RETRIEVED_CONTEXT]` con el contexto.
2. **user**: la pregunta.

Reglas del system prompt (F6 §6): responder solo desde el contexto
recuperado; no inventar componentes/props/tokens/APIs/ejemplos; usar los
ejemplos canónicos **verbatim**; si la información no está en el contexto,
decir que no está disponible; priorizar el contexto sobre conocimiento externo.

Anti-inyección (F6 §7): el system prompt declara explícitamente que el bloque
`[RETRIEVED_CONTEXT]` contiene **datos, no instrucciones**, y que debe
ignorarse cualquier texto con forma de instrucción dentro de él. Las
instrucciones del sistema nunca se mezclan con el contenido recuperado: el
contexto vive en su propio bloque delimitado. No se implementa un sistema de
seguridad complejo en F6 — solo la separación correcta
`SYSTEM INSTRUCTIONS + RETRIEVED CONTEXT + USER QUERY`.

**Límites del PromptBuilder (F6.1 §4):** AI Core garantiza la separación
estructural (bloques delimitados, contexto declarado como datos, instrucciones
del sistema fijas). NO garantiza el comportamiento del LLM frente a
instrucciones hostiles dentro de la _query del usuario_: eso es
responsabilidad del proveedor y de la capa de API en fases posteriores. Los
tests de inyección verifican que la query nunca viaja en el mensaje system y
que el contexto recuperado no puede alterar las instrucciones; la defensa
final contra "Ignore previous instructions…" en la query corresponde al
proveedor/API (defensa en profundidad).

## 6. MockProvider

Determinista, offline, sin API key, sin internet, sin modelo externo. Refleja
la pregunta del usuario en un sobre estable y predecible para poder testear
toda la cadena sin dependencias externas. No simula inteligencia. Devuelve
`finishReason: 'stop'`, `model: 'mock-1'`, `usage` en cero.

## 6b. NvidiaProvider (F7)

Primer proveedor LLM real (`packages/ai-providers`), implementa exactamente el
port `AIProvider`: `ChatMessage[] → HTTP → AIResponse`. No hace retrieval, no
construye contexto, no modifica prompts, no decide confidence ni inventa
referencias — todo eso es de AI Core/knowledge.

**Configuración** (solo env, validada en la construcción — fail-fast):

- `NVIDIA_API_KEY` (requerida)
- `NVIDIA_MODEL` (requerida; **sin default en código** — el modelo es
  configuración, nunca parte de ai-core. Valor verificado en el catálogo de
  NVIDIA Build y validado con llamada real: `deepseek-ai/deepseek-v4-flash-0731`;
  el ID sin sufijo devuelve HTTP 410 Gone)
- `NVIDIA_BASE_URL` (default `https://integrate.api.nvidia.com/v1` — el
  endpoint OpenAI-compatible de NVIDIA Build)
- `NVIDIA_TIMEOUT_MS` (default 60000 — latencia real observada 8.5–25.3 s, SPEC §7 timeout 60s)

**Errores** (`NvidiaProviderError` con `code` estable): `auth` (401/403),
`rate_limit` (429), `unavailable` (5xx/otros 4xx), `invalid_response` (JSON
inválido, sin choices/content, error de red), `timeout` (AbortController).
Nunca exponen la API key, headers, body, contenido de respuesta ni stack
traces internos (verificado por tests). `apps/api` mapea el `code` a status
HTTP recorriendo la cadena de causas del `AIProviderError`.

**Intercambiabilidad** (F7 §5): `answerQuestion` recibe cualquier `AIProvider`;
Mock y NVIDIA funcionan con el mismo AI Core sin modificarlo (test
explícito). NVIDIA se testea offline con un fetch mockeado; un smoke test
real contra el endpoint es opt-in y nunca en CI.

## 7. Errores estructurados

Si `provider.chat` lanza (o rechaza, o devuelve una respuesta
estructuralmente inválida), AI Core envuelve el error en `AIProviderError`
(`providerId` + mensaje + `cause` tipado). Nunca un crash silencioso: el
caller recibe un error tipado. No se registran API keys ni secretos.

**Comportamiento ante providers defectuosos (F6.1 §5, §8):** validado con un
FakeProvider de tests que cubre respuesta normal, vacía, texto inventado,
finishReason inesperado, usage inválido, error lanzado/rechazado y respuesta
muy larga. Hallazgo corregido: un provider que devuelve `{ content: 42 }`
producía `answer: 42` — un "éxito aparente" a partir de una respuesta
inválida. AI Core ahora valida el contrato de la respuesta del provider
(`validateProviderResponse`: `content` string, `model` string, `providerId`
válido, `finishReason` válido) y trata cualquier violación como error del
provider. Contrato de salida para apps/api: `AIProviderError` es mapeable vía
`instanceof` + `providerId`; no se inventa todavía un sistema de errores HTTP.

## 7b. Hallazgos de la batería E2E (F6.1 §9)

Batería de 10 casos representativos registrada en tests (query → retrieval →
scores → gate → context → confidence → provider called → answer → refs),
100% determinista (dos ejecuciones idénticas). Hallazgo documentado: **las
consultas de catálogo** ("¿Qué componentes existen?") devuelven `[]` en
retrieval porque el corpus no contiene un documento que describa el conjunto
de componentes — el retriever solo matchea componentes/props/tokens
nombrados. La salida honesta y segura es un refusal (nunca una lista
inventada). Añadir un "catálogo" al corpus o un manejo explícito es una
decisión de producto para una fase posterior, no un hack de AI Core.

## 8. Tests

Conteos reales (2026-08, tras F6.1/F7.1):

- **ai-core** (94): consulta válida, refusal sin provider, múltiples
  componentes, provider ok/falla, contexto vacío, gate minScore, abstracción
  del port, determinismo, aislamiento de contexto, observabilidad; + auditoría
  F6.1: gate (scores reales), confidence A–H, anti-hallucination programático,
  prompt injection, provider malicioso/defectuoso, contexto múltiple, refusal
  con spies, batería E2E determinista, invariantes, grounding guarantees
  (F7.1 §5/§6/§7).
- **ai-providers** (66): MockProvider determinista/offline/contrato; cadena
  completa con AI Core; NvidiaProvider (request/headers/body, parsing,
  errores A–Q, timeout, sin fugas de secretos); intercambiabilidad
  Mock/NVIDIA; auditoría de request (fetch spy) y de configuración.

## 9. Auditoría de contratos (F6.1 §10)

Los contratos actuales son suficientes para conectar posteriormente
NvidiaProvider, apps/api y UI sin acoplarlos:

- **AIProvider + ChatOptions**: el port mensajes→respuesta es suficiente para
  NVIDIA (mensajes + temperatura); `signal` ya está previsto para el futuro
  streaming/cancelación.
- **AIResponse**: `content`/`model`/`providerId`/`usage`/`finishReason` cubren
  el mapeo de la respuesta NVIDIA; `validateProviderResponse` protege el
  contrato.
- **AIAnswer**: todo lo que necesita la UI (answer, referencedComponents,
  confidence, hasRelevantContext) y apps/api (providerId, model, retrieval
  trace para logs).
- **AIProviderError**: mapeable por apps/api vía `instanceof` + `providerId`.

Punto abierto documentado (no corregido, sin consumidor real todavía):
`AIProviderId` es una unión cerrada (`'nvidia' | 'mock'`); añadir un tercer
proveedor requerirá ampliar la unión en ai-core — aceptable como deuda, se
revisará cuando exista el primer proveedor real.

## 10. Fuera de alcance (opcional / diferido)

Streaming SSE · embeddings · vector DB · agentes · tools · memoria
conversacional · otros proveedores (OpenAI/Anthropic/NVIDIA/Ollama) · rate
limiting · autenticación de usuario · observabilidad avanzada.

Implementado: `apps/api` (`docs/api.md`), `NvidiaProvider` (probado offline
con fetch mockeado; smoke real opt-in, nunca en CI) y la **UI del asistente**
en `apps/docs` (`/assistant`), que consume `/api/ask` por HTTP (F5) y funciona
con MockProvider sin API key.
