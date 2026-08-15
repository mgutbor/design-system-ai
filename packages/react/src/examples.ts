import type { ReactNode } from 'react'

/**
 * A canonical component example. `examples.ts` files are the single source of
 * truth for official examples: consumed by stories, the future docs app and
 * the AI retrieval layer. The LLM never generates this code — it is retrieved
 * verbatim (SPEC §6).
 */
export interface ComponentExample {
  id: string
  title: string
  description?: string
  /** Canonical source code shown to users. */
  code: string
  /** Live render used by stories and the future docs app. */
  render: () => ReactNode
}
