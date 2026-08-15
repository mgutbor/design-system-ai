import { Badge, Button } from '@ods-ai/react'
import { useNavigate } from 'react-router'
import { APPOINTMENTS, PATIENT } from '../data/fixtures'
import { statusLabel } from '../components/status'
import styles from './pages.module.css'

export function Dashboard() {
  const navigate = useNavigate()
  const confirmed = APPOINTMENTS.filter((a) => a.status === 'confirmed').length
  const pending = APPOINTMENTS.filter((a) => a.status === 'pending').length
  const next = APPOINTMENTS.find((a) => a.status === 'confirmed')

  return (
    <div className={styles.page}>
      <section aria-labelledby="greeting">
        <h1 id="greeting">Hola, {PATIENT.name}</h1>
        <p className={styles.muted}>Resumen de tu actividad de demostración.</p>
      </section>

      <section aria-label="Resumen">
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{APPOINTMENTS.length}</span>
            <span className={styles.statLabel}>Citas totales</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{confirmed}</span>
            <span className={styles.statLabel}>Confirmadas</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{pending}</span>
            <span className={styles.statLabel}>Pendientes</span>
          </div>
        </div>
      </section>

      {next ? (
        <section aria-labelledby="next-heading">
          <h2 id="next-heading">Próxima cita</h2>
          <div className={styles.panel}>
            <div>
              <Badge variant="success">{statusLabel(next.status)}</Badge>
            </div>
            <p className={styles.nextLine}>
              <strong>{next.specialty}</strong> · {next.doctor} · {next.date} a las {next.time} ·{' '}
              {next.location}
            </p>
            <Button variant="secondary" onClick={() => navigate('/appointments')}>
              Ver citas
            </Button>
          </div>
        </section>
      ) : null}

      <section aria-label="Acciones rápidas">
        <div className={styles.actions}>
          <Button onClick={() => navigate('/appointments')}>Gestionar citas</Button>
          <Button variant="secondary" onClick={() => navigate('/patient')}>
            Ver perfil
          </Button>
          <Button variant="secondary" onClick={() => navigate('/states')}>
            Ver estados
          </Button>
        </div>
      </section>
    </div>
  )
}
