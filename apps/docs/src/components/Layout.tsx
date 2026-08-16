import { Button } from '@ods-ai/react'
import { NavLink, Outlet } from 'react-router'
import { useTheme } from '../theme'
import styles from './Layout.module.css'

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')

const THEME_LABELS: Record<string, string> = {
  light: 'Theme: light',
  dark: 'Theme: dark',
  system: 'Theme: system',
}

export function Layout() {
  const { preference, cycle } = useTheme()

  return (
    <div className={styles.layout}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand}>
          Open Design System AI
        </NavLink>
        <nav aria-label="Main">
          <ul className={styles.nav}>
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/getting-started" className={navLinkClass}>
                Getting started
              </NavLink>
            </li>
            <li>
              <NavLink to="/foundations/tokens" className={navLinkClass}>
                Foundations
              </NavLink>
            </li>
            <li>
              <NavLink to="/components" end className={navLinkClass}>
                Components
              </NavLink>
            </li>
            <li>
              <NavLink to="/assistant" className={navLinkClass}>
                Assistant
              </NavLink>
            </li>
          </ul>
        </nav>
        <Button size="sm" variant="secondary" onClick={cycle} aria-label={THEME_LABELS[preference]}>
          {preference === 'light' ? 'Light' : preference === 'dark' ? 'Dark' : 'System'}
        </Button>
      </header>
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>Open Design System AI — MIT licensed. Built with its own design system.</p>
      </footer>
    </div>
  )
}
