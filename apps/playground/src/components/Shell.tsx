import { Badge, Button } from '@ods-ai/react'
import { NavLink, Outlet } from 'react-router'
import { DISCLAIMER } from '../data/fixtures'
import { useTheme } from '../theme'
import styles from './Shell.module.css'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/appointments', label: 'Citas' },
  { to: '/patient', label: 'Perfil del paciente' },
  { to: '/states', label: 'Estados' },
] as const

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')

export function Shell() {
  const { preference, cycle } = useTheme()

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <header className={styles.header}>
        <span className={styles.brand}>Patient Portal</span>
        <Badge variant="warning">{DISCLAIMER}</Badge>
        <Button size="sm" variant="secondary" onClick={cycle} aria-label={`Tema: ${preference}`}>
          {preference === 'light' ? 'Claro' : preference === 'dark' ? 'Oscuro' : 'Sistema'}
        </Button>
      </header>
      <nav aria-label="Principal" className={styles.nav}>
        <ul className={styles.navList}>
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'} className={navLinkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
