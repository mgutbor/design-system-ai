import { useState } from 'react'
import { Badge, Button, Spinner } from '@ods-ai/react'
import { APPOINTMENTS } from '../data/fixtures'
import styles from './pages.module.css'

export function States() {
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [simulateError, setSimulateError] = useState(false)

  const simulateLoading = (): void => {
    setLoading(true)
    setSimulateError(false)
    setTimeout(() => {
      setLoading(false)
      setLoaded(true)
    }, 1500)
  }

  const emptyCount = APPOINTMENTS.filter((a) => a.status === 'cancelled').length

  return (
    <div className={styles.page}>
      <section aria-labelledby="states-heading">
        <h1 id="states-heading">Estados</h1>
        <p className={styles.muted}>
          Demostración de estados de UI (carga, vacío y error) con los componentes del DS.
        </p>
      </section>

      <section aria-labelledby="loading-heading">
        <h2 id="loading-heading">Carga</h2>
        <div className={styles.panel}>
          {loading ? (
            <p>
              <Spinner label="Cargando datos de demostración…" /> Cargando datos de demostración…
            </p>
          ) : (
            <p className={styles.muted}>
              {loaded ? 'Carga completada (simulada).' : 'Pulsa el botón para simular una carga.'}
            </p>
          )}
          <div>
            <Button onClick={simulateLoading} loading={loading}>
              {loading ? 'Cargando…' : 'Simular carga'}
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="empty-heading">
        <h2 id="empty-heading">Vacío</h2>
        <div className={styles.panel}>
          <p className={styles.muted}>
            Estado vacío simulado: hay {emptyCount} cita(s) cancelada(s) con el filtro de estado
            "Canceladas".
          </p>
          <div>
            <Badge variant="neutral">Sin resultados</Badge>
          </div>
        </div>
      </section>

      <section aria-labelledby="error-heading">
        <h2 id="error-heading">Error</h2>
        <div className={styles.panel}>
          {simulateError ? (
            <>
              <Badge variant="danger">Error de conexión</Badge>
              <p className={styles.muted}>
                No se pudo cargar la información de demostración. Inténtalo de nuevo.
              </p>
              <div>
                <Button variant="secondary" onClick={() => setSimulateError(false)}>
                  Reintentar
                </Button>
              </div>
            </>
          ) : (
            <p className={styles.muted}>Pulsa para simular un error de conexión.</p>
          )}
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setSimulateError(true)
                setLoaded(false)
              }}
            >
              Simular error
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
