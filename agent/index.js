#!/usr/bin/env node

import WebSocket from 'ws'
import { config } from 'dotenv'
import { ONTClient } from './lib/ont-client.js'
import { Logger } from './lib/logger.js'

config()

const logger = new Logger(process.env.DEBUG === 'true')

class ACSAgent {
  constructor() {
    this.agentId = process.env.AGENT_ID
    this.agentName = process.env.AGENT_NAME
    this.serialNumber = process.env.ONT_SERIAL
    this.acsServer = process.env.ACS_SERVER
    this.apiKey = process.env.ACS_API_KEY
    
    this.ws = null
    this.reconnectTimeout = null
    this.heartbeatInterval = null
    this.telemetryInterval = null
    this.isConnected = false
    
    this.ontClient = new ONTClient({
      ip: process.env.ONT_IP,
      username: process.env.ONT_USERNAME,
      password: process.env.ONT_PASSWORD,
      serial: process.env.ONT_SERIAL
    })
  }

  async start() {
    logger.info('╔════════════════════════════════════════╗')
    logger.info('║   ACS Agent para Huawei ONT GPON      ║')
    logger.info('╚════════════════════════════════════════╝')
    logger.info('')
    logger.info(`Agente: ${this.agentName} (${this.agentId})`)
    logger.info(`Serial: ${this.serialNumber}`)
    logger.info(`ONT IP: ${this.ontClient.config.ip}`)
    logger.info('')
    
    // Verificar conectividad a la ONT
    logger.info('Verificando conectividad con ONT local...')
    const ontReachable = await this.ontClient.testConnection()
    
    if (!ontReachable) {
      logger.error('✗ No se puede alcanzar la ONT en', this.ontClient.config.ip)
      logger.error('  Verifica que:')
      logger.error('  - La ONT esté encendida')
      logger.error('  - Estés en la misma red local')
      logger.error('  - La IP sea correcta (default: 192.168.10.1)')
      logger.error('')
      logger.info('Reintentando en 30 segundos...')
      setTimeout(() => this.start(), 30000)
      return
    }
    
    logger.success('✓ ONT alcanzable')
    logger.info('')
    
    // Conectar al servidor ACS
    this.connect()
  }

  connect() {
    if (this.ws) {
      this.ws.close()
    }

    logger.info(`Conectando al servidor ACS...`)
    logger.debug(`WebSocket: ${this.acsServer}`)

    try {
      this.ws = new WebSocket(this.acsServer, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      this.ws.on('open', () => this.onOpen())
      this.ws.on('message', (data) => this.onMessage(data))
      this.ws.on('close', () => this.onClose())
      this.ws.on('error', (error) => this.onError(error))
    } catch (error) {
      logger.error('Error al crear WebSocket:', error.message)
      this.scheduleReconnect()
    }
  }

  onOpen() {
    logger.success('✓ WebSocket conectado')
    this.isConnected = true

    // Registrar el agente
    this.send({
      type: 'register',
      agent_id: this.agentId,
      agent_name: this.agentName,
      serial_number: this.serialNumber,
      ont_info: {
        model: 'EG8245W5-6T',
        manufacturer: 'Huawei'
      }
    })

    // Iniciar heartbeat
    this.startHeartbeat()
    
    // Iniciar telemetría
    this.startTelemetry()

    logger.success('✓ Agente registrado y activo')
    logger.info('')
  }

  onMessage(data) {
    try {
      const message = JSON.parse(data.toString())
      logger.debug('← Mensaje recibido:', message.type)

      switch (message.type) {
        case 'register_ack':
          logger.info('Registro confirmado por el servidor')
          break

        case 'command':
          this.handleCommand(message)
          break

        case 'pong':
          // Heartbeat response
          break

        default:
          logger.warn('Tipo de mensaje desconocido:', message.type)
      }
    } catch (error) {
      logger.error('Error procesando mensaje:', error.message)
    }
  }

  async handleCommand(message) {
    const { command, command_id, payload } = message
    
    logger.info(`Ejecutando comando: ${command}`)
    
    try {
      let result = null

      switch (command) {
        case 'get_telemetry':
          result = await this.ontClient.getTelemetry()
          break

        case 'sync_whitelist':
          result = await this.ontClient.configureMACWhitelist(payload.mac_addresses)
          break

        case 'get_parameter':
          result = await this.ontClient.getParameter(payload.parameter)
          break

        case 'set_parameter':
          result = await this.ontClient.setParameter(payload.parameter, payload.value)
          break

        case 'reboot':
          result = await this.ontClient.reboot()
          break

        default:
          throw new Error(`Comando no soportado: ${command}`)
      }

      // Enviar respuesta exitosa
      this.send({
        type: 'command_response',
        command_id,
        success: true,
        result
      })

      logger.success(`✓ Comando ejecutado: ${command}`)
    } catch (error) {
      logger.error(`✗ Error ejecutando comando ${command}:`, error.message)
      
      // Enviar respuesta de error
      this.send({
        type: 'command_response',
        command_id,
        success: false,
        error: error.message
      })
    }
  }

  onClose() {
    logger.warn('WebSocket desconectado')
    this.isConnected = false
    this.stopHeartbeat()
    this.stopTelemetry()
    this.scheduleReconnect()
  }

  onError(error) {
    logger.error('WebSocket error:', error.message)
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    logger.info('Reconectando en 5 segundos...')
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, 5000)
  }

  startHeartbeat() {
    const interval = parseInt(process.env.HEARTBEAT_INTERVAL) || 30000
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          agent_id: this.agentId,
          timestamp: new Date().toISOString()
        })
        logger.debug('→ Heartbeat enviado')
      }
    }, interval)
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  startTelemetry() {
    const interval = parseInt(process.env.TELEMETRY_INTERVAL) || 60000
    
    // Enviar telemetría inicial inmediatamente
    this.sendTelemetry()
    
    // Luego enviar periódicamente
    this.telemetryInterval = setInterval(() => {
      this.sendTelemetry()
    }, interval)
  }

  stopTelemetry() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval)
      this.telemetryInterval = null
    }
  }

  async sendTelemetry() {
    if (!this.isConnected) return

    try {
      const telemetry = await this.ontClient.getTelemetry()
      
      this.send({
        type: 'telemetry',
        agent_id: this.agentId,
        serial_number: this.serialNumber,
        data: telemetry,
        timestamp: new Date().toISOString()
      })

      logger.info(`→ Telemetría: RX=${telemetry.rxPower.toFixed(1)}dBm CPU=${telemetry.cpuLoad}% MEM=${telemetry.memLoad}%`)
    } catch (error) {
      logger.error('Error obteniendo telemetría:', error.message)
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  stop() {
    logger.info('Deteniendo agente...')
    this.stopHeartbeat()
    this.stopTelemetry()
    if (this.ws) {
      this.ws.close()
    }
  }
}

// Manejo de señales para shutdown graceful
const agent = new ACSAgent()

process.on('SIGINT', () => {
  console.log('')
  agent.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  agent.stop()
  process.exit(0)
})

// Iniciar agente
agent.start().catch((error) => {
  logger.error('Error fatal:', error)
  process.exit(1)
})
