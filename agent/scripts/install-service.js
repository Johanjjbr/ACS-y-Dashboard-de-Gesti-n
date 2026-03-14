#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const serviceName = 'acs-agent'
const serviceFile = `/etc/systemd/system/${serviceName}.service`

const serviceContent = `[Unit]
Description=ACS Agent for Huawei ONT GPON
After=network.target

[Service]
Type=simple
User=${process.env.USER || 'root'}
WorkingDirectory=${projectRoot}
ExecStart=/usr/bin/node ${projectRoot}/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`

console.log('╔════════════════════════════════════════╗')
console.log('║  Instalador de Servicio Systemd       ║')
console.log('╚════════════════════════════════════════╝')
console.log('')

try {
  // Verificar que se ejecuta como root
  if (process.getuid && process.getuid() !== 0) {
    console.error('❌ Este script debe ejecutarse como root')
    console.error('   Ejecuta: sudo npm run install-service')
    process.exit(1)
  }

  console.log('📝 Creando archivo de servicio...')
  writeFileSync(serviceFile, serviceContent)
  console.log(`✓ Archivo creado: ${serviceFile}`)

  console.log('')
  console.log('🔄 Recargando systemd...')
  execSync('systemctl daemon-reload')
  console.log('✓ Systemd recargado')

  console.log('')
  console.log('✅ Servicio instalado correctamente')
  console.log('')
  console.log('Para gestionar el servicio:')
  console.log('')
  console.log('  Habilitar inicio automático:')
  console.log(`    sudo systemctl enable ${serviceName}`)
  console.log('')
  console.log('  Iniciar servicio:')
  console.log(`    sudo systemctl start ${serviceName}`)
  console.log('')
  console.log('  Ver estado:')
  console.log(`    sudo systemctl status ${serviceName}`)
  console.log('')
  console.log('  Ver logs:')
  console.log(`    journalctl -u ${serviceName} -f`)
  console.log('')

} catch (error) {
  console.error('❌ Error instalando servicio:', error.message)
  process.exit(1)
}
