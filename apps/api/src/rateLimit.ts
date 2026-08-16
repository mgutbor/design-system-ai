/**
 * Rate limiting en memoria (fixed window) para apps/api (V1-0, P0-2).
 *
 * Decisión: solución mínima sin infraestructura — un contador por clave
 * (IP) en memoria, suficiente para una API pública de documentación con una
 * sola instancia. LIMITACIÓN documentada: en despliegues multi-instancia o
 * serverless, cada instancia tiene su propio contador; si se necesita un
 * límite global estricto, habría que mover el estado a un store compartido
 * (p. ej. Redis) — ver docs/deploy.md.
 */

export interface RateLimitConfig {
  /** Máximo de peticiones permitidas por ventana. */
  max: number
  /** Duración de la ventana en milisegundos. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Tiempo restante de la ventana (ms) cuando se bloquea. */
  retryAfterMs?: number
}

/** Tamaño máximo del mapa de claves: más allá, se podan ventanas expiradas. */
const MAX_KEYS = 10_000

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult
}

export function createRateLimiter({ max, windowMs }: RateLimitConfig): RateLimiter {
  const counts = new Map<string, { count: number; windowStart: number }>()

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      if (counts.size >= MAX_KEYS) {
        for (const [storedKey, entry] of counts) {
          if (now - entry.windowStart >= windowMs) counts.delete(storedKey)
        }
      }

      const entry = counts.get(key)
      if (entry === undefined || now - entry.windowStart >= windowMs) {
        counts.set(key, { count: 1, windowStart: now })
        return { allowed: true }
      }
      if (entry.count < max) {
        entry.count += 1
        return { allowed: true }
      }
      return { allowed: false, retryAfterMs: windowMs - (now - entry.windowStart) }
    },
  }
}
