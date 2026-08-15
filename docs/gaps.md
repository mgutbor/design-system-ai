# Gaps del Design System — dogfooding (F4)

Este registro documenta los patrones que el playground (y la docs app)
necesitaron y que el Design System no cubre todavía. **La ausencia de un
componente también es información útil del dogfooding**: primero se intenta
composición con componentes existentes; un componente nuevo solo se propone
cuando la composición se repite o no expresa el patrón.

## 1. Card (contenedor destacado)

- **Página**: Dashboard (stats, próxima cita), Estados (paneles), docs (Home, índice de componentes).
- **Patrón**: contenedor con borde/radius/fondo para agrupar contenido.
- **Componentes evaluados**: `Badge` (no es contenedor), `Modal` (solo overlay), `FormField` (solo campos).
- **Por qué no basta**: no existe un contenedor visual neutro; el playground repite `div + border + surface.elevated + radius` en al menos 5 lugares, y la docs app también.
- **Posible solución**: componer una clase de "panel" compartida o crear `Card` cuando haya **2+ consumidores** (ya los hay: playground + docs).
- **Decisión**: **composición en F4** (CSS de página). Candidato a componente nuevo en F5+ (regla de los 2 consumidores, ADR-003).

## 2. StatBlock (número + etiqueta)

- **Página**: Dashboard (resumen de citas).
- **Patrón**: valor numérico destacado + etiqueta descriptiva.
- **Componentes evaluados**: `Badge` (píldora de estado, no es bloque numérico).
- **Por qué no basta**: el Badge no expresa métricas; el bloque es markup de página.
- **Posible solución**: componente `Stat`/`StatGroup` o composición documentada.
- **Decisión**: **composición en F4**. Candidato futuro con un segundo caso real.

## 3. EmptyState (estado vacío)

- **Página**: Estados, lista de citas filtrada sin resultados.
- **Patrón**: mensaje + acción cuando una lista no tiene datos.
- **Componentes evaluados**: `Badge` (neutral), `Spinner` (carga, no vacío), `FormField` error (no es un estado de lista).
- **Por qué no basta**: el estado vacío necesita composición (texto + icono opcional + acción) que hoy se repite manualmente.
- **Posible solución**: componente `EmptyState` o patrón de composición documentado en las guidelines.
- **Decisión**: **composición en F4**. Candidato futuro.

## 4. Avatar (identidad visual)

- **Página**: Perfil del paciente.
- **Patrón**: identificación visual del paciente.
- **Componentes evaluados**: ninguno cubre identidad visual.
- **Por qué no basta**: ausente **a propósito** (scope control de F4: no Avatar). El perfil muestra identidad textual.
- **Posible solución**: componente `Avatar` (iniciales + fondo) cuando un caso real lo pida.
- **Decisión**: **gap registrado, no implementado**. Candidato futuro.

## 5. PageHeader (bloque de título de página)

- **Página**: las 4 páginas del playground y las páginas de docs.
- **Patrón**: h1 + descripción secundaria al inicio de cada página.
- **Componentes evaluados**: `Badge` (no aplica), composición `h1 + p.muted`.
- **Por qué no basta**: es un patrón repetido en cada página (8+ usos) con markup idéntico.
- **Posible solución**: componente `PageHeader` o patrón de composición en guidelines.
- **Decisión**: **composición en F4** (CSS compartido). Candidato futuro con 2 consumidores reales.

## 6. StatusIndicator (mapeo estado → Badge)

- **Página**: Citas (estados confirmada/pendiente/cancelada).
- **Patrón**: traducir un estado de dominio a un Badge con variante y texto.
- **Componentes evaluados**: `Badge` (base correcta), `color.status.*` (tokens correctos).
- **Por qué no basta**: el mapeo es lógica de presentación del consumidor (correcto); no requiere componente del DS.
- **Posible solución**: mantener en el consumidor; documentar el patrón.
- **Decisión**: **composición correcta en F4** — no es un gap del DS, es uso correcto del API.
