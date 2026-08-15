import { flatten, isRef, lookup, type TokenLayers, type TokenTree } from './loader.js'

/** Convert a token path to a CSS custom property name: color.action.primary → --color-action-primary. */
export function toCssName(path: string): string {
  return `--${path.split('.').join('-')}`
}

export class Resolver {
  private readonly layers: TokenLayers
  /** Flat path → raw value (string literal or reference). Last layer wins: component > semantic > primitive. */
  private readonly values = new Map<string, string>()

  constructor(layers: TokenLayers) {
    this.layers = layers
    for (const layer of ['primitive', 'semantic', 'component'] as const) {
      for (const { path, value } of flatten(layers[layer], layer)) {
        if (typeof value === 'string') this.values.set(path, value)
      }
    }
  }

  /** Raw value for a path regardless of layer. */
  raw(path: string): string | undefined {
    return this.values.get(path)
  }

  /** All flat leaf paths, in layer order. */
  paths(): string[] {
    return [...this.values.keys()]
  }

  /**
   * Fully resolve a token path to a literal string, following references
   * (with cycle detection) and applying theme overrides when provided.
   */
  resolve(
    path: string,
    theme?: TokenTree,
    seen?: Set<string>,
  ): { ok: true; value: string } | { ok: false; error: string } {
    const visited = seen ?? new Set<string>()
    if (visited.has(path)) {
      return { ok: false, error: `circular reference at "${path}"` }
    }
    visited.add(path)

    let raw: string | undefined
    if (theme) {
      const override = lookup(theme, path)
      if (typeof override === 'string') raw = override
    }
    if (raw === undefined) raw = this.values.get(path)
    if (raw === undefined) {
      return { ok: false, error: `unknown token "${path}"` }
    }
    if (isRef(raw)) {
      return this.resolve(raw, theme, visited)
    }
    return { ok: true, value: raw }
  }
}

export function buildResolver(layers: TokenLayers): Resolver {
  return new Resolver(layers)
}
