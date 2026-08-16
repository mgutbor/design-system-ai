import { Button, FormField, Input } from '@ods-ai/react'
import { CodeBlock } from '../components/CodeBlock'
import styles from './GettingStarted.module.css'

const INSTALL_CODE = `npm install @ods-ai/react @ods-ai/tokens`

const TOKENS_CODE = `import '@ods-ai/tokens/tokens.css'`

const DARK_THEME_CODE = `<!-- Tema oscuro: el sistema de tokens resuelve los valores con data-theme -->
<html data-theme="dark">`

const FIRST_BUTTON_CODE = `import { Button } from '@ods-ai/react'

export function SaveButton() {
  return <Button>Save changes</Button>
}`

const FULL_FORM_CODE = `import { Button, FormField, Input } from '@ods-ai/react'
import '@ods-ai/tokens/tokens.css'

export function ContactForm() {
  return (
    <form>
      <FormField label="Email" description="We never share your email.">
        <Input type="email" placeholder="you@example.com" />
      </FormField>
      <FormField label="Password" error="At least 8 characters.">
        <Input type="password" defaultValue="secret" />
      </FormField>
      <Button type="submit" variant="primary">
        Create account
      </Button>
    </form>
  )
}`

export default function GettingStarted() {
  return (
    <div className={styles.page}>
      <h1>Getting started</h1>
      <p className={styles.lead}>
        Instala el design system en una aplicación React 19 y empieza a usar sus componentes
        accesibles (WCAG 2.2 AA) y sus design tokens.
      </p>

      <section aria-labelledby="requirements-heading">
        <h2 id="requirements-heading">Requirements</h2>
        <ul>
          <li>
            <strong>Node.js ≥ 22</strong> y un gestor de paquetes (npm, pnpm o yarn).
          </li>
          <li>
            <strong>React 19</strong> y <strong>react-dom 19</strong> como peer dependencies de{' '}
            <code>@ods-ai/react</code>.
          </li>
        </ul>
      </section>

      <section aria-labelledby="install-heading">
        <h2 id="install-heading">Installation</h2>
        <p>
          Instala los dos paquetes públicos: <code>@ods-ai/react</code> (componentes) y{' '}
          <code>@ods-ai/tokens</code> (design tokens).
        </p>
        <CodeBlock code={INSTALL_CODE} />
      </section>

      <section aria-labelledby="tokens-heading">
        <h2 id="tokens-heading">Import the tokens</h2>
        <p>
          Importa el CSS de tokens una sola vez (normalmente en la entrada de tu aplicación). Los
          componentes leen sus estilos de estas variables.
        </p>
        <CodeBlock code={TOKENS_CODE} />
        <p>
          El tema oscuro se activa con <code>data-theme="dark"</code> en <code>&lt;html&gt;</code>;
          los tokens semánticos se resuelven automáticamente.
        </p>
        <CodeBlock code={DARK_THEME_CODE} />
      </section>

      <section aria-labelledby="first-button-heading">
        <h2 id="first-button-heading">Your first Button</h2>
        <p>
          <code>Button</code> tiene una API pequeña y explícita: <code>variant</code> ( primary,
          secondary, ghost, destructive), <code>size</code> (sm, md, lg) y <code>loading</code>.
        </p>
        <CodeBlock code={FIRST_BUTTON_CODE} />
      </section>

      <section aria-labelledby="form-example-heading">
        <h2 id="form-example-heading">A complete example: FormField + Input + Button</h2>
        <p>
          <code>FormField</code> resuelve la asociación accesible entre label, control, description
          y error (<code>htmlFor</code> + <code>aria-describedby</code>; el error usa{' '}
          <code>role="alert"</code>). Un <code>error</code> en FormField marca automáticamente el
          control como <code>invalid</code>.
        </p>
        <CodeBlock code={FULL_FORM_CODE} />
        <p className={styles.live}>Demo en vivo de la misma estructura:</p>
        <form className={styles.demo}>
          <FormField label="Email" description="We never share your email.">
            <Input type="email" placeholder="you@example.com" />
          </FormField>
          <Button type="submit" variant="primary">
            Create account
          </Button>
        </form>
      </section>

      <section aria-labelledby="a11y-heading">
        <h2 id="a11y-heading">Accessibility</h2>
        <ul>
          <li>
            Semántica nativa: <code>Button</code> usa <code>&lt;button&gt;</code>,{' '}
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
