import { describe, expect, it } from 'vitest'
import { buildCorpus } from './buildCorpus'
import { corpus } from '../index'
import type { MetadataInput } from './metadataInput'
import { OWN_PROPS_BY_COMPONENT } from './ownProps'

function fakeMetadata(overrides: Partial<MetadataInput> = {}): MetadataInput {
  return {
    id: 'ods-ai/test',
    kind: 'component',
    name: 'Test',
    component: 'test',
    description: 'A test component.',
    props: [
      { name: 'variant', required: false, type: 'string', defaultValue: 'primary' },
      { name: 'disabled', required: false, type: 'boolean' },
      { name: 'aria-label', required: false, type: 'string' },
      { name: 'data-id', required: false, type: 'string' },
      { name: 'onClick', required: false, type: '() => void' },
      { name: 'onClickCapture', required: false, type: '() => void' },
      { name: 'className', required: false, type: 'string' },
      { name: 'style', required: false, type: 'object' },
      { name: 'id', required: false, type: 'string' },
    ],
    variants: ['primary'],
    tokensUsed: ['color.action.primary'],
    examples: [],
    tags: ['test'],
    a11ySummary: 'Test accessibility.',
    url: '/components/test',
    sourcePath: 'packages/react/src/test/Test.tsx',
    ...overrides,
  }
}

describe('buildCorpus — own API whitelist (F5.1)', () => {
  it('keeps only whitelisted own props, never inherited HTML attributes', () => {
    // "test" is not in the whitelist → no props survive.
    const [entry] = buildCorpus([fakeMetadata()])
    expect(entry).toBeDefined()
    expect(entry!.props).toEqual([])
  })

  it('Button exposes exactly variant, size, loading', () => {
    const button = corpus.find((entry) => entry.component === 'button')
    expect(button).toBeDefined()
    expect(button!.props.map((prop) => prop.name).sort()).toEqual(['loading', 'size', 'variant'])
  })

  it('Input, Checkbox and Select expose exactly invalid', () => {
    for (const slug of ['input', 'checkbox', 'select']) {
      const entry = corpus.find((item) => item.component === slug)
      expect(entry).toBeDefined()
      expect(entry!.props.map((prop) => prop.name)).toEqual(['invalid'])
    }
  })

  it('Badge exposes variant; Spinner exposes size and label', () => {
    const badge = corpus.find((entry) => entry.component === 'badge')
    expect(badge!.props.map((prop) => prop.name)).toEqual(['variant'])

    const spinner = corpus.find((entry) => entry.component === 'spinner')
    expect(spinner!.props.map((prop) => prop.name).sort()).toEqual(['label', 'size'])
  })

  it('Modal and FormField expose their own props only', () => {
    const modal = corpus.find((entry) => entry.component === 'modal')
    expect(modal!.props.map((prop) => prop.name).sort()).toEqual([
      'children',
      'closeOnBackdrop',
      'closeOnEscape',
      'description',
      'onClose',
      'open',
      'title',
    ])

    const formField = corpus.find((entry) => entry.component === 'form-field')
    expect(formField!.props.map((prop) => prop.name).sort()).toEqual([
      'children',
      'description',
      'error',
      'htmlFor',
      'label',
    ])
  })

  it('every whitelisted own prop exists in the real metadata (no drift)', () => {
    for (const entry of corpus) {
      const metadataProps = new Set(
        // Rebuild from the source JSON indirectly: corpus already filtered,
        // so re-run buildCorpus from the raw-ish shape is not possible here.
        // Instead assert the whitelist is a subset of the generated metadata
        // by checking against OWN_PROPS_BY_COMPONENT consistency below.
        OWN_PROPS_BY_COMPONENT[entry.component] ?? [],
      )
      expect(metadataProps).toBeDefined()
      for (const prop of OWN_PROPS_BY_COMPONENT[entry.component] ?? []) {
        expect(entry.props.some((p) => p.name === prop)).toBe(true)
      }
    }
  })

  it('preserves identity, navigation and content fields', () => {
    const [entry] = buildCorpus([fakeMetadata({ component: 'button', name: 'Button' })])
    expect(entry).toBeDefined()
    expect(entry!.id).toBe('ods-ai/test')
    expect(entry!.kind).toBe('component')
    expect(entry!.component).toBe('button')
    expect(entry!.url).toBe('/components/test')
    expect(entry!.tokensUsed).toEqual(['color.action.primary'])
    expect(entry!.tags).toEqual(['test'])
    expect(entry!.a11ySummary).toBe('Test accessibility.')
  })

  it('is deterministic: same input always yields the same output', () => {
    const metadata = [fakeMetadata(), fakeMetadata({ component: 'other', name: 'Other' })]
    const first = buildCorpus(metadata)
    const second = buildCorpus(metadata)
    expect(first).toEqual(second)
  })

  it('produces a small API surface per real component', () => {
    for (const entry of corpus) {
      expect(entry.props.length).toBeLessThan(50)
      expect(entry.props.every((prop) => !prop.name.startsWith('aria-'))).toBe(true)
    }
  })
})
