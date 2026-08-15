import type { Meta, StoryObj } from '@storybook/react-vite'
import { tokens } from '@ods-ai/tokens'

interface Leaf {
  path: string
  value: string
}

function flatten(tree: unknown, prefix = ''): Leaf[] {
  if (typeof tree === 'string') return [{ path: prefix, value: tree }]
  if (tree !== null && typeof tree === 'object') {
    return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) =>
      flatten(value, prefix ? `${prefix}.${key}` : key),
    )
  }
  return []
}

function TokensOverview() {
  const leaves = flatten(tokens)
  const colors = leaves.filter((leaf) => leaf.path.startsWith('color.'))
  const others = leaves.filter((leaf) => !leaf.path.startsWith('color.'))

  return (
    <div
      style={{
        fontFamily: 'var(--font-family-sans)',
        background: 'var(--color-surface-background)',
        color: 'var(--color-text-default)',
        padding: '1rem',
      }}
    >
      <h1>Design tokens</h1>
      <p>
        F0 placeholder. Semantic values shown are the light defaults; use the theme toolbar to
        switch to dark.
      </p>
      <h2>Color</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {colors.map((leaf) => (
          <div key={leaf.path} style={{ width: 96 }}>
            <div
              style={{
                height: 56,
                borderRadius: 'var(--radius-md)',
                background: leaf.value,
                border: '1px solid var(--color-border-default)',
              }}
            />
            <code style={{ fontSize: 'var(--font-size-xs)' }}>{leaf.path}</code>
          </div>
        ))}
      </div>
      <h2>Other tokens</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.25rem' }}>
        {others.map((leaf) => (
          <li key={leaf.path}>
            <code>{leaf.path}</code>: <code>{leaf.value}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

const meta: Meta<typeof TokensOverview> = {
  title: 'Tokens/Overview',
  component: TokensOverview,
}

export default meta
type Story = StoryObj<typeof TokensOverview>

export const Overview: Story = {}
