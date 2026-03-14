# 🚀 Inicio Rápido - Agente ACS Local

## Instalación en 3 Pasos

### 1️⃣ Preparar el entorno

Necesitas:
- Una computadora/Raspberry Pi en la misma red que la ONT
- Node.js 18+ instalado
- Acceso a la ONT en 192.168.10.1

### 2️⃣ Configurar el agente

```bash
cd agent
npm install
cp .env.example .env
```

Edita el archivo `.env`:

```bash
# Identificador único para este sitio
AGENT_ID=agent-sucursal-norte
AGENT_NAME=ONT Sucursal Norte

# Serial de tu ONT (búscalo en la etiqueta del equipo)
ONT_SERIAL=HWT4872156924

# Credenciales ONT (por defecto)
ONT_IP=192.168.10.1
ONT_USERNAME=admin@claro
ONT_PASSWORD=Gp0n2019CL4R0!

# Servidor ACS (ya configurado)
ACS_SERVER=wss://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/ws
ACS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3️⃣ Ejecutar el agente

```bash
npm start
```

Deberías ver:

```
╔════════════════════════════════════════╗
║   ACS Agent para Huawei ONT GPON      ║
╚════════════════════════════════════════╝

Agente: ONT Sucursal Norte (agent-sucursal-norte)
Serial: HWT4872156924
ONT IP: 192.168.10.1

Verificando conectividad con ONT local...
✓ ONT alcanzable

Conectando al servidor ACS...
✓ WebSocket conectado
✓ Agente registrado y activo

→ Telemetría: RX=-12.3dBm CPU=45% MEM=62%
```

## 🎯 Para Cada Sitio/ONT

Repite el proceso en cada ubicación:

### Sitio 1 (Central)
```bash
AGENT_ID=agent-central
AGENT_NAME=ONT Central
ONT_SERIAL=HWT4872156923
```

### Sitio 2 (Sucursal Norte)
```bash
AGENT_ID=agent-norte
AGENT_NAME=ONT Sucursal Norte
ONT_SERIAL=HWT4872156924
```

### Sitio 3 (Sucursal Sur)
```bash
AGENT_ID=agent-sur
AGENT_NAME=ONT Sucursal Sur
ONT_SERIAL=HWT4872156925
```

## 🔍 Verificación

Una vez que el agente esté corriendo:

1. Ve al dashboard web: https://tu-app.com
2. Navega a "Dispositivos ONT"
3. Deberías ver tu dispositivo en estado "En línea"
4. Ve a "Telemetría" para ver datos en tiempo real

## 📡 ¿Cómo funciona?

```
┌─────────────────────────┐
│  Dashboard Web (Cloud)  │  ← Tú accedes desde cualquier lugar
└───────────┬─────────────┘
            │ Internet
            │ WebSocket (WSS)
┌───────────▼─────────────┐
│  Agente Local (tu PC)   │  ← Corre en tu oficina/casa
└───────────┬─────────────┘
            │ Red Local
            │ 192.168.10.1
┌───────────▼─────────────┐
│  ONT Huawei (equipo)    │  ← El dispositivo físico
└─────────────────────────┘
```

**Ventajas**:
- ✅ No importa si la IP WAN cambia
- ✅ No necesitas abrir puertos en el router
- ✅ Las credenciales nunca salen de tu red local
- ✅ Funciona detrás de NAT
- ✅ Reconexión automática

## 🐳 Instalación con Docker (Recomendado para Producción)

```bash
# Construir imagen
docker build -t acs-agent .

# Ejecutar
docker run -d \
  --name acs-agent-central \
  --restart unless-stopped \
  --env-file .env \
  acs-agent

# Ver logs
docker logs -f acs-agent-central
```

## 🔧 Troubleshooting

### El agente no se conecta al servidor

```bash
# Test de conectividad
ping faaqjsizafrszffotike.supabase.co
```

### El agente no alcanza la ONT

```bash
# Verifica que estés en la misma red
ping 192.168.10.1

# Test de acceso web
curl -k https://192.168.10.1/
```

### Ver logs en tiempo real

```bash
npm start
# El agente mostrará todos los eventos en la consola
```

## 📊 Monitoreando el Agente

El agente envía automáticamente:

- **Heartbeat**: Cada 30 segundos (confirma que está vivo)
- **Telemetría**: Cada 60 segundos (potencia óptica, CPU, memoria, etc.)

Si el agente se desconecta:
- Reintenta la conexión cada 5 segundos
- El dashboard mostrará el dispositivo como "Desconectado"
- Cuando se reconecte, retoma el envío de telemetría

## 🛡️ Seguridad

- Las credenciales de la ONT **NUNCA** se envían al servidor
- La comunicación usa WebSocket Seguro (WSS/TLS)
- El agente solo envía resultados, no credenciales
- Autenticación con API Key

## ☁️ Instalación como Servicio (Linux)

Para que el agente se inicie automáticamente:

```bash
sudo npm run install-service
sudo systemctl enable acs-agent
sudo systemctl start acs-agent
```

Ver estado:
```bash
sudo systemctl status acs-agent
```

Ver logs:
```bash
journalctl -u acs-agent -f
```

## 💡 Tips

1. **Ejecuta el agente 24/7** para telemetría continua
2. **Usa una Raspberry Pi** como dispositivo dedicado (bajo consumo)
3. **Revisa los logs** regularmente para detectar problemas
4. **Configura alertas** en el dashboard para notificaciones

## ❓ Preguntas Frecuentes

**P: ¿Necesito abrir puertos en mi router?**
R: No, el agente solo hace conexiones salientes.

**P: ¿Qué pasa si cambio de IP?**
R: No afecta, el agente se conecta desde la red local.

**P: ¿Puedo tener múltiples ONTs en la misma red?**
R: Sí, pero cada ONT debe tener su propia IP o ejecutar un agente por ONT.

**P: ¿El agente consume muchos recursos?**
R: No, menos de 50MB RAM y CPU < 1%.

**P: ¿Funciona con otras marcas de ONT?**
R: No, está diseñado específicamente para Huawei EG8245W5-6T.
