/** Datos 100% ficticios. El playground es una Reference Application de
 *  demostración del design system — no es un producto sanitario. */
export const DISCLAIMER = 'Datos de demostración, no médicos.'

export interface Appointment {
  id: string
  date: string
  time: string
  specialty: string
  doctor: string
  location: string
  status: 'confirmed' | 'pending' | 'cancelled'
}

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'cita-001',
    date: '2026-08-20',
    time: '09:30',
    specialty: 'Cardiología',
    doctor: 'Dra. Lucía Navarro',
    location: 'Centro Norte',
    status: 'confirmed',
  },
  {
    id: 'cita-002',
    date: '2026-08-22',
    time: '11:00',
    specialty: 'Dermatología',
    doctor: 'Dr. Pablo Iglesias',
    location: 'Centro Este',
    status: 'confirmed',
  },
  {
    id: 'cita-003',
    date: '2026-08-25',
    time: '16:15',
    specialty: 'Nutrición',
    doctor: 'Dra. Marta Ruiz',
    location: 'Centro Oeste',
    status: 'pending',
  },
  {
    id: 'cita-004',
    date: '2026-08-12',
    time: '10:00',
    specialty: 'Análisis clínicos',
    doctor: 'Lab. Central',
    location: 'Centro Norte',
    status: 'cancelled',
  },
  {
    id: 'cita-005',
    date: '2026-08-30',
    time: '12:30',
    specialty: 'Fisioterapia',
    doctor: 'Dr. Sergio Molina',
    location: 'Centro Sur',
    status: 'pending',
  },
]

export interface Patient {
  name: string
  id: string
  age: number
  city: string
  bloodType: string
  allergies: string[]
  memberSince: string
}

export const PATIENT: Patient = {
  name: 'Ana García',
  id: 'PAC-2026-0142',
  age: 34,
  city: 'Madrid',
  bloodType: 'A+',
  allergies: ['Penicilina', 'Frutos secos'],
  memberSince: '2021',
}

export const SPECIALTIES = [
  'Cardiología',
  'Dermatología',
  'Nutrición',
  'Fisioterapia',
  'Oftalmología',
] as const
