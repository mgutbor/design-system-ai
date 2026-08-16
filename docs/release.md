# Release — procedimiento oficial de publicación

Fuente de verdad del proceso de release. Solo `@ods-ai/tokens` y `@ods-ai/react`
se publican; los paquetes internos (`knowledge`, `ai-core`, `ai-providers`,
`api`) son privados y quedan fuera del proceso.

## 1. Estado actual (2026-08-16)

- `@ods-ai/tokens@0.1.1` y `@ods-ai/react@0.1.1`: **publicados** mediante
  GitHub Actions + **npm Trusted Publishing (OIDC)**, con **SLSA provenance**
  verificada (buildType workflow v1 de GitHub Actions, repo
  `mgutbor/design-system-ai`, commit `2d1e04d`, workflow `release.yml`).
- `@ods-ai/tokens@0.1.0` y `@ods-ai/react@0.1.0`: publicado **manualmente con
  2FA** como bootstrap inicial (histórico; ya no forma parte del proceso).

## 2. Flujo oficial de release

```
Desarrollo
  ↓ 1. crear changeset (pnpm exec changeset)
push a main            ← NO publica: solo ejecuta CI (validación)
  ↓ 2. GitHub Actions → Release (manual, workflow_dispatch)
1er Run workflow       ← con changesets pendientes
  ↓ changesets/action ejecuta changeset version
PR "Version Packages"  ← bump de versiones + CHANGELOG (NO publica nada)
  ↓ 3. merge del PR en main
2º Run workflow        ← sin changesets pendientes
  ↓ changesets/action ejecuta changeset publish
changeset publish → npm Trusted Publishing (OIDC) → npm publish → SLSA provenance
```

## 3. Reglas fundamentales

- `release.yml` se ejecuta **solo manualmente** (`workflow_dispatch`). **Un
  push a `main` nunca publica**: solo dispara `ci.yml`, que valida
  (format/lint/typecheck/test/build/validate/storybook/e2e) sin publicar nada.
- La publicación usa **npm Trusted Publishing (OIDC)**: `npm publish` se
  autentica con el token OIDC de GitHub Actions (`permissions.id-token: write`)
  intercambiado por npm. **NPM_TOKEN no participa** en el proceso; no hay
  secretos de npm en el repositorio.

## 4. Cómo crear un changeset

```bash
pnpm exec changeset
```

Selecciona `@ods-ai/tokens` y/o `@ods-ai/react`, el nivel (`patch` para fixes,
`minor` para features) y una descripción breve. Genera un archivo en
`.changeset/`, por ejemplo:

```md
---
'@ods-ai/tokens': patch
'@ods-ai/react': patch
---

Descripción breve del cambio.
```

Commit + push. Verifica que el changeset es válido:

```bash
pnpm exec changeset status
```

## 5. Cuándo ejecutar Release

GitHub → Actions → **Release** → **Run workflow**. Solo cuando haya algo que
publicar (changesets pendientes o versiones todavía no publicadas).

**Qué ocurre en el 1er Run** (con changesets pendientes):
`changesets/action` ejecuta `changeset version` → bump de versiones +
CHANGELOG → push a la rama `changeset-release/main` → crea/actualiza el PR
**"Version Packages"**. **No publica nada.**

**Qué ocurre después de fusionar el PR**: `main` queda con las versiones
nuevas y **0 changesets pendientes**; el 2º Run ya no versiona, solo publica.

**Qué ocurre en el 2º Run** (sin changesets pendientes):
`changesets/action` ejecuta `changeset publish` → publica en npm únicamente las
versiones que no existen en el registry (idempotente: las ya publicadas se
omiten).

> Nota: con 0 changesets desde el inicio (p. ej. la primera publicación), un
> único Run publica directamente.

## 6. npm Trusted Publishing (OIDC)

- El workflow declara `permissions.id-token: write`; npm intercambia el token
  OIDC de GitHub Actions por un token corto firmado dirigido a
  `registry.npmjs.org`.
- Requisitos:
  - **npm CLI ≥ 11.5.1** → el workflow fija `npm install -g npm@11`.
  - **Node ≥ 22.14.0** (setup-node con `node-version: 22`).
  - **Trusted Publisher** configurado por paquete en npmjs.com: User
    `mgutbor` · Repository `design-system-ai` · Workflow `release.yml` ·
    sin Environment.
  - `repository.url` en los package.json apuntando exactamente a
    `https://github.com/mgutbor/design-system-ai`.
- **Provenance**: npm genera automáticamente una attestation SLSA
  (`predicateType: https://slsa.dev/provenance/v1`) cuyo payload identifica el
  build de GitHub Actions, el repositorio y el commit (ver §9).

## 7. Por qué npm@11 y no npm@latest

`npm@latest` instala npm 12, cuyo `info --json` emite un **array** en lugar de
un objeto. `@changesets/cli` 3.0.0 espera un objeto → falla en
`getUnpublishedPackages` con
`TypeError: Cannot read properties of undefined (reading 'includes')` (issue
upstream changesets/changesets#2164). Por eso el workflow fija `npm@11`
(resuelve a la última 11.x): cumple trusted publishing (≥ 11.5.1) y emite el
formato que changesets espera. **No vuelvas a `npm@latest` sin verificar la
compatibilidad antes.**

## 8. Qué hacer si el workflow falla

1. Revisa en los logs el paso **"Create Release Pull Request or Publish to
   npm"** y el paso **"Show publish result"** (outputs `published`,
   `publishedPackages`, `hasChangesets`).
2. **Fallo en el 1er Run**: suele ser el PR no creado (p. ej. el ajuste de
   GitHub "Allow GitHub Actions to create and approve pull requests"
   desactivado) o un error de versionado.
3. **Fallo en el 2º Run**: revisa el error de `changeset publish` (caso
   conocido: npm 12, ver §7).
4. Verifica siempre el estado real con `npm view` (ver §9) antes de reintentar:
   el publish es idempotente y re-ejecutar el workflow es seguro.

## 9. Cómo verificar una publicación

```bash
npm view @ods-ai/tokens version                # → 0.1.1
npm view @ods-ai/react version                 # → 0.1.1
npm view @ods-ai/tokens@0.1.1                  # metadata (published by GitHub Actions <npm-oidc-no-reply@github.com>)
npm view @ods-ai/tokens@0.1.1 dist.attestations --json   # provenance SLSA v1
```

- **Provenance / attestation**: `dist.attestations.provenance.predicateType`
  debe ser `https://slsa.dev/provenance/v1`; el payload del endpoint de
  attestations debe mostrar el buildType workflow v1 de GitHub Actions, el
  repositorio y el commit.
- **Logs de GitHub Actions**: el paso "Show publish result" muestra
  `published: true` y los paquetes publicados.
- **Tags de Git**: `changesets/action` no crea tags salvo que se active
  `createGithubReleases` (no está activado); su ausencia es normal.

## 10. Validaciones de release realizadas (F6)

- **Lighthouse** (apps/docs en producción): performance 99 · accessibility 100
  · best-practices 100 · seo 100 (objetivo ≥95 cumplido).
- **a11y WCAG 2.2 AA**: [docs/a11y-audit.md](a11y-audit.md) — 0 FAIL; el
  lector de pantalla real es NO VERIFICABLE.
- **E2E asistente**: grounded + sources + confidence + refusal + error HTTP +
  axe (CI offline con MockProvider).

## 11. Checklist (estado 2026-08-16)

- [x] Build reproducible de `@ods-ai/tokens` y `@ods-ai/react` (dist)
- [x] Paquetes públicos: `publishConfig.access: public`, MIT, versión 0.1.x
- [x] Changesets configurado (acceso público, ignore de paquetes internos)
- [x] Release workflow manual (`workflow_dispatch`) + Trusted Publishing/OIDC
- [x] npm fijado a major 11 (fix del TypeError de changesets con npm 12)
- [x] `@ods-ai/tokens@0.1.0` y `@ods-ai/react@0.1.0` publicados (bootstrap 2FA, histórico)
- [x] Trusted Publisher configurado para ambos paquetes
- [x] `repository.url` en ambos package.json
- [x] `@ods-ai/tokens@0.1.1` y `@ods-ai/react@0.1.1` publicados vía OIDC con SLSA provenance
- [x] a11y auditada · Lighthouse ≥95 · E2E verdes
