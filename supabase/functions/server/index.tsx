import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { upgradeWebSocket } from "npm:hono/deno";
import * as kv from "./kv_store.tsx";
import * as tr069 from "./tr069-service.tsx";

const app = new Hono();

// WebSocket connections map
const agentConnections = new Map();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
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

// Health check endpoint
app.get("/make-server-4bdedad9/health", (c) => {
  return c.json({ status: "ok" });
});

// Initialize demo data
app.post("/make-server-4bdedad9/init-demo", async (c) => {
  try {
    // Check if already initialized
    const existing = await kv.getByPrefix("ont_device:")
    if (existing.length > 0) {
      return c.json({ success: true, message: "Demo data already exists" })
    }

    // Create demo ONT devices
    const demoDevices = [
      {
        id: crypto.randomUUID(),
        serial_number: "HWT4872156923",
        ip_wan: "192.168.10.1",
        alias: "ONT-Central",
        last_sync: new Date().toISOString(),
        status: "online",
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        serial_number: "HWT4872156924",
        ip_wan: "192.168.10.2",
        alias: "ONT-Sucursal-Norte",
        last_sync: new Date().toISOString(),
        status: "online",
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        serial_number: "HWT4872156925",
        ip_wan: "192.168.10.3",
        alias: "ONT-Sucursal-Sur",
        last_sync: new Date(Date.now() - 3600000).toISOString(),
        status: "offline",
        created_at: new Date().toISOString()
      }
    ]

    for (const device of demoDevices) {
      await kv.set(`ont_device:${device.id}`, device)
    }

    // Create demo MAC whitelist entries
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
      },
      {
        mac_address: "AA:BB:CC:DD:EE:03",
        device_name: "Dispositivo Test",
        is_active: false,
        created_at: new Date().toISOString()
      }
    ]

    for (const entry of demoWhitelist) {
      await kv.set(`mac_whitelist:${entry.mac_address}`, entry)
    }

    console.log("Demo data initialized successfully")
    return c.json({ 
      success: true, 
      message: "Demo data created",
      devices: demoDevices.length,
      whitelist: demoWhitelist.length
    })
  } catch (error) {
    console.log("Error initializing demo data:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== ONT DEVICES ====================

// Get all ONT devices
app.get("/make-server-4bdedad9/devices", async (c) => {
  try {
    const devices = await kv.getByPrefix("ont_device:")
    return c.json({ success: true, data: devices })
  } catch (error) {
    console.log("Error fetching devices:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get single ONT device
app.get("/make-server-4bdedad9/devices/:id", async (c) => {
  try {
    const id = c.req.param("id")
    const device = await kv.get(`ont_device:${id}`)
    
    if (!device) {
      return c.json({ success: false, error: "Device not found" }, 404)
    }
    
    return c.json({ success: true, data: device })
  } catch (error) {
    console.log("Error fetching device:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Create ONT device
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
      status: "online",
      created_at: new Date().toISOString()
    }
    
    await kv.set(`ont_device:${id}`, device)
    
    console.log(`Created ONT device: ${serial_number}`)
    return c.json({ success: true, data: device }, 201)
  } catch (error) {
    console.log("Error creating device:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update ONT device
app.put("/make-server-4bdedad9/devices/:id", async (c) => {
  try {
    const id = c.req.param("id")
    const body = await c.req.json()
    
    const existing = await kv.get(`ont_device:${id}`)
    if (!existing) {
      return c.json({ success: false, error: "Device not found" }, 404)
    }
    
    const updated = {
      ...existing,
      ...body,
      id,
      last_sync: new Date().toISOString()
    }
    
    await kv.set(`ont_device:${id}`, updated)
    return c.json({ success: true, data: updated })
  } catch (error) {
    console.log("Error updating device:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Delete ONT device
app.delete("/make-server-4bdedad9/devices/:id", async (c) => {
  try {
    const id = c.req.param("id")
    await kv.del(`ont_device:${id}`)
    
    // Also delete associated telemetry
    const telemetryLogs = await kv.getByPrefix(`telemetry:${id}:`)
    for (const log of telemetryLogs) {
      await kv.del(`telemetry:${id}:${log.id}`)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.log("Error deleting device:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== TR-069 OPERATIONS ====================

// Get telemetry for a device
app.get("/make-server-4bdedad9/devices/:id/telemetry", async (c) => {
  try {
    const id = c.req.param("id")
    const device = await kv.get(`ont_device:${id}`)
    
    if (!device) {
      return c.json({ success: false, error: "Device not found" }, 404)
    }
    
    // Fetch real-time telemetry via TR-069
    const telemetry = await tr069.getTelemetry({
      serialNumber: device.serial_number,
      ipAddress: device.ip_wan,
      manufacturer: "Huawei",
      model: "EG8245W5-6T"
    })
    
    // Store telemetry log
    const logId = Date.now()
    const telemetryLog = {
      id: logId,
      ont_id: id,
      rx_power: telemetry.rxPower,
      tx_power: telemetry.txPower,
      cpu_load: telemetry.cpuLoad,
      mem_load: telemetry.memLoad,
      connected_devices: telemetry.connectedDevices,
      uptime: telemetry.upTime,
      created_at: new Date().toISOString()
    }
    
    await kv.set(`telemetry:${id}:${logId}`, telemetryLog)
    
    return c.json({ success: true, data: telemetry })
  } catch (error) {
    console.log("Error fetching telemetry:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Get telemetry history
app.get("/make-server-4bdedad9/devices/:id/telemetry/history", async (c) => {
  try {
    const id = c.req.param("id")
    const logs = await kv.getByPrefix(`telemetry:${id}:`)
    
    // Sort by timestamp descending
    const sorted = logs.sort((a, b) => b.id - a.id).slice(0, 50)
    
    return c.json({ success: true, data: sorted })
  } catch (error) {
    console.log("Error fetching telemetry history:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Sync MAC whitelist to device
app.post("/make-server-4bdedad9/devices/:id/sync-whitelist", async (c) => {
  try {
    const id = c.req.param("id")
    const device = await kv.get(`ont_device:${id}`)
    
    if (!device) {
      return c.json({ success: false, error: "Device not found" }, 404)
    }
    
    // Get active MAC addresses from whitelist
    const whitelist = await kv.getByPrefix("mac_whitelist:")
    const activeMacs = whitelist
      .filter(entry => entry.is_active)
      .map(entry => entry.mac_address)
    
    // Configure via TR-069
    const result = await tr069.configureMACWhitelist({
      serialNumber: device.serial_number,
      ipAddress: device.ip_wan,
      manufacturer: "Huawei",
      model: "EG8245W5-6T"
    }, activeMacs)
    
    if (result.success) {
      await kv.set(`ont_device:${id}`, {
        ...device,
        last_sync: new Date().toISOString()
      })
    }
    
    return c.json({ success: result.success, error: result.error })
  } catch (error) {
    console.log("Error syncing whitelist:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ==================== MAC WHITELIST ====================

// Get all MAC whitelist entries
app.get("/make-server-4bdedad9/whitelist", async (c) => {
  try {
    const entries = await kv.getByPrefix("mac_whitelist:")
    return c.json({ success: true, data: entries })
  } catch (error) {
    console.log("Error fetching whitelist:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Add MAC to whitelist
app.post("/make-server-4bdedad9/whitelist", async (c) => {
  try {
    const body = await c.req.json()
    const { mac_address, device_name, is_active = true } = body
    
    if (!mac_address) {
      return c.json({ success: false, error: "mac_address is required" }, 400)
    }
    
    // Validate MAC format
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
    
    console.log(`Added MAC to whitelist: ${mac_address}`)
    return c.json({ success: true, data: entry }, 201)
  } catch (error) {
    console.log("Error adding to whitelist:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Update MAC whitelist entry
app.put("/make-server-4bdedad9/whitelist/:mac", async (c) => {
  try {
    const mac = c.req.param("mac")
    const body = await c.req.json()
    
    const existing = await kv.get(`mac_whitelist:${mac}`)
    if (!existing) {
      return c.json({ success: false, error: "Entry not found" }, 404)
    }
    
    const updated = {
      ...existing,
      ...body,
      mac_address: mac
    }
    
    await kv.set(`mac_whitelist:${mac}`, updated)
    return c.json({ success: true, data: updated })
  } catch (error) {
    console.log("Error updating whitelist entry:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Delete MAC from whitelist
app.delete("/make-server-4bdedad9/whitelist/:mac", async (c) => {
  try {
    const mac = c.req.param("mac")
    await kv.del(`mac_whitelist:${mac}`)
    
    return c.json({ success: true })
  } catch (error) {
    console.log("Error deleting from whitelist:", error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

Deno.serve(app.fetch);