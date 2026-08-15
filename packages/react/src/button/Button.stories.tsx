import type { Meta, StoryObj } from '@storybook/react-vite'
import buttonExamples from './Button.examples'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  args: {
    children: 'Save changes',
    variant: 'primary',
    size: 'md',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Save changes' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Learn more' },
}

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete account' },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button>Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const Loading: Story = {
  args: { loading: true, children: 'Processing…' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
}

/** Ejemplos canónicos: viven en Button.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
      {buttonExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
