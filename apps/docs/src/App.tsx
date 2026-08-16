import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Spinner } from '@ods-ai/react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'

// Code-splitting por ruta: la home no carga el DS completo ni los ejemplos.
const Home = lazy(() => import('./pages/Home'))
const GettingStarted = lazy(() => import('./pages/GettingStarted'))
const Tokens = lazy(() => import('./pages/Tokens'))
const ComponentsIndex = lazy(() => import('./pages/ComponentsIndex'))
const ComponentPage = lazy(() => import('./pages/ComponentPage'))
const AssistantPage = lazy(() => import('./assistant/AssistantPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

export function App() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 'var(--space-8)' }}>
          <Spinner label="Loading" />
        </div>
      }
    >
      <ErrorBoundary>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="getting-started" element={<GettingStarted />} />
            <Route path="foundations/tokens" element={<Tokens />} />
            <Route path="components" element={<ComponentsIndex />} />
            <Route path="components/:slug" element={<ComponentPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Suspense>
  )
}
