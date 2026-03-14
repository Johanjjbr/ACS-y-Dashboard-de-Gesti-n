# Sistema ACS para Huawei GPON ONT

## Descripción

Dashboard de gestión centralizada para flotas de ONTs **Huawei EchoLife EG8245W5-6T** con protocolo TR-069/CWMP.

## ⚠️ ARQUITECTURA IMPORTANTE

Este sistema usa **agentes locales** que se ejecutan en cada sitio con las ONTs. Los agentes se conectan al servidor ACS central mediante WebSocket persistente.

### ¿Por qué Agentes Locales?

**Problema**:
- ONTs con IP WAN dinámica (PPPoE cambia cada 30 min)
- No hay acceso directo a la red interna remota
- IPs privadas detrás de NAT

**Solución**:
- Agente local corre en la misma red que la ONT
- Se conecta a la ONT por IP local fija (192.168.10.1)
- Mantiene WebSocket persistente con el servidor central
- El servidor envía comandos, el agente los ejecuta

```
Servidor ACS Central (Cloud)
        ↕ WebSocket (WSS)
    Agente Local (On-Premise)
        ↕ Local Network
    ONT Huawei (192.168.10.1)
```

## Características Principales

### 🌐 Gestión de Dispositivos ONT
- Registro y monitoreo de dispositivos
- Estado en tiempo real (online/offline)
- Información detallada de cada ONT
- Configuración remota vía TR-069

### 🛡️ Control de Acceso MAC
- Whitelist de direcciones MAC
- Sincronización automática con todos los dispositivos
- Activación/desactivación de filtros
- Validación de formato MAC

### ��� Telemetría en Tiempo Real
- **Potencia Óptica**: RX/TX en dBm
- **Recursos del Sistema**: CPU y Memoria
- **Dispositivos Conectados**: Conteo en tiempo real
- **Histórico**: Gráficos de últimas 30 mediciones
- **Auto-refresh**: Actualización automática cada 5 segundos

## Arquitectura

```
Frontend (React + Tailwind)
    ↓
Backend Server (Hono + Deno)
    ↓
TR-069 Service (Simulated)
    ↓
KV Store (PostgreSQL)
```

### Stack Tecnológico

- **Frontend**: React 18, React Router 7, Tailwind CSS v4
- **Backend**: Supabase Edge Functions, Hono, Deno
- **Gráficos**: Recharts
- **UI Components**: Radix UI
- **Notificaciones**: Sonner

## Rutas de la Aplicación

- `/` - Dashboard principal con estadísticas
- `/devices` - Lista de dispositivos ONT
- `/devices/:id` - Detalles y telemetría de un dispositivo
- `/whitelist` - Gestión de whitelist MAC
- `/telemetry` - Monitoreo en tiempo real

## API Endpoints

### Dispositivos ONT

```
GET    /make-server-4bdedad9/devices           - Listar todos
GET    /make-server-4bdedad9/devices/:id       - Obtener uno
POST   /make-server-4bdedad9/devices           - Crear
PUT    /make-server-4bdedad9/devices/:id       - Actualizar
DELETE /make-server-4bdedad9/devices/:id       - Eliminar
```

### Telemetría

```
GET  /make-server-4bdedad9/devices/:id/telemetry         - Telemetría actual
GET  /make-server-4bdedad9/devices/:id/telemetry/history - Histórico
POST /make-server-4bdedad9/devices/:id/sync-whitelist    - Sincronizar MAC
```

### Whitelist MAC

```
GET    /make-server-4bdedad9/whitelist      - Listar todas
POST   /make-server-4bdedad9/whitelist      - Agregar
PUT    /make-server-4bdedad9/whitelist/:mac - Actualizar
DELETE /make-server-4bdedad9/whitelist/:mac - Eliminar
```

## Protocolo TR-069/CWMP

### Parámetros Implementados

```javascript
// Información del Dispositivo
InternetGatewayDevice.DeviceInfo.SerialNumber
InternetGatewayDevice.DeviceInfo.SoftwareVersion
InternetGatewayDevice.DeviceInfo.UpTime

// Potencia Óptica
InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.OpticalInfo.ReceiveOpticalPower
InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.OpticalInfo.TransmitOpticalPower

// Recursos
InternetGatewayDevice.DeviceInfo.CPU
InternetGatewayDevice.DeviceInfo.Memory

// Dispositivos Conectados
InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries

// Filtrado MAC
InternetGatewayDevice.Layer2Bridging.Filter.{i}.FilterEnable
InternetGatewayDevice.Layer2Bridging.Filter.{i}.SourceMACAddress
```

### Operaciones RPC

- **GetParameterValues**: Obtener valores de parámetros
- **SetParameterValues**: Configurar parámetros
- **GetParameterNames**: Descubrir modelo de datos
- **SaveConfiguration**: Guardar configuración permanente

## Datos de Acceso

### ONT Huawei EG8245W5-6T

- **IP Local**: 192.168.10.1
- **Puerto**: 443 (HTTPS)
- **Usuario**: admin@claro
- **Password**: Gp0n2019CL4R0!

⚠️ **Nota de Seguridad**: Este sistema está diseñado para entornos de desarrollo/pruebas. No exponer credenciales en producción.

## Estructura de Datos

### ONT Device

```typescript
{
  id: string (UUID)
  serial_number: string
  ip_wan: string
  alias: string
  last_sync: string (ISO 8601)
  status: "online" | "offline"
  created_at: string
}
```

### MAC Whitelist Entry

```typescript
{
  mac_address: string (formato: XX:XX:XX:XX:XX:XX)
  device_name: string
  is_active: boolean
  created_at: string
}
```

### Telemetry Log

```typescript
{
  id: number (timestamp)
  ont_id: string (UUID)
  rx_power: number (dBm)
  tx_power: number (dBm)
  cpu_load: number (0-100)
  mem_load: number (0-100)
  connected_devices: number
  uptime: number (seconds)
  created_at: string
}
```

## Flujo de Trabajo

### 1. Registrar un Dispositivo ONT

1. Ir a "Dispositivos ONT"
2. Clic en "Registrar ONT"
3. Ingresar:
   - Número de Serie
   - IP WAN
   - Alias (opcional)
4. El sistema establece conexión TR-069 automáticamente

### 2. Configurar Whitelist MAC

1. Ir a "Whitelist MAC"
2. Clic en "Agregar MAC"
3. Ingresar dirección MAC (formato validado)
4. Asignar nombre descriptivo
5. Activar/desactivar según necesidad

### 3. Sincronizar Whitelist a ONT

1. En lista de dispositivos, clic en "Sync MAC"
2. El sistema:
   - Obtiene todas las MACs activas
   - Configura vía TR-069
   - Guarda configuración en el dispositivo
   - Actualiza timestamp de sincronización

### 4. Monitorear Telemetría

1. Ir a "Telemetría"
2. Seleccionar dispositivo
3. Activar "Auto-Refresh" para monitoreo continuo
4. Visualizar gráficos históricos

## Estrategia de Implementación

### Protocolo Principal: TR-069

- Gestión a escala de flotas de ONTs
- Configuración remota estandarizada
- Telemetría periódica automática
- Validación de parámetros post-configuración

### Fallback: Web Scraping

**Solo para casos específicos**:
- Parámetros no expuestos en modelo TR-069
- Configuración inicial del ACS en la ONT
- Funciones no disponibles vía CWMP

**Implementación con Playwright**:
```typescript
// Navegación a Maintenance Diagnosis > Configuration File Management
// Ejecución de comando "Save"
// Manejo de "Concurrent Login" con reintentos
```

## Limitaciones y Consideraciones

⚠️ **Importante**:

1. **Simulación**: El servicio TR-069 actual está SIMULADO para demostración
2. **Producción**: Requiere integración con GenieACS, cpe-stack o similar
3. **Autenticación**: Las credenciales deben manejarse con variables de entorno
4. **Concurrencia**: Implementar cola de trabajos para operaciones masivas
5. **Validación**: Siempre verificar con `GetParameterValues` post-configuración

## Reglas de Desarrollo

### TypeScript Strict Mode

```typescript
// ✅ Correcto
const device: ONTDevice = await deviceAPI.getById(id)

// ❌ Incorrecto
const device = await deviceAPI.getById(id) // Tipo implícito
```

### Single Quotes, No Semicolons

```typescript
// ✅ Correcto
import { deviceAPI } from '../lib/api'

// ❌ Incorrecto
import { deviceAPI } from "../lib/api";
```

### Arquitectura Limpia

```
/supabase/functions/server/
  ├── index.tsx           # Rutas HTTP
  ├── tr069-service.tsx   # Lógica de red TR-069
  └── kv_store.tsx        # Persistencia (protegido)

/src/app/
  ├── components/         # UI Components
  ├── lib/               # API clients
  └── routes.tsx         # Routing
```

## Próximos Pasos

- [ ] Integrar GenieACS real
- [ ] Implementar autenticación de usuarios
- [ ] Sistema de notificaciones push
- [ ] Export de reportes en PDF/CSV
- [ ] Alertas configurables (potencia baja, CPU alta, etc.)
- [ ] Panel de configuración masiva
- [ ] Backup/Restore de configuraciones

## Contacto y Soporte

Sistema desarrollado para gestión de infraestructura GPON con enfoque en automatización y monitoreo en tiempo real.