import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { upgradeWebSocket } from "npm:hono/deno";
import * as kv from "./kv_store.tsx";
import * as tr069 from "./tr069-service.tsx";

const app = new Hono();

// WebSocket connections map: agentId -> WebSocket
const agentConnections = new Map();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
app.get("/make-server-4bdedad9/health", (c) => {
  return c.json({ status: "ok", agents: agentConnections.size });
});

// ==================== WEBSOCKET AGENT ENDPOINT ====================

app.get('/make-server-4bdedad9/ws', async (c) => {
  const { socket, response } = Deno.upgradeWebSocket(c.req.raw)

  let agentSerial: string | null = null

  socket.onopen = () => {
    console.log('[WS] Agent connected')
    socket.send(JSON.stringify({ type: 'connected', message: 'ACS server ready' }))
  }

  socket.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data as string)
      console.log(`[WS] type=${msg.type} agent=${msg.agent_id ?? '?'}`)

      switch (msg.type) {
        case 'register': {
          agentSerial = msg.serial_number
          const { serial_number, agent_name } = msg

          const existing = await kv.getByPrefix('ont_device:')
          const match = existing.find((d: any) => d.serial_number === serial_number)

          if (match) {
            await kv.set(`ont_device:${match.id}`, {
              ...match,
              status: 'online',
              alias: match.alias || agent_name,
              last_sync: new Date().toISOString(),
            })
          } else {
            const id = crypto.randomUUID()
            await kv.set(`ont_device:${id}`, {
              id,
              serial_number,
              ip_wan: 'via-agent',
              alias: agent_name || `ONT-${serial_number.slice(-4)}`,
              status: 'online',
              last_sync: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })
          }

          socket.send(JSON.stringify({ type: 'register_ack', agent_id: msg.agent_id }))
          console.log(`[WS] Registered serial=${serial_number}`)
          break
        }

        case 'heartbeat': {
          if (agentSerial) {
            const devices = await kv.getByPrefix('ont_device:')
            const match = devices.find((d: any) => d.serial_number === agentSerial)
            if (match) {
              await kv.set(`ont_device:${match.id}`, {
                ...match,
                status: 'online',
                last_sync: new Date().toISOString(),
              })
            }
          }
          socket.send(JSON.stringify({ type: 'pong' }))
          break
        }

        case 'telemetry': {
          const { serial_number, data } = msg
          const devices = await kv.getByPrefix('ont_device:')
          const device = devices.find((d: any) => d.serial_number === serial_number)
          if (device) {
            const logId = Date.now()
            await kv.set(`telemetry:${device.id}:${logId}`, {
              id: logId,
              ont_id: device.id,
              rx_power: data.rxPower,
              tx_power: data.txPower,
              cpu_load: data.cpuLoad,
              mem_load: data.memLoad,
              connected_devices: data.connectedDevices,
              uptime: data.upTime,
              created_at: new Date().toISOString(),
            })
            await kv.set(`ont_device:${device.id}`, {
              ...device,
              status: 'online',
              last_sync: new Date().toISOString(),
            })
          }
          break
        }

        case 'command_response':
          console.log(`[WS] Command response:`, msg)
          break

        default:
          console.log(`[WS] Unknown type: ${msg.type}`)
      }
    } catch (err) {
      console.error('[WS] Error:', err)
    }
  }

  socket.onclose = async () => {
    console.log(`[WS] Agent disconnected: serial=${agentSerial}`)
    if (agentSerial) {
      const devices = await kv.getByPrefix('ont_device:')
      const match = devices.find((d: any) => d.serial_number === agentSerial)
      if (match) {
        await kv.set(`ont_device:${match.id}`, {
          ...match,
          status: 'offline',
          last_sync: new Date().toISOString(),
        })
      }
    }
  }

  socket.onerror = (e) => console.error('[WS] Socket error:', e)

  return response
})
// ==================== INIT DEMO ====================

app.post("/make-server-4bdedad9/init-demo", async (c) => {
  try {
    const existing = await kv.getByPrefix("ont_device:")
    if (existing.length > 0) {
      return c.json({ success: true, message: "Demo data already exists" })
    }

    const demoDevices = [
      {
        id: crypto.randomUUID(),
        serial_number: "HWT4872156923",
        ip_wan: "192.168.100.1",
        alias: "ONT-Central",
        last_sync: new Date().toISOString(),
        status: "offline",
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        serial_number: "HWT4872156924",
        ip_wan: "192.168.100.2",
        alias: "ONT-Sucursal-Norte",
        last_sync: new Date().toISOString(),
        status: "offline",
        created_at: new Date().toISOString()
      }
    ]

    for (const device of demoDevices) {
      await kv.set(`ont_device:${device.id}`, device)
    }

    const demoWhitelist = [
      {
        mac_address: "AA:BB:CC:DD:EE:01",
        device_name: "Laptop Administrador",
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        mac_address: "AA:BB:CC:DD:EE:02",
        device_name: "Servidor Interno",
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]

    for (const entry of demoWhitelist) {
      await kv.set(`mac_whitelist:${entry.mac_address}`, entry)
    }

    return c.json({ success: true, message: "Demo data created" })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== ONT DEVICES ====================

app.get("/make-server-4bdedad9/devices", async (c) => {
  try {
    const devices = await kv.getByPrefix("ont_device:")
    return c.json({ success: true, data: devices })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get("/make-server-4bdedad9/devices/:id", async (c) => {
  try {
    const id = c.req.param("id")
    const device = await kv.get(`ont_device:${id}`)
    if (!device) return c.json({ success: false, error: "Device not found" }, 404)
    return c.json({ success: true, data: device })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post("/make-server-4bdedad9/devices", async (c) => {
  try {
    const body = await c.req.json()
    const { serial_number, ip_wan, alias } = body
    if (!serial_number || !ip_wan) {
      return c.json({ success: false, error: "serial_number and ip_wan are required" }, 400)
    }
    const id = crypto.randomUUID()
    const device = {
      id,
      serial_number,
      ip_wan,
      alias: alias || `ONT-${serial_number.slice(-4)}`,
      last_sync: new Date().toISOString(),
      status: "offline",
      created_at: new Date().toISOString()
    }
    await kv.set(`ont_device:${id}`, device)
    return c.json({ success: true, data: device }, 201)
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put("/make-server-4bdedad9/devices/:id", async (c) => {
  try {
    const id = c.req.param("id")
    const body = await c.req.json()
    const existing = await kv.get(`ont_device:${id}`)
    if (!existing) return c.json({ success: false, error: "Device not found" }, 404)
    const updated = { ...existing, ...body, id, last_sync: new Date().toISOString() }
    await kv.set(`ont_device:${id}`, updated)
    return c.json({ success: true, data: updated })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.delete("/make-server-4bdedad9/devices/:id", async (c) => {
  try {
    const id = c.req.param("id")
    await kv.del(`ont_device:${id}`)
    const telemetryLogs = await kv.getByPrefix(`telemetry:${id}:`)
    for (const log of telemetryLogs) {
      await kv.del(`telemetry:${id}:${log.id}`)
    }
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== TR-069 OPERATIONS ====================

app.get("/make-server-4bdedad9/devices/:id/telemetry", async (c) => {
  try {
    const id = c.req.param("id")
    const device = await kv.get(`ont_device:${id}`)
    if (!device) return c.json({ success: false, error: "Device not found" }, 404)

    // Si hay un agente conectado para este dispositivo, obtener telemetría real
    const agentWs = agentConnections.get(device.agent_id)
    if (agentWs) {
      // El agente enviará telemetría por WS, usamos TR-069 simulado mientras tanto
    }

    const telemetry = await tr069.getTelemetry({
      serialNumber: device.serial_number,
      ipAddress: device.ip_wan,
      manufacturer: "Huawei",
      model: "EG8245W5-6T"
    })

    const logId = Date.now()
    await kv.set(`telemetry:${id}:${logId}`, {
      id: logId,
      ont_id: id,
      rx_power: telemetry.rxPower,
      tx_power: telemetry.txPower,
      cpu_load: telemetry.cpuLoad,
      mem_load: telemetry.memLoad,
      connected_devices: telemetry.connectedDevices,
      uptime: telemetry.upTime,
      created_at: new Date().toISOString()
    })

    return c.json({ success: true, data: telemetry })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get("/make-server-4bdedad9/devices/:id/telemetry/history", async (c) => {
  try {
    const id = c.req.param("id")
    const logs = await kv.getByPrefix(`telemetry:${id}:`)
    const sorted = logs.sort((a: any, b: any) => b.id - a.id).slice(0, 50)
    return c.json({ success: true, data: sorted })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post("/make-server-4bdedad9/devices/:id/sync-whitelist", async (c) => {
  try {
    const id = c.req.param("id")
    const device = await kv.get(`ont_device:${id}`)
    if (!device) return c.json({ success: false, error: "Device not found" }, 404)

    const whitelist = await kv.getByPrefix("mac_whitelist:")
    const activeMacs = whitelist
      .filter((entry: any) => entry.is_active)
      .map((entry: any) => entry.mac_address)

    // Si hay agente conectado, enviar comando por WebSocket
    const agentWs = agentConnections.get(device.agent_id)
    if (agentWs) {
      agentWs.send(JSON.stringify({
        type: 'command',
        command: 'sync_whitelist',
        command_id: crypto.randomUUID(),
        payload: { mac_addresses: activeMacs }
      }))
    }

    const result = await tr069.configureMACWhitelist({
      serialNumber: device.serial_number,
      ipAddress: device.ip_wan,
      manufacturer: "Huawei",
      model: "EG8245W5-6T"
    }, activeMacs)

    if (result.success) {
      await kv.set(`ont_device:${id}`, { ...device, last_sync: new Date().toISOString() })
    }

    return c.json({ success: result.success, error: result.error })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== MAC WHITELIST ====================

app.get("/make-server-4bdedad9/whitelist", async (c) => {
  try {
    const entries = await kv.getByPrefix("mac_whitelist:")
    return c.json({ success: true, data: entries })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post("/make-server-4bdedad9/whitelist", async (c) => {
  try {
    const body = await c.req.json()
    const { mac_address, device_name, is_active = true } = body
    if (!mac_address) return c.json({ success: false, error: "mac_address is required" }, 400)

    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
    if (!macRegex.test(mac_address)) {
      return c.json({ success: false, error: "Invalid MAC address format" }, 400)
    }

    const entry = {
      mac_address: mac_address.toUpperCase(),
      device_name: device_name || "Unknown Device",
      is_active,
      created_at: new Date().toISOString()
    }
    await kv.set(`mac_whitelist:${mac_address}`, entry)
    return c.json({ success: true, data: entry }, 201)
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put("/make-server-4bdedad9/whitelist/:mac", async (c) => {
  try {
    const mac = c.req.param("mac")
    const body = await c.req.json()
    const existing = await kv.get(`mac_whitelist:${mac}`)
    if (!existing) return c.json({ success: false, error: "Entry not found" }, 404)
    const updated = { ...existing, ...body, mac_address: mac }
    await kv.set(`mac_whitelist:${mac}`, updated)
    return c.json({ success: true, data: updated })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.delete("/make-server-4bdedad9/whitelist/:mac", async (c) => {
  try {
    const mac = c.req.param("mac")
    await kv.del(`mac_whitelist:${mac}`)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Replace: Deno.serve(app.fetch)

Deno.serve((req) => {
  // Handle WebSocket BEFORE Hono — synchronous handler keeps the connection alive
  if (req.headers.get('upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req)

    let agentSerial: string | null = null

    socket.onopen = () => {
      console.log('[WS] Agent connected')
      socket.send(JSON.stringify({ type: 'connected', message: 'ACS server ready' }))
    }

    socket.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data as string)
        console.log(`[WS] type=${msg.type} agent=${msg.agent_id ?? '?'}`)

        switch (msg.type) {
          case 'register': {
            agentSerial = msg.serial_number
            const existing = await kv.getByPrefix('ont_device:')
            const match = existing.find((d: any) => d.serial_number === agentSerial)

            if (match) {
              await kv.set(`ont_device:${match.id}`, {
                ...match,
                status: 'online',
                alias: match.alias || msg.agent_name,
                last_sync: new Date().toISOString(),
              })
            } else {
              const id = crypto.randomUUID()
              await kv.set(`ont_device:${id}`, {
                id,
                serial_number: agentSerial,
                ip_wan: 'via-agent',
                alias: msg.agent_name || `ONT-${agentSerial!.slice(-4)}`,
                status: 'online',
                last_sync: new Date().toISOString(),
                created_at: new Date().toISOString(),
              })
            }

            socket.send(JSON.stringify({ type: 'register_ack', agent_id: msg.agent_id }))
            console.log(`[WS] Registered serial=${agentSerial}`)
            break
          }

          case 'heartbeat': {
            if (agentSerial) {
              const devices = await kv.getByPrefix('ont_device:')
              const match = devices.find((d: any) => d.serial_number === agentSerial)
              if (match) {
                await kv.set(`ont_device:${match.id}`, {
                  ...match,
                  status: 'online',
                  last_sync: new Date().toISOString(),
                })
              }
            }
            socket.send(JSON.stringify({ type: 'pong' }))
            break
          }

          case 'telemetry': {
            const { serial_number, data } = msg
            const devices = await kv.getByPrefix('ont_device:')
            const device = devices.find((d: any) => d.serial_number === serial_number)
            if (device) {
              const logId = Date.now()
              await kv.set(`telemetry:${device.id}:${logId}`, {
                id: logId,
                ont_id: device.id,
                rx_power: data.rxPower,
                tx_power: data.txPower,
                cpu_load: data.cpuLoad,
                mem_load: data.memLoad,
                connected_devices: data.connectedDevices,
                uptime: data.upTime,
                created_at: new Date().toISOString(),
              })
              await kv.set(`ont_device:${device.id}`, {
                ...device,
                status: 'online',
                last_sync: new Date().toISOString(),
              })
            }
            break
          }

          case 'command_response':
            console.log(`[WS] Command response:`, msg)
            break

          default:
            console.log(`[WS] Unknown type: ${msg.type}`)
        }
      } catch (err) {
        console.error('[WS] Error:', err)
      }
    }

    socket.onclose = async () => {
      console.log(`[WS] Disconnected: serial=${agentSerial}`)
      if (agentSerial) {
        const devices = await kv.getByPrefix('ont_device:')
        const match = devices.find((d: any) => d.serial_number === agentSerial)
        if (match) {
          await kv.set(`ont_device:${match.id}`, {
            ...match,
            status: 'offline',
            last_sync: new Date().toISOString(),
          })
        }
      }
    }

    socket.onerror = (e) => console.error('[WS] Error:', e)

    // Return synchronously — this is the critical difference
    return response
  }

  // All non-WebSocket requests go through Hono as normal
  return app.fetch(req)
})