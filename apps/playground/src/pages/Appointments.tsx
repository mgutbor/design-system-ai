import { useState } from 'react'
import { Button, Checkbox, FormField, Input, Modal, Select } from '@ods-ai/react'
import { StatusBadge } from '../components/status'
import { APPOINTMENTS, SPECIALTIES, type Appointment } from '../data/fixtures'
import styles from './pages.module.css'

type Filter = 'all' | Appointment['status']

export function Appointments() {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = APPOINTMENTS.filter((a) => filter === 'all' || a.status === filter)

  const createAppointment = (): void => {
    setSaving(true)
    // Sin backend ni persistencia: solo simula el estado de carga.
    setTimeout(() => {
      setSaving(false)
      setNewOpen(false)
    }, 1200)
  }

  return (
    <div className={styles.page}>
      <section aria-labelledby="appointments-heading">
        <h1 id="appointments-heading">Citas</h1>
        <p className={styles.muted}>Filtra y revisa tus citas de demostración.</p>
      </section>

      <section aria-label="Filtros">
        <div className={styles.row}>
          <FormField label="Estado">
            <Select
              aria-label="Filtrar por estado"
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
            >
              <option value="all">Todas</option>
              <option value="confirmed">Confirmadas</option>
              <option value="pending">Pendientes</option>
              <option value="cancelled">Canceladas</option>
            </Select>
          </FormField>
          <Button onClick={() => setNewOpen(true)}>Nueva cita</Button>
        </div>
      </section>

      <section aria-label="Lista de citas">
        {filtered.length === 0 ? (
          <div className={styles.panel}>
            <p className={styles.muted}>No hay citas con este estado.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {filtered.map((appointment) => (
              <li key={appointment.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>
                    {appointment.specialty} · {appointment.date} a las {appointment.time}
                  </span>
                  <span className={styles.muted}>
                    {appointment.doctor} · {appointment.location}
                  </span>
                </div>
                <StatusBadge status={appointment.status} />
                <Button size="sm" variant="secondary" onClick={() => setSelected(appointment)}>
                  Detalles
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Detalle de la cita"
        description="Información de demostración de la cita seleccionada."
      >
        {selected ? (
          <div className={styles.form}>
            <p className={styles.nextLine}>
              <strong>{selected.specialty}</strong> con {selected.doctor}
            </p>
            <p className={styles.muted}>
              {selected.date} a las {selected.time} · {selected.location}
            </p>
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <NewAppointmentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        saving={saving}
        onCreate={createAppointment}
      />
    </div>
  )
}

function NewAppointmentModal({
  open,
  onClose,
  saving,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  saving: boolean
  onCreate: () => void
}) {
  const [specialty, setSpecialty] = useState<string>(SPECIALTIES[0] ?? '')
  const [doctor, setDoctor] = useState('')
  const [consent, setConsent] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const doctorError = doctor.trim() === '' ? 'Indica el nombre del profesional.' : undefined
  const consentError = !consent ? 'Debes aceptar la demo para continuar.' : undefined

  const submit = (): void => {
    setAttempted(true)
    if (!doctorError && !consentError) onCreate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva cita"
      description="Crea una cita de demostración (los datos no se guardan)."
    >
      <div className={styles.form}>
        <div className={styles.fields}>
          <FormField label="Especialidad">
            <Select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
              {SPECIALTIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Profesional" error={attempted ? doctorError : undefined}>
            <Input
              value={doctor}
              onChange={(event) => setDoctor(event.target.value)}
              placeholder="Dra. Lucía Navarro"
            />
          </FormField>
          <FormField label="Consentimiento" error={attempted ? consentError : undefined}>
            <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          </FormField>
        </div>
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            {saving ? 'Guardando…' : 'Crear cita'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
