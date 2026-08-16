# Open Design System AI

Un design system open source con documentación viva y un AI Assistant que responde **solo** con la documentación real del sistema.

Proyecto de portfolio de arquitectura frontend: monorepo pnpm + Turborepo, design tokens framework-agnósticos, componentes React accesibles (WCAG 2.2 AA), testing (Vitest + RTL + Playwright), Storybook, CI/CD con GitHub Actions y una capa de IA desacoplada del proveedor (NVIDIA Build — gratuito y OpenAI-compatible —, modelo configurable, MockProvider para tests, retrieval determinista).

> **Estado real**: F0–F6 **completas** (infraestructura, tokens, 8 componentes con DoD, apps/docs, apps/playground, knowledge + AI Core + Mock/NVIDIA + apps/api + UI del asistente + release). `@ods-ai/tokens@0.1.1` y `@ods-ai/react@0.1.1` **publicados en npm** mediante GitHub Actions + **Trusted Publishing (OIDC)** con SLSA provenance (bootstrap 0.1.0 manual con 2FA, histórico). F5.1/F6.1/F7.1 fueron auditorías de hardening, no fases funcionales. Detalle en [docs/SPEC.md §11](docs/SPEC.md) y [docs/release.md](docs/release.md).

## Documentación

- [Especificación arquitectónica (SPEC v3)](docs/SPEC.md)
- [Decisiones de arquitectura (ADRs)](docs/adr/)
- [Capa de conocimiento/retrieval](docs/knowledge.md)
- [AI Core + providers](docs/ai-core.md)
- [API HTTP](docs/api.md)

## Estructura

```
apps/            # docs (F4 + asistente F5) · playground (F4) · api (F5, POST /api/ask)
packages/        # tokens (F0) · react (F1–F3, 8 componentes) · knowledge/ai-core/ai-providers (F5)
e2e/             # Playwright (smoke F0 + flujos docs/playground/modal)
docs/            # SPEC + ADRs + knowledge/ai-core/api
docs/gaps.md     # gaps del DS detectados por dogfooding (F4)
.storybook/      # Storybook a nivel root (light/dark, addon-a11y)
```

## Stack

Node 22 LTS · pnpm 10 · Turborepo · React 19 · TypeScript 5.9 (estricto) · Vite · Storybook 10 · Vitest 4 · React Testing Library · Playwright · ESLint 9 · Prettier · GitHub Actions · MIT

## Comandos

```bash
pnpm install            # instalar dependencias
pnpm build              # build de todos los paquetes (genera tokens + metadata)
pnpm typecheck          # TypeScript estricto
pnpm lint               # ESLint (incluye boundaries entre paquetes)
pnpm validate           # validación de tokens + contraste WCAG
pnpm test               # Vitest (incluye suite de evaluación del retriever)
pnpm format:check       # Prettier
pnpm storybook          # Storybook dev (puerto 6006)
pnpm build-storybook    # build estático de Storybook
pnpm e2e                # Playwright (requiere build-storybook previo)
pnpm exec changeset     # crear un changeset (release de @ods-ai/tokens y @ods-ai/react)

# API local (F5) — MockProvider por defecto, sin API key
pnpm -F @ods-ai/api dev
curl -X POST localhost:3001/api/ask -H 'Content-Type: application/json' \
  -d '{"question":"¿Cómo uso Button?"}'

# Docs dev (asistente en http://localhost:5173/assistant; usa la API en 3001)
pnpm dev:docs
```

## Release

`@ods-ai/tokens` y `@ods-ai/react` se publican manualmente desde GitHub
Actions (workflow **Release**, solo `workflow_dispatch`; un push a `main` no
publica) mediante npm Trusted Publishing/OIDC. Procedimiento oficial en
[docs/release.md](docs/release.md).

## Licencia

MIT — ver [LICENSE](LICENSE).
