import type { Meta, StoryObj } from '@storybook/react-vite'
import badgeExamples from './Badge.examples'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  args: {
    children: 'Approved',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'danger'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Neutral: Story = {
  args: { children: 'New' },
}

export const Success: Story = {
  args: { children: 'Approved' },
}

export const Warning: Story = {
  args: { children: 'Pending' },
}

export const Danger: Story = {
  args: { children: 'Blocked' },
}

/** Ejemplos canónicos: viven en Badge.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
      {badgeExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
