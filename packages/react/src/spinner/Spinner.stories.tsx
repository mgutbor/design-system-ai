import type { Meta, StoryObj } from '@storybook/react-vite'
import spinnerExamples from './Spinner.examples'
import { Spinner } from './Spinner'

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    label: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Spinner>

export const Decorative: Story = {}

export const WithLabel: Story = {
  args: { label: 'Loading' },
}

export const Sizes: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', gap: 'var(--space-3)', alignItems: 'center' }}>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
    </span>
  ),
}

/** Ejemplos canónicos: viven en Spinner.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {spinnerExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
