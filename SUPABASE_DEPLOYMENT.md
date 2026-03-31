# Guía de Despliegue de Supabase

## Estado Actual del Proyecto

Tu proyecto Supabase ya está creado y configurado:

- **Project ID**: `faaqjsizafrszffotike`
- **URL**: https://faaqjsizafrszffotike.supabase.co
- **Región**: us-east-1
- **Funciones**: Se encuentran en `supabase/functions/server/`

## Funciones Disponibles para Desplegar

### 1. **Función Principal: `make-server-4bdedad9`**
- **Ubicación**: `supabase/functions/server/index.tsx`
- **Tipo**: Deno TypeScript
- **Funcionalidad**: 
  - WebSocket server para comunicación con agentes
  - Health check endpoint
  - Gestión de conexiones de agentes (register, heartbeat, telemetry, commands)
  - almacenamiento de claves-valor
  - Servicios TR-069

### 2. **Módulos Auxiliares**
- `kv_store.tsx`: Almacenamiento de clave-valor
- `tr069-service.tsx`: Servicios de TR-069 (CWMP - CPE WAN Management Protocol)

## Pasos para Desplegar

### Prerequisitos

1. **Acceso a Supabase Dashboard**
   - Ve a: https://app.supabase.com
   - Inicia sesión con tus credenciales

2. **Credenciales del Proyecto**
   - Project ID: `faaqjsizafrszffotike`
   - API Key (Anon): Ya está en `.env`
   - Service Role Key: **IMPORTANTE**: Obten esta del dashboard

### Opción 1: Despliegue Manual (Sin CLI)

Esta es la forma más directa desde el Dashboard de Supabase.

#### Pasos:

1. Abre: https://app.supabase.com/project/faaqjsizafrszffotike/functions

2. Haz clic en **"Create a new function"**

3. Configura la función:
   - **Name**: `make-server-4bdedad9`
   - **Language**: TypeScript (Deno)
   - **tipo**: HTTP

4. Copia el contenido de `supabase/functions/server/index.tsx` y pégalo en el editor

5. Configura las siguientes variables de entorno en la función:
   ```
   FUNCTION_NAME=make-server-4bdedad9
   ENVIRONMENT=production
   ```

6. Haz clic en **Deploy**

7. Prueba con:
   ```bash
   curl https://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/health
   ```

### Opción 2: Despliegue con CLI de Supabase (Recomendado)

#### Paso 1: Instalar Supabase CLI

**En Linux/Mac**:
```bash
brew install supabase/tap/supabase
```

**En Windows** (con Scoop):
```bash
scoop install supabase
```

O descargar directamente desde: https://github.com/supabase/cli/releases

#### Paso 2: Autenticar

```bash
supabase login
```

Se abrirá tu navegador. Autentica con tu cuenta de Supabase.

#### Paso 3: Vincular el Proyecto

```bash
supabase link --project-ref faaqjsizafrszffotike
```

Cuando se pida el password de la base de datos, usa la contraseña de tu proyecto Supabase.

#### Paso 4: Desplegar Funciones

```bash
supabase functions deploy
```

Esto desplegará todas las funciones en `supabase/functions/`.

#### Paso 5: Verificar Despliegue

```bash
# Listar funciones desplegadas
supabase functions list

# Ver logs de una función
supabase functions list
supabase functions list make-server-4bdedad9
```

### Opción 3: Despliegue Remoto (No Local)

Si no quieres instalar CLI localmente, puedes usar el dashboard directamente:

1. Abre: https://app.supabase.com/project/faaqjsizafrszffotike/functions
2. Nueva función → Copiar/Pegar código directamente desde VS Code
3. Configura dependencias si es necesario

## Prueba de Conectividad

Una vez desplegada, prueba la función:

### Health Check
```bash
curl https://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/health
```

### WebSocket (desde agente Node.js)
```javascript
const ws = new WebSocket('wss://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/ws');

ws.onopen = () => {
  console.log('Conectado al servidor ACS');
  ws.send(JSON.stringify({
    type: 'register',
    agent_id: 'agent-site-1',
    serial_number: 'HWTC44CFD29F'
  }));
};

ws.onmessage = (event) => {
  console.log('Mensaje:', event.data);
};
```

## Configuración del Agente después del Despliegue

Asegúrate de que el archivo `.env` del agente apunta al servidor desplegado:

```bash
# agent/.env
ACS_SERVER=wss://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/ws
ACS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Prueba el agente:
```bash
cd agent
npm install
npm run dev
```

## Variables de Entorno Requeridas

Asegúrate de tener estas variables configuradas en Supabase:

### En el Dashboard → Settings → Functions

- `FUNCTION_NAME`: `make-server-4bdedad9`
- `ENVIRONMENT`: `production` (o `development`)
- `LOG_LEVEL`: `info` (o `debug`)

## Monitoreo y Logs

### Ver logs de funciones:

**Con CLI**:
```bash
supabase functions logs make-server-4bdedad9
```

**En Dashboard**:
1. Ve a: https://app.supabase.com/project/faaqjsizafrszffotike/logs
2. Filtra por función: `make-server-4bdedad9`

## Troubleshooting

### "Function not found"
- Verifica que la función esté desplegada
- Intenta redeploy: `supabase functions deploy`

### "CORS Error"
- La función ya tiene CORS configurado en el código
- Si persiste, ve a Settings → Functions → CORS

### WebSocket Connection Refused
- Asegúrate que la URL es: `wss://faaqjsizafrszffotike.supabase.co/functions/v1/make-server-4bdedad9/ws`
- Nota: `wss://` (WebSocket Secure), no `ws://`

### Timeout en despliegue
- Verifica tu conexión a internet
- Reintentar: `supabase functions deploy`

## Siguientes Pasos

1. ✅ Desplegar funciones (esta guía)
2. ✅ Configurar agente local (agent/.env)
3. ✅ Iniciar agente: `cd agent && npm run dev`
4. ✅ Verificar conectividad en logs
5. 📊 Abrir dashboard en el navegador
6. 🚀 Iniciar monitoreo de dispositivos

## Recursos Útiles

- [Documentación Supabase Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [Deno Documentation](https://docs.deno.com/)
- [WebSocket en Deno](https://docs.deno.com/deploy/manual/simple-api#websockets)

---

**¿Necesitas ayuda?**
- Revisa los logs: `supabase functions logs`
- Contacta soporte: https://app.supabase.com/support

