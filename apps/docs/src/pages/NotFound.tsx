import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </div>
  )
}
