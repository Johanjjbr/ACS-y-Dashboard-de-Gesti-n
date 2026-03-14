import { useEffect, useState } from 'react'
import { Activity, RefreshCw, Wifi, Cpu, HardDrive, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { deviceAPI } from '../lib/api'
import { toast } from 'sonner'

export function Telemetry() {
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [telemetry, setTelemetry] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadDevices()
  }, [])

  useEffect(() => {
    if (selectedDevice) {
      loadTelemetry()
      
      if (autoRefresh) {
        const interval = setInterval(loadTelemetry, 5000) // Update every 5s
        return () => clearInterval(interval)
      }
    }
  }, [selectedDevice, autoRefresh])

  async function loadDevices() {
    try {
      const data = await deviceAPI.getAll()
      setDevices(data)
      if (data.length > 0 && !selectedDevice) {
        setSelectedDevice(data[0].id)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading devices:', error)
      toast.error('Error al cargar dispositivos')
      setLoading(false)
    }
  }

  async function loadTelemetry() {
    if (!selectedDevice) return
    
    try {
      const [telemetryData, historyData] = await Promise.all([
        deviceAPI.getTelemetry(selectedDevice),
        deviceAPI.getTelemetryHistory(selectedDevice)
      ])
      setTelemetry(telemetryData)
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading telemetry:', error)
    }
  }

  const chartData = history.slice(0, 30).reverse().map((log) => ({
    time: new Date(log.created_at).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }),
    rxPower: log.rx_power,
    cpu: log.cpu_load,
    memory: log.mem_load,
    devices: log.connected_devices
  }))

  const currentDevice = devices.find(d => d.id === selectedDevice)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Telemetría en Tiempo Real</h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitoreo continuo vía TR-069/CWMP
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh 
              ? 'border-green-700 text-green-400 bg-green-500/10' 
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }
          >
            <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          <Button 
            size="sm" 
            onClick={loadTelemetry}
            disabled={!selectedDevice}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Device Selector */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Seleccionar Dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Selecciona un dispositivo" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id} className="text-white">
                  {device.alias} - {device.serial_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDevice && telemetry && (
        <>
          {/* Real-time Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Potencia RX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">
                  {telemetry.rxPower.toFixed(1)}
                </div>
                <p className="text-xs text-slate-400 mt-1">dBm</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Uso de CPU
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-400">
                  {telemetry.cpuLoad}
                </div>
                <p className="text-xs text-slate-400 mt-1">%</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 border-pink-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Memoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-400">
                  {telemetry.memLoad}
                </div>
                <p className="text-xs text-slate-400 mt-1">%</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Dispositivos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {telemetry.connectedDevices}
                </div>
                <p className="text-xs text-slate-400 mt-1">conectados</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Potencia Óptica (RX)</CardTitle>
              <CardDescription className="text-slate-400">
                Últimas 30 mediciones - {currentDevice?.alias}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rxPower" 
                    stroke="#3b82f6" 
                    fill="url(#colorRx)"
                    strokeWidth={2}
                    name="RX Power (dBm)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Recursos del Sistema</CardTitle>
              <CardDescription className="text-slate-400">
                CPU y Memoria en tiempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="cpu" 
                    stroke="#a855f7" 
                    fill="url(#colorCpu)"
                    strokeWidth={2}
                    name="CPU %"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="memory" 
                    stroke="#ec4899" 
                    fill="url(#colorMem)"
                    strokeWidth={2}
                    name="Memoria %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Dispositivos Conectados</CardTitle>
              <CardDescription className="text-slate-400">
                Cantidad de dispositivos en la red local
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDevices" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="devices" 
                    stroke="#22c55e" 
                    fill="url(#colorDevices)"
                    strokeWidth={2}
                    name="Dispositivos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedDevice && !loading && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Selecciona un dispositivo para ver telemetría</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
