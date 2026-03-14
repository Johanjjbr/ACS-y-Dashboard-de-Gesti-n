# Agente Local ACS para ONT Huawei

## Descripción

Agente que se ejecuta localmente en la misma red que la ONT, estableciendo conexión persistente con el servidor ACS central mediante WebSocket.

## ¿Por qué un Agente Local?

### Problema
- ONTs con IP WAN dinámica (PPPoE cambia cada 30 min)
- No hay acceso directo a la red interna de la empresa
- Imposible conectarse desde el servidor ACS a las ONTs remotas

### Solución
- **Agente local** corre en la misma red que la ONT (puede ser Raspberry Pi, PC, etc.)
- Se conecta a la ONT por IP local fija (192.168.10.1)
- Establece WebSocket persistente con el servidor ACS central
- El agente ejecuta comandos TR-069 y reporta al servidor

## Arquitectura

```
┌─────────────────────────────────────────────┐
│  Servidor ACS Central (Supabase)            │
│  - Dashboard Web                             │
│  - WebSocket Server                          │
│  - Base de datos centralizada               │
└──────────────────┬──────────────────────────┘
                   │ WebSocket
                   │ (wss://)
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐    ┌───▼────┐    ┌───▼────┐
│ Agente │    │ Agente │    │ Agente │
│ Site 1 │    │ Site 2 │    │ Site 3 │
└───┬────┘    └───┬────┘    └───┬────┘
    │             │             │
    │ Local       │ Local       │ Local
    │ 192.168.    │ 192.168.    │ 192.168.
    │ 10.1        │ 10.1        │ 10.1
┌───▼────┐    ┌───▼────┐    ┌───▼────┐
│  ONT   │    │  ONT   │    │  ONT   │
│Huawei  │    │Huawei  │    │Huawei  │
└────────┘    └────────┘    └────────┘
```

## Instalación del Agente

### Requisitos

- Node.js 18+
- Acceso a la red local donde está la ONT
- Conectividad a internet para WebSocket

### Instalación

```bash
cd agent
npm install
```

### Configuración

Crear archivo `.env`:

```env
# Identificación del agente
AGENT_ID=agent-site-1
AGENT_NAME=ONT Central

# ONT local
ONT_IP=192.168.10.1
ONT_USERNAME=admin@claro
ONT_PASSWORD=Gp0n2019CL4R0!
ONT_SERIAL=HWT4872156923

# Servidor ACS Central
ACS_SERVER=wss://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/ws
ACS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Configuración
HEARTBEAT_INTERVAL=30000
TELEMETRY_INTERVAL=60000
```

### Ejecución

```bash
# Desarrollo
npm run dev

# Producción
npm start

# Como servicio (systemd)
sudo npm run install-service
```

## Funcionamiento

### 1. Inicio del Agente

```
[Agente] Conectando al servidor ACS...
[Agente] WebSocket conectado
[Agente] Registrando dispositivo: HWT4872156923
[Agente] Conectando a ONT local (192.168.10.1)...
[Agente] ✓ ONT alcanzable
[Agente] ✓ Agente listo
```

### 2. Comunicación Persistente

- **Heartbeat**: Cada 30 segundos envía "ping"
- **Telemetría**: Cada 60 segundos reporta métricas
- **Comandos**: El servidor puede enviar comandos en tiempo real

### 3. Protocolo de Mensajes

#### Heartbeat
```json
{
  "type": "heartbeat",
  "agent_id": "agent-site-1",
  "timestamp": "2026-03-14T10:30:00Z",
  "status": "online"
}
```

#### Telemetría
```json
{
  "type": "telemetry",
  "agent_id": "agent-site-1",
  "serial_number": "HWT4872156923",
  "data": {
    "rx_power": -12.5,
    "tx_power": 3.2,
    "cpu_load": 45,
    "mem_load": 62,
    "connected_devices": 8,
    "uptime": 345600
  },
  "timestamp": "2026-03-14T10:30:00Z"
}
```

#### Comando de Sincronización MAC
```json
{
  "type": "command",
  "command": "sync_whitelist",
  "agent_id": "agent-site-1",
  "payload": {
    "mac_addresses": [
      "AA:BB:CC:DD:EE:01",
      "AA:BB:CC:DD:EE:02"
    ]
  }
}
```

#### Respuesta
```json
{
  "type": "command_response",
  "command_id": "cmd-123",
  "success": true,
  "result": {
    "applied": 2,
    "failed": 0
  }
}
```

## Instalación como Servicio (Linux)

### Systemd Service

Crear `/etc/systemd/system/acs-agent.service`:

```ini
[Unit]
Description=ACS Agent for Huawei ONT
After=network.target

[Service]
Type=simple
User=acs-agent
WorkingDirectory=/opt/acs-agent
ExecStart=/usr/bin/node /opt/acs-agent/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Comandos

```bash
sudo systemctl daemon-reload
sudo systemctl enable acs-agent
sudo systemctl start acs-agent
sudo systemctl status acs-agent
```

## Instalación Rápida con Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

CMD ["node", "index.js"]
```

```bash
docker build -t acs-agent .
docker run -d \
  --name acs-agent-site1 \
  --restart unless-stopped \
  --env-file .env \
  acs-agent
```

## Monitoreo y Logs

```bash
# Ver logs en tiempo real
journalctl -u acs-agent -f

# Ver últimas 100 líneas
journalctl -u acs-agent -n 100

# Logs del día actual
journalctl -u acs-agent --since today
```

## Troubleshooting

### Agente no se conecta al servidor

```bash
# Verificar conectividad
ping faaqjsizafrszffotike.supabase.co

# Test WebSocket
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: faaqjsizafrszffotike.supabase.co" \
  https://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/ws
```

### Agente no alcanza la ONT

```bash
# Verificar conectividad local
ping 192.168.10.1

# Test HTTPS
curl -k https://192.168.10.1/

# Verificar credenciales
curl -k -u admin@claro:Gp0n2019CL4R0! https://192.168.10.1/
```

### Reintentos automáticos

El agente implementa reconexión automática:
- **WebSocket desconectado**: Reintenta cada 5 segundos
- **ONT no alcanzable**: Reintenta cada 30 segundos
- **Comando fallido**: 3 reintentos con backoff exponencial

## Seguridad

### Comunicación Cifrada

- **WebSocket Seguro (WSS)**: TLS 1.3
- **Autenticación**: API Key en headers
- **Verificación**: Serial Number del dispositivo

### Credenciales ONT

⚠️ **IMPORTANTE**: Nunca enviar credenciales al servidor
- Las credenciales se quedan en el agente local
- Solo se envían resultados de las operaciones
- El servidor nunca conoce la contraseña de la ONT

## Ventajas de esta Arquitectura

✅ **IP Dinámica**: No importa que la IP WAN cambie
✅ **NAT Transparente**: El agente sale desde la red local
✅ **Firewall-friendly**: Solo conexiones salientes
✅ **Escalable**: Agregar más ONTs = agregar más agentes
✅ **Resiliente**: Reconexión automática
✅ **Seguro**: Credenciales nunca salen de la red local
