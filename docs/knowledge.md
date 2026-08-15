# Knowledge Layer & Retrieval v1 (F5)

La capa de conocimiento convierte la metadata de componentes en un **corpus
recuperable** y ofrece un **retriever determinista** que puede probarse sin
ningún LLM. Es la base grounded del AI Assistant: `ai-core` (`answerQuestion`)
construye sus respuestas sobre lo que esta capa recupere, nunca sobre hechos
inventados.

```
packages/tokens
      ↓
packages/react ──► dist/metadata/index.json   (metadata generada, build-time)
      ↓
@ods-ai/knowledge ──► corpus (normalizado + filtrado)
      ↓
retriever (determinista, sin IA)
      ↓
buildContext(results) ──► contexto compacto para un futuro LLM
```

## 1. Arquitectura

| Archivo                               | Responsabilidad                                                                                                                                                                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types.ts`                        | Contratos públicos (KnowledgeDocument, ComponentKnowledge, ComponentProp, Example, RetrievalQuery, RetrievalResult, Retriever).                                                                                                                                   |
| `src/corpus/metadataInput.ts`         | Tipo de entrada estructural: el subconjunto de metadata cruda que knowledge consume. Local a propósito: importar `ComponentMetadata` de `@ods-ai/react` arrastraría todo el paquete react (con sus CSS modules) al grafo de tipos de un consumidor puro de datos. |
| `src/corpus/buildCorpus.ts`           | Normaliza metadata → corpus de retrieval. **Filtra props heredadas** (ver §2). Función pura y determinista.                                                                                                                                                       |
| `src/retriever/synonyms.ts`           | Mapa explícito de sinónimos (ver §4).                                                                                                                                                                                                                             |
| `src/retriever/retriever.ts`          | Scoring determinista + expansión de query + topK (ver §3).                                                                                                                                                                                                        |
| `src/context/buildContext.ts`         | Convierte resultados en contexto compacto para LLM (ver §5).                                                                                                                                                                                                      |
| `src/eval/dataset.ts` + `evaluate.ts` | Dataset de evaluación y métricas (ver §6).                                                                                                                                                                                                                        |
| `src/index.ts`                        | Corpus y retriever por defecto construidos desde el JSON real de metadata.                                                                                                                                                                                        |

El retriever **no depende de ningún proveedor de IA**: no hay embeddings,
vector DB, agentes ni frameworks RAG en F5. Todo el flujo `query → retrieval →
context` es lógica pura testeada.

## 2. Estrategia de filtrado de props (API propia vs heredada)

La metadata cruda de `react-docgen-typescript` mezcla la API propia de cada
componente con ~290 atributos HTML heredados (todos los `aria-*`, `data-*`,
cada handler DOM y atributos de estilo/identidad). La auditoría F5.1 exige que
**solo la API propia** aparezca como tal — p. ej. Button → `variant, size,
loading` y nada más.

Un denylist no puede clasificar atributos ambiguos de forma fiable (`title` es
atributo HTML global Y prop propia de Modal; `size` es heredado en
Input/Select pero propio en Button/Spinner). Por eso el corpus usa una
**whitelist explícita por componente** (`OWN_PROPS_BY_COMPONENT` en
`src/corpus/ownProps.ts`), derivada de los tipos públicos de cada componente
y **validada por tests contra el metadata JSON real** (si una prop propia
desapareciera del metadata generado, el test de integridad falla — la
whitelist no puede desincronizarse silenciosamente):

| Componente | API propia                                                                  |
| ---------- | --------------------------------------------------------------------------- |
| button     | variant, size, loading                                                      |
| input      | invalid                                                                     |
| checkbox   | invalid                                                                     |
| select     | invalid                                                                     |
| badge      | variant                                                                     |
| spinner    | size, label                                                                 |
| modal      | open, onClose, title, description, closeOnEscape, closeOnBackdrop, children |
| form-field | label, htmlFor, description, error, children                                |

Los atributos HTML heredados (disabled, required, placeholder, value, aria-_,
on_, className, …) **nunca** aparecen como API propia. Resultado: superficie
de API de **3–7 props por componente** (badge 3, button 3, checkbox 1, input
1, select 1, spinner 2, modal 7, form-field 5).

## 3. Scoring

Pesos deterministas (constante `WEIGHTS`), prioridad de señal:

| Señal                               | Peso | Justificación                                                                |
| ----------------------------------- | ---- | ---------------------------------------------------------------------------- |
| name (match exacto de slug)         | 100  | Un sinónimo ("botón" → button) resolviendo el nombre es la señal más fuerte. |
| name (slug contiene término)        | 60   | Coincidencia parcial de nombre.                                              |
| tag exacto                          | 30   | Categoría semántica (selection, form, status…).                              |
| variant exacto                      | 25   | "botón destructivo" resuelto por la variante destructive.                    |
| prop exacta (API propia)            | 20   | "campo inválido" matchea la prop `invalid`.                                  |
| token (tokensUsed contiene término) | 10   | "¿qué tokens usa X?"                                                         |
| description / a11ySummary contiene  | 5    | Señal débil, solo desempata.                                                 |
| example (título/descripción)        | 3    | La señal más débil.                                                          |

**Umbral mínimo absoluto: `MIN_RESULT_SCORE = 10`.** Señales débiles (un único
match de ejemplo, peso 3) no deben, por sí solas, sacar un componente a
superficie: devolver `[]` es mejor que un acierto especulativo. Matches de
tag/variant/prop (≥15) siempre pasan.

El resultado expone `{ component, score, matchedTerms, reasons }` — `reasons`
es la explicación humana de por qué se recuperó ("name 'button' matches
'botón'", "tag 'form' matches 'form'", …). Es la base de la transparencia del
futuro asistente.

Desempate: score descendente, y a igual score, orden alfabético de slug
(determinista).

## 4. Sinónimos

Mapa pequeño, explícito y normalizado (claves en minúsculas, sin acentos).
Dos formas:

- **Token único**: `dropdown → select`, `botón → button`, `campo → input`,
  `diálogo → modal`, `error → invalid`, `carga → loading`, …
- **Frase completa** (con significado propio): `"casilla de seleccion" →
checkbox`, `"campo de formulario" → form-field`, `"seleccionar una opcion" →
select`, `"indicador de carga" → spinner`, `"etiqueta de estado" → badge`.

Regla de expansión: si la **query completa normalizada** es una frase conocida,
expande a ese único objetivo (la frase no debe diluirse con sinónimos de
tokens sueltos). Si no, cada token (len ≥ 3) se conserva y se expande; un
sinónimo compuesto ("form-field") también aporta sus partes ("form", "field")
para que matcheen tags de componentes relacionados.

Nota de diseño: `primary` no es sinónimo de "principal" porque colisiona con
el token compartido `color.action.primary` y contamina resultados. Los
sinónimos se añaden **cuando hay un caso real**, no por completitud.

## 5. Context builder (`buildContext`)

Convierte los resultados del retriever en contexto compacto para un futuro
LLM. Incluye solo información útil para responder: identidad, descripción,
URL, variantes/sizes, **API propia** (props ya filtradas), tokens usados,
resumen de accesibilidad y ejemplos canónicos. **Nunca** incluye las ~300
props heredadas. Con cero resultados devuelve un mensaje explícito ("No
relevant documentation found") en lugar de un contexto vacío o inventado.

## 6. Evaluación (F5.1)

`src/eval/dataset.ts` contiene **56 casos** organizados por grupo:

| Grupo                               | Casos | Ejemplos                                                        |
| ----------------------------------- | ----- | --------------------------------------------------------------- |
| A) Consultas directas               | 8     | "cómo usar Button", "cómo usar FormField"                       |
| B) Consultas por intención          | 9     | "Necesito un botón para eliminar", "Quiero un dropdown"         |
| C) Consultas por API/prop           | 7     | "¿Qué componentes tienen invalid?", "¿Qué props acepta Button?" |
| D) Consultas de accesibilidad       | 4     | "¿Cómo se gestiona el foco en Modal?"                           |
| E) Consultas por tokens             | 3     | "¿Qué componente usa color.focus.ring?"                         |
| F) Consultas ambiguas               | 6     | "selección", "estado", "control de formulario"                  |
| G) Consultas negativas/irrelevantes | 19    | "Necesito una tabla", "Use DataGrid"                            |

`evaluateRetriever` mide, de forma determinista:

- **Precisión Top-1**: el esperado en primera posición (solo casos con
  respuesta única — 30 de 36 evaluables).
- **Precisión Top-3**: al menos un componente aceptado en el top-3.
- **Falsos positivos**: resultados fuera del conjunto aceptado, o resultados
  no vacíos en consultas que deben devolver `[]`.
- **Falsos negativos**: consultas respondibles donde ningún componente
  aceptado apareció en el top-3.
- **Negativas rechazadas**: consultas sin evidencia que devolvieron `[]`.

Resultado actual (F5.1): **Top-1 30/30 (100%) · Top-3 36/36 (100%) · 0
fallidas · 0 falsos negativos · 0 falsos positivos · 20/20 negativas
rechazadas**. Los casos ambiguos declaran explícitamente sus conjuntos
aceptados ("campo inválido" acepta checkbox/select porque también exponen la
prop `invalid` — resultado legítimo). La consulta "¿Qué componente funciona
con teclado?" devuelve `[]`: todos los controles nativos funcionan con
teclado, no hay evidencia de un componente único — el resultado honesto es
"sin evidencia suficiente".

## 7. Integridad y determinismo (F5.1)

- **Examples exactamente canónicos**: `src/integrity/examples.test.ts` lee los
  archivos `*.examples.tsx` reales y verifica que cada `code` del corpus
  existe **verbatim** en la fuente (normalizando el `\n` literal del string
  TSX), que cada id está declarado en la fuente (sin ejemplos inventados) y
  que el número de ejemplos coincide (sin duplicación). Ningún ejemplo es
  generado, reconstruido ni modificado durante el retrieval.
- **Robustez contra componentes inexistentes**: `src/integrity/robustness.test.ts`
  prueba que ningún resultado puede ser un componente fuera del corpus
  (la fuente de verdad es el corpus real generado desde metadata) y que
  "Use DataGrid/Toast/Card/Tabs/Avatar/DatePicker" devuelven `[]`.
- **buildContext determinista**: `buildContext` ordena por slug de componente
  antes de construir, por lo que es una función pura del **conjunto** de
  resultados: misma entrada → misma salida; reordenar la entrada no cambia el
  contenido lógico (verificado por test).
- El corpus es una función pura (`buildCorpus`), los sinónimos son un mapa
  estático y el scoring es aritmética sobre datos fijos: **la misma query
  siempre produce exactamente el mismo resultado**.

## 8. Limitaciones

- Sinónimos limitados al mapa explícito: "términos nuevos" requieren añadir
  una entrada con su caso de uso real y su test (regla F5.1: sin sobreajuste;
  cada sinónimo debe tener justificación semántica y al menos un caso).
- La API propia es una whitelist por componente (`OWN_PROPS_BY_COMPONENT`): si
  un componente futuro añade props propias, deben registrarse ahí (validado
  contra metadata por test, no puede desincronizarse en silencio).
- El matching es por tokens/contains, no por semántica: "botón pequeño" no
  matchea "size sm" salvo que "sm" aparezca en un campo indexado.
- El corpus se construye al importar el paquete desde el JSON de metadata:
  requiere que `packages/react` esté construido (turbo lo garantiza con
  `dependsOn: ["^build"]`).
- Consultas sin ancla de componente ("¿qué componente funciona con teclado?")
  devuelven `[]` por diseño: todos los controles nativos las cumplen y no
  existe evidencia de un componente único.

## 9. ¿Cuándo tendría sentido introducir embeddings?

El contrato `Retriever.search()` permite sustituir la implementación por una
basada en embeddings **sin tocar la API**. Tendría sentido cuando:

1. El corpus crezca a decenas de componentes + guidelines con lenguaje
   natural variado que los sinónimos no cubran.
2. Preguntas parafraseadas ("¿cómo hago que el usuario elija entre opciones?")
   fallen sistemáticamente en el matching por tokens.
3. Se necesite recuperación semántica entre tipos de documento (componentes,
   guidelines, tokens) que comparten vocabulario.

Para un Design System de 8 componentes con vocabulario cerrado, la búsqueda
estructurada + keyword es **más precisa y mantenible** que una vector DB: sin
infraestructura, sin pipeline de indexado, con explicabilidad total (`reasons`).
Los embeddings añadirían coste sin mejorar la precisión en este tamaño de
corpus.
