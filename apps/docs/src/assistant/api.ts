/**
 * Cliente mínimo de apps/docs hacia apps/api (F5).
 *
 * Única vía de comunicación con el asistente: POST /api/ask. El retrieval, el
 * gate, el contexto y el prompting viven ENTEROS en ai-core/knowledge vía
 * apps/api — el navegador nunca ejecuta retrieval ni conoce proveedores.
 *
 * Los tipos locales reflejan el contrato HTTP real de apps/api (requestId +
 * AIAnswer). Se mantienen aquí (y no importados de @ods-ai/ai-core) para
 * respetar el dependency graph de la SPEC: apps/docs solo habla con apps/api
 * por HTTP, nunca importa ai-core/knowledge.
 */

/**
 * Origen de apps/api, configurable en build con VITE_API_BASE_URL.
 * - Sin variable y en producción → mismo origen (''): el bundle NUNCA
 *   contiene localhost; si apps/docs se sirve tras un proxy que enruta
 *   /api hacia apps/api, el asistente funciona sin más configuración.
 * - Sin variable y en desarrollo → localhost:3001 (servidor local).
 */
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.PROD ? '' : 'http://localhost:3001')

/** Una fuente recuperada: componente + score del gate (retrieval real). */
export interface AskSource {
  component: string
  score: number
}

/** Contrato de respuesta de POST /api/ask (deriva de AIAnswer). */
export interface AskResponse {
  requestId: string
  answer: string
  referencedComponents: string[]
  confidence: 'none' | 'low' | 'medium' | 'high'
  hasRelevantContext: boolean
  providerId: string
  model: string
  retrieval: {
    query: string
    components: AskSource[]
    minScore: number
  }
}

/** Error tipado de la API con código estable (mapeado a mensaje amigable). */
export class AskError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AskError'
    this.code = code
  }
}

const isErrorBody = (value: unknown): value is { error?: { code?: unknown; message?: unknown } } =>
  typeof value === 'object' && value !== null

/**
 * Envía una pregunta a POST /api/ask y devuelve la respuesta estructurada.
 * Nunca muestra internals: los errores se tipan por código y el mensaje del
 * servidor solo se propaga si es seguro (la API ya lo sanitiza).
 */
/**
 * Comprueba si la API del asistente está disponible (V1-0, P1-3).
 *
 * Diseño mínimo: UNA petición al montar la página, con timeout, SIN polling.
 * GET /api/health no tiene side effects y no está rate-limitado. Si el
 * origen configurado (VITE_API_BASE_URL) no responde, se considera "no
 * disponible" — desde la UI no se distingue "no configurada" (default dev
 * localhost:3001) de "caída": ambas muestran el mismo aviso.
 */
export async function checkHealth(timeoutMs = 3000): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function ask(question: string): Promise<AskResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
  } catch {
    throw new AskError('network', 'No se pudo contactar con la API del asistente.')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const code =
      isErrorBody(body) && typeof body.error?.code === 'string' ? body.error.code : 'internal'
    const message =
      isErrorBody(body) && typeof body.error?.message === 'string' ? body.error.message : undefined
    throw new AskError(code, message ?? 'La petición al asistente falló.')
  }

  return body as AskResponse
}
