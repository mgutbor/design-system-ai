/**
 * Declaración local de tipos para jest-axe (misma que packages/react).
 * El paquete @types/jest-axe apunta a la API antigua (3.x) y no coincide con
 * la exportación actual; esta declaración cubre exactamente la API que usamos.
 */
declare module 'jest-axe' {
  export interface AxeViolation {
    id: string
    impact?: string
    description: string
    help?: string
    nodes: Array<{ target: string[] }>
  }

  export interface AxeResults {
    violations: AxeViolation[]
    passes: AxeViolation[]
    incomplete: AxeViolation[]
    inapplicable: AxeViolation[]
  }

  export function axe(container: HTMLElement): Promise<AxeResults>
}
