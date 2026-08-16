import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div>
      <h1>Página no encontrada</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </div>
  )
}
