/**
 * Logger simple con colores para el agente
 */
export class Logger {
  constructor(debug = false) {
    this.debug_enabled = debug
  }

  info(message, ...args) {
    console.log(`[INFO] ${message}`, ...args)
  }

  success(message, ...args) {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`, ...args)
  }

  warn(message, ...args) {
    console.log(`\x1b[33m[WARN]\x1b[0m ${message}`, ...args)
  }

  error(message, ...args) {
    console.log(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args)
  }

  debug(message, ...args) {
    if (this.debug_enabled) {
      console.log(`\x1b[36m[DEBUG]\x1b[0m ${message}`, ...args)
    }
  }
}
