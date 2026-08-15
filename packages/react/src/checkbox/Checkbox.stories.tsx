import type { Meta, StoryObj } from '@storybook/react-vite'
import checkboxExamples from './Checkbox.examples'
import { Checkbox } from './Checkbox'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: {
    'aria-label': 'Checkbox',
  },
  argTypes: {
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Unchecked: Story = {}

export const Checked: Story = {
  args: { defaultChecked: true },
}

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
}

export const Invalid: Story = {
  args: { invalid: true },
}

/** Ejemplos canónicos: viven en Checkbox.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {checkboxExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
