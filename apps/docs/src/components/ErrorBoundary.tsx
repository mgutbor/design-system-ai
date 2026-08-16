import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@ods-ai/react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * ErrorBoundary global de apps/docs (V1-0, P2-2).
 *
 * Evita la pantalla completamente blanca ante un error inesperado (incluidos
 * fallos de carga de rutas lazy). El usuario ve un mensaje útil en español y
 * una acción para recargar. Los stack traces solo se registran en la consola
 * (desarrollo); nunca se renderizan al usuario.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Solo registro de desarrollo; nunca se expone en la UI.
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" className={styles.fallback}>
          <h1>Algo salió mal</h1>
          <p>Ha ocurrido un error inesperado. Recarga la página para continuar.</p>
          <Button onClick={() => window.location.reload()}>Recargar página</Button>
        </div>
      )
    }
    return this.props.children
  }
}
