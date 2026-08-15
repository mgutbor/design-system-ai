import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React Testing Library no hace cleanup automático cuando vitest globals
// están desactivados.
afterEach(() => {
  cleanup()
})
