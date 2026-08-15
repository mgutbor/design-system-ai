import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importX from 'eslint-plugin-import-x'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'storybook-static/**',
      '**/.turbo/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'packages/tokens/src/tokens/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        window: 'readonly',
        globalThis: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      // Package boundaries (see docs/SPEC.md §dependency-graph).
      // tokens is a leaf: it must never import from another workspace package.
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/tokens/src',
              from: './packages',
              except: ['./tokens'],
            },
            {
              target: './packages/react/src',
              from: './packages',
              except: ['./react', './tokens'],
            },
            {
              // knowledge consumes react's metadata JSON (data) but must never
              // import from apps or from ai-* packages.
              target: './packages/knowledge/src',
              from: './packages',
              except: ['./knowledge', './react', './tokens'],
            },
            {
              // ai-core orchestrates over knowledge but never over a concrete
              // provider (ai-providers is a forbidden import) nor over apps,
              // react or tokens directly.
              target: './packages/ai-core/src',
              from: './packages',
              except: ['./ai-core', './knowledge'],
            },
            {
              // ai-providers implements AIProvider from ai-core; it must never
              // import knowledge, react, tokens or apps.
              target: './packages/ai-providers/src',
              from: './packages',
              except: ['./ai-providers', './ai-core'],
            },
            {
              // apps/api (F7) is a thin HTTP layer over AI Core: it may import
              // ai-core and ai-providers (to pick the provider by env) but never
              // knowledge, react, tokens or the other apps.
              target: './apps/api/src',
              from: './packages',
              except: ['./ai-core', './ai-providers'],
            },
            {
              // Las apps no pueden importarse entre sí (apps/docs ↔ apps/playground).
              target: './apps',
              from: './apps',
            },
          ],
        },
      ],
      'import-x/no-duplicates': 'error',
    },
  },
)
