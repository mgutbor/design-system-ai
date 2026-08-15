import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React Testing Library does not auto-cleanup when vitest globals are disabled.
afterEach(() => {
  cleanup()
})
