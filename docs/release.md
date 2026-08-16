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
2. `.github/workflows/release.yml` (changesets/action) se ejecuta **solo
   manualmente** (`workflow_dispatch`): un push a `main` nunca publica.
   - Con changesets pendientes → crea/actualiza el PR **"Version Packages"**
     (versiona + changelog); al fusionarlo, el siguiente run publica.
   - Sin changesets pendientes → publica directamente (`changeset publish`).
3. La publicación usa **npm Trusted Publishing (OIDC)**: `npm publish` se
   autentica con el token OIDC de GitHub Actions (`permissions.id-token: write`)
   y **no requiere ningún secreto de npm** (NPM_TOKEN fuera del proceso).
   Requisitos: npm CLI >= 11.5.1 (paso explícito en el workflow), Node >= 22.14.0,
   y un Trusted Publisher configurado por paquete en npmjs.com
   (`mgutbor` / `design-system-ai` / workflow `release.yml`, sin environment).

Requisitos externos (acción manual, no automatizable localmente):

- Repositorio en GitHub con el workflow habilitado.
- Trusted Publisher configurado en npmjs.com para `@ods-ai/tokens` y
  `@ods-ai/react` (Settings → Trusted Publisher → GitHub Actions).
- `repository.url` en ambos package.json apuntando a
  `https://github.com/mgutbor/design-system-ai` (requisito de trusted publishing).

El CI normal (`ci.yml`) es independiente y **no publica nada**: usa
MockProvider y no depende de NVIDIA.

## 4. Checklist del release candidate

- [x] Git con commit inicial (F0–F5)
- [x] Build reproducible de `@ods-ai/tokens` y `@ods-ai/react` (dist)
- [x] Paquetes: 0.1.0, MIT, `publishConfig.access: public`
- [x] Tarballs inspeccionados (solo dist + package.json)
- [x] Changesets configurado + CHANGELOG 0.1.0
- [x] Release workflow preparado (manual + Trusted Publishing/OIDC)
- [x] a11y auditada
- [x] Lighthouse ≥95
- [x] E2E verdes (CI offline con MockProvider)
- [ ] **Publicar 0.1.0 manualmente** (ya realizado con 2FA) y **configurar
      Trusted Publisher** en npmjs.com para ambos paquetes
- [ ] **Primera prueba OIDC** (release 0.1.1 vía workflow_dispatch)
