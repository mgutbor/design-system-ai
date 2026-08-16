# Release & Quality (F6)

Documentación del estado de release del proyecto (2026-08-16). Solo
`@ods-ai/tokens` y `@ods-ai/react` se publican; los paquetes internos
(`knowledge`, `ai-core`, `ai-providers`, `api`) permanecen privados.

## 1. Medición Lighthouse — apps/docs (build de producción)

Ejecutado contra el build estático de `apps/docs` (servido con gzip y
cache headers, como un host de producción).

| Categoría      | Score   | Objetivo |
| -------------- | ------- | -------- |
| Performance    | **99**  | ≥95 ✅   |
| Accessibility  | **100** | ≥95 ✅   |
| Best Practices | **100** | ≥95 ✅   |
| SEO            | **100** | ≥95 ✅   |

Notas:

- Con un servidor estático mínimo (python `http.server`, sin compresión ni
  caché) el performance baja a ~94: es un **artefacto del servidor de
  medición**, no del código (la app tiene CLS 0 y TBT 0). Cualquier host de
  producción aplica gzip/brotli y cache headers.
- Comando de medición (servidor + lighthouse en el mismo proceso):

```bash
pnpm build:docs
node /tmp/static-server.mjs apps/docs/dist 4175 &
CHROME_PATH=".../Google Chrome" pnpm dlx lighthouse@12 http://127.0.0.1:4175/ \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --only-categories=performance,accessibility,best-practices,seo --output=json
```

- No se automatiza en CI (inestable localmente con Chrome 151 + localhost);
  queda como **validación de release documentada**.

## 2. Accesibilidad

Auditoría manual WCAG 2.2 AA de los 8 componentes: [docs/a11y-audit.md](a11y-audit.md)
— 0 FAIL; la interacción con lectores de pantalla reales es NO VERIFICABLE en
este entorno.

## 3. Flujo de release (Changesets)

1. Los cambios de `@ods-ai/tokens` y `@ods-ai/react` se documentan con un
   changeset (`pnpm exec changeset`).
2. Al hacer push a `main`, `.github/workflows/release.yml` (changesets/action)
   crea/actualiza el PR **"Version Packages"** (versiona + changelog).
3. Al fusionar el PR, el workflow publica en npm (`changeset publish`).

Requisitos externos (acción manual, no automatizable localmente):

- Repositorio en GitHub con el workflow habilitado.
- GitHub Secret `NPM_TOKEN` (token de npm con permiso de publicación).
- (Opcional) URL del repo en `repository`/`homepage` de los package.json.

El CI normal (`ci.yml`) es independiente y **no publica nada**: usa
MockProvider y no depende de NVIDIA.

## 4. Checklist del release candidate

- [x] Git con commit inicial (F0–F5)
- [x] Build reproducible de `@ods-ai/tokens` y `@ods-ai/react` (dist)
- [x] Paquetes: 0.1.0, MIT, `publishConfig.access: public`
- [x] Tarballs inspeccionados (solo dist + package.json)
- [x] Changesets configurado + CHANGELOG 0.1.0
- [x] Release workflow preparado
- [x] a11y auditada
- [x] Lighthouse ≥95
- [x] E2E verdes (CI offline con MockProvider)
- [ ] **Publicar** (requiere tu acción: GitHub + `NPM_TOKEN`)
