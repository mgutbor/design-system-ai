import { Button } from '@ods-ai/react'
import { NavLink, Outlet } from 'react-router'
import { useTheme } from '../theme'
import styles from './Layout.module.css'

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')

const THEME_LABELS: Record<string, string> = {
  light: 'Tema: claro',
  dark: 'Tema: oscuro',
  system: 'Tema: sistema',
}

export function Layout() {
  const { preference, cycle } = useTheme()

  return (
    <div className={styles.layout}>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand}>
          Open Design System AI
        </NavLink>
        <nav aria-label="Principal">
          <ul className={styles.nav}>
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Inicio
              </NavLink>
            </li>
            <li>
              <NavLink to="/getting-started" className={navLinkClass}>
                Guía de inicio
              </NavLink>
            </li>
            <li>
              <NavLink to="/foundations/tokens" className={navLinkClass}>
                Fundamentos
              </NavLink>
            </li>
            <li>
              <NavLink to="/components" end className={navLinkClass}>
                Componentes
              </NavLink>
            </li>
            <li>
              <NavLink to="/assistant" className={navLinkClass}>
                Asistente
              </NavLink>
            </li>
          </ul>
        </nav>
        <Button size="sm" variant="secondary" onClick={cycle} aria-label={THEME_LABELS[preference]}>
          {preference === 'light' ? 'Claro' : preference === 'dark' ? 'Oscuro' : 'Sistema'}
        </Button>
      </header>
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>Open Design System AI — Licencia MIT. Construido con su propio sistema de diseño.</p>
      </footer>
    </div>
  )
}
