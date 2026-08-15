import { Route, Routes } from 'react-router'
import { Shell } from './components/Shell'
import { Appointments } from './pages/Appointments'
import { Dashboard } from './pages/Dashboard'
import { PatientProfile } from './pages/PatientProfile'
import { States } from './pages/States'

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="patient" element={<PatientProfile />} />
        <Route path="states" element={<States />} />
      </Route>
    </Routes>
  )
}
