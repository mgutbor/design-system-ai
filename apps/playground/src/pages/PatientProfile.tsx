import { useState } from 'react'
import { Badge, Button, FormField, Input, Modal } from '@ods-ai/react'
import { PATIENT } from '../data/fixtures'
import styles from './pages.module.css'

export function PatientProfile() {
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(PATIENT.name)
  const [city, setCity] = useState(PATIENT.city)
  const [saved, setSaved] = useState(false)

  const save = (): void => {
    setEditOpen(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      <section aria-labelledby="profile-heading">
        <h1 id="profile-heading">Perfil del paciente</h1>
        <p className={styles.muted}>Datos de demostración — no son información médica real.</p>
        {saved ? <Badge variant="success">Guardado</Badge> : null}
      </section>

      <section aria-labelledby="data-heading">
        <h2 id="data-heading">Datos</h2>
        <div className={styles.form}>
          <FormField label="Nombre completo">
            <Input value={name} readOnly />
          </FormField>
          <div className={styles.row}>
            <FormField label="Identificador">
              <Input value={PATIENT.id} readOnly />
            </FormField>
            <FormField label="Edad">
              <Input value={String(PATIENT.age)} readOnly />
            </FormField>
          </div>
          <div className={styles.row}>
            <FormField label="Ciudad">
              <Input value={city} readOnly />
            </FormField>
            <FormField label="Grupo sanguíneo">
              <Input value={PATIENT.bloodType} readOnly />
            </FormField>
          </div>
          <FormField label="Paciente desde">
            <Input value={PATIENT.memberSince} readOnly />
          </FormField>
        </div>
      </section>

      <section aria-labelledby="allergies-heading">
        <h2 id="allergies-heading">Alergias</h2>
        <div className={styles.row}>
          {PATIENT.allergies.map((allergy) => (
            <Badge key={allergy} variant="danger">
              {allergy}
            </Badge>
          ))}
        </div>
      </section>

      <section aria-label="Acciones del perfil">
        <Button onClick={() => setEditOpen(true)}>Editar perfil</Button>
      </section>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar perfil"
        description="Edita los datos de demostración (no se persisten)."
      >
        <div className={styles.form}>
          <div className={styles.fields}>
            <FormField label="Nombre completo">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <FormField label="Ciudad">
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </FormField>
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
