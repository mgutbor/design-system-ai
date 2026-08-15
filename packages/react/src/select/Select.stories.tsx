import type { Meta, StoryObj } from '@storybook/react-vite'
import selectExamples from './Select.examples'
import { Select } from './Select'

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  args: {
    'aria-label': 'Plan',
    children: (
      <>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
        <option value="team">Team</option>
      </>
    ),
  },
  argTypes: {
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Select>

export const Basic: Story = {}

export const WithPlaceholder: Story = {
  args: {
    defaultValue: '',
    children: (
      <>
        <option value="" disabled>
          Select a plan…
        </option>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
        <option value="team">Team</option>
      </>
    ),
  },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const Invalid: Story = {
  args: { invalid: true, defaultValue: '' },
}

/** Ejemplos canónicos: viven en Select.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {selectExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
