import { Button, FormField, Input } from '@ods-ai/react'
import { CodeBlock } from '../components/CodeBlock'
import styles from './GettingStarted.module.css'

const CREATE_APP_CODE = `npm create vite@latest my-app -- --template react-ts`

const ENTER_APP_CODE = `cd my-app`

const INSTALL_CODE = `npm install react react-dom @ods-ai/react @ods-ai/tokens`

const TOKENS_CODE = `// src/main.tsx
import '@ods-ai/tokens/tokens.css'`

const APP_CODE = `// src/App.tsx
import { Button } from '@ods-ai/react'

export default function App() {
  return <Button variant="primary">Guardar cambios</Button>
}`

const THEME_CODE = `<!-- Tema oscuro: los tokens se resuelven automáticamente con data-theme -->
<html data-theme="dark">`

const RUN_CODE = `npm run dev`

const FULL_FORM_CODE = `import { Button, FormField, Input } from '@ods-ai/react'
import '@ods-ai/tokens/tokens.css'

export default function ContactForm() {
  return (
    <form>
      <FormField label="Correo electrónico" description="Nunca compartimos tu correo.">
        <Input type="email" placeholder="tu@ejemplo.com" />
      </FormField>
      <FormField label="Contraseña" error="Al menos 8 caracteres.">
        <Input type="password" defaultValue="secreto" />
      </FormField>
      <Button type="submit" variant="primary">
        Crear cuenta
      </Button>
    </form>
  )
}`

export default function GettingStarted() {
  return (
    <div className={styles.page}>
      <h1>Guía de inicio</h1>
      <p className={styles.lead}>
        Crea una aplicación React desde cero, instala el sistema de diseño y muestra tu primer
        componente accesible (WCAG 2.2 AA) en menos de cinco minutos.
      </p>

      <section aria-labelledby="requirements-heading">
        <h2 id="requirements-heading">Requisitos</h2>
        <ul>
          <li>
            <strong>Node.js ≥ 22</strong> y un gestor de paquetes (npm, pnpm o yarn).
          </li>
          <li>
            La plantilla de Vite instala <strong>React 19</strong>, que es la peer dependency de{' '}
            <code>@ods-ai/react</code>.
          </li>
        </ul>
      </section>

      <section aria-labelledby="create-heading">
        <h2 id="create-heading">1. Crea la aplicación</h2>
        <p>
          Crea un proyecto React + TypeScript nuevo con Vite. Responde a las preguntas del asistente
          si las hace.
        </p>
        <CodeBlock code={CREATE_APP_CODE} />
      </section>

      <section aria-labelledby="enter-heading">
        <h2 id="enter-heading">2. Entra en el proyecto</h2>
        <CodeBlock code={ENTER_APP_CODE} />
      </section>

      <section aria-labelledby="install-heading">
        <h2 id="install-heading">3. Instala las dependencias</h2>
        <p>
          Instala <code>@ods-ai/react</code> (componentes) y <code>@ods-ai/tokens</code> (design
          tokens) junto con React, que ya viene en la plantilla.
        </p>
        <CodeBlock code={INSTALL_CODE} />
      </section>

      <section aria-labelledby="tokens-heading">
        <h2 id="tokens-heading">4. Importa los tokens</h2>
        <p>
          Importa el CSS de tokens una sola vez en <code>src/main.tsx</code>. Los componentes leen
          sus estilos de estas variables.
        </p>
        <CodeBlock code={TOKENS_CODE} />
      </section>

      <section aria-labelledby="first-button-heading">
        <h2 id="first-button-heading">5. Muestra tu primer Button</h2>
        <p>
          Sustituye el contenido de <code>src/App.tsx</code> por un <code>Button</code> real de ODS
          AI. Su API es pequeña: <code>variant</code> (primary, secondary, ghost, destructive),{' '}
          <code>size</code> (sm, md, lg) y <code>loading</code>.
        </p>
        <CodeBlock code={APP_CODE} />
      </section>

      <section aria-labelledby="theme-heading">
        <h2 id="theme-heading">6. El sistema de temas</h2>
        <p>
          Los tokens semánticos se resuelven según el atributo <code>data-theme</code> de{' '}
          <code>&lt;html&gt;</code>. El tema claro es el predeterminado; el oscuro se activa así:
        </p>
        <CodeBlock code={THEME_CODE} />
      </section>

      <section aria-labelledby="run-heading">
        <h2 id="run-heading">7. Ejecuta la aplicación</h2>
        <p>
          Arranca el servidor de desarrollo y abre <code>http://localhost:5173</code>. Deberías ver
          el botón <em>Guardar cambios</em>.
        </p>
        <CodeBlock code={RUN_CODE} />
      </section>

      <section aria-labelledby="form-example-heading">
        <h2 id="form-example-heading">Un ejemplo completo: FormField + Input + Button</h2>
        <p>
          <code>FormField</code> resuelve la asociación accesible entre label, control, description
          y error (<code>htmlFor</code> + <code>aria-describedby</code>; el error usa{' '}
          <code>role="alert"</code>). Un <code>error</code> marca automáticamente el control como{' '}
          <code>invalid</code>.
        </p>
        <CodeBlock code={FULL_FORM_CODE} />
        <p className={styles.live}>Así se ve la misma estructura en vivo:</p>
        <form className={styles.demo}>
          <FormField label="Correo electrónico" description="Nunca compartimos tu correo.">
            <Input type="email" placeholder="tu@ejemplo.com" />
          </FormField>
          <Button type="submit" variant="primary">
            Crear cuenta
          </Button>
        </form>
      </section>

      <section aria-labelledby="a11y-heading">
        <h2 id="a11y-heading">Accesibilidad</h2>
        <ul>
          <li>
            Semántica nativa: <code>Button</code> usa <code>&lt;button&gt;</code> e{' '}
            <code>Input</code> usa <code>&lt;input&gt;</code> (teclado y roles del navegador sin
            código adicional).
          </li>
          <li>
            <code>Button loading</code> deshabilita la interacción y marca <code>aria-busy</code>;
            el spinner es decorativo.
          </li>
          <li>
            <code>Input invalid</code> marca <code>aria-invalid="true"</code> y el estado visual de
            error.
          </li>
          <li>
            Foco visible con anillo (<code>:focus-visible</code>), contraste AA validado por tokens
            y <code>prefers-reduced-motion</code> respetado.
          </li>
        </ul>
      </section>
    </div>
  )
}
