import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '../input'
import formFieldExamples from './FormField.examples'
import { FormField } from './FormField'

const meta: Meta<typeof FormField> = {
  title: 'Components/FormField',
  component: FormField,
  args: {
    label: 'Email',
    children: <Input type="email" placeholder="you@example.com" />,
  },
  argTypes: {
    description: { control: 'text' },
    error: { control: 'text' },
    htmlFor: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof FormField>

export const Basic: Story = {}

export const WithDescription: Story = {
  args: { description: 'At least 8 characters.' },
}

export const WithError: Story = {
  args: { error: 'Enter a valid email address.' },
}

/** Ejemplos canónicos: viven en FormField.examples.tsx (fuente única). */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {formFieldExamples.map((example) => (
        <div key={example.id}>{example.render()}</div>
      ))}
    </div>
  ),
}
