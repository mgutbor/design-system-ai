import type { Meta, StoryObj } from '@storybook/react-vite'
import inputExamples from './Input.examples'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  args: {
    placeholder: 'Enter a value',
  },
  argTypes: {
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Basic: Story = {}

export const WithValue: Story = {
  args: { defaultValue: 'Jane Doe' },
}

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Unavailable' },
}

export const ReadOnly: Story = {
  args: { readOnly: true, value: 'Jane Doe' },
}

export const Invalid: Story = {
  args: { invalid: true, 'aria-describedby': 'email-error' },
}

/** Ejemplos canónicos: viven en Input.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {inputExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
