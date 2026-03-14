import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Activity, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { deviceAPI } from '../lib/api'
import { toast } from 'sonner'

export function DeviceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState<any>(null)
  const [telemetry, setTelemetry] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadDeviceDetails()
      const interval = setInterval(() => loadTelemetry(), 10000) // Update every 10s
      return () => clearInterval(interval)
    }
  }, [id])

  async function loadDeviceDetails() {
    try {
      setLoading(true)
      const [deviceData, telemetryData, historyData] = await Promise.all([
        deviceAPI.getById(id!),
        deviceAPI.getTelemetry(id!),
        deviceAPI.getTelemetryHistory(id!)
      ])
      setDevice(deviceData)
      setTelemetry(telemetryData)
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading device details:', error)
      toast.error('Error al cargar detalles del dispositivo')
    } finally {
      setLoading(false)
    }
  }

  async function loadTelemetry() {
    try {
      const telemetryData = await deviceAPI.getTelemetry(id!)
      setTelemetry(telemetryData)
      
      // Update history
      const historyData = await deviceAPI.getTelemetryHistory(id!)
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading telemetry:', error)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
        <p className="text-slate-400">Cargando detalles...</p>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Dispositivo no encontrado</p>
      </div>
    )
  }

  const chartData = history.slice(0, 20).reverse().map((log, index) => ({
    time: new Date(log.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    rxPower: log.rx_power,
    cpu: log.cpu_load,
    memory: log.mem_load
  }))

  const getPowerStatus = (power: number) => {
    if (power > -8) return { status: 'Excelente', color: 'text-green-400' }
    if (power > -15) return { status: 'Buena', color: 'text-yellow-400' }
    return { status: 'Débil', color: 'text-red-400' }
  }

  const rxPowerStatus = telemetry ? getPowerStatus(telemetry.rxPower) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/devices')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white">{device.alias}</h2>
            <p className="text-sm text-slate-400">{device.serial_number}</p>
          </div>
          <Badge 
            variant="outline" 
            className={device.status === 'online' 
              ? 'border-green-500/50 text-green-400 bg-green-500/10' 
              : 'border-slate-500/50 text-slate-400 bg-slate-500/10'
            }
          >
            {device.status === 'online' ? 'En línea' : 'Desconectado'}
          </Badge>
        </div>
        <Button 
          size="sm" 
          onClick={loadTelemetry}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Telemetry Cards */}
      {telemetry && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Potencia RX</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {telemetry.rxPower.toFixed(2)} dBm
              </div>
              <p className={`text-xs mt-1 ${rxPowerStatus?.color}`}>
                {rxPowerStatus?.status}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Potencia TX</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {telemetry.txPower.toFixed(2)} dBm
              </div>
              <p className="text-xs text-green-400 mt-1">
                Normal
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Uso de CPU</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {telemetry.cpuLoad}%
              </div>
              <Progress value={telemetry.cpuLoad} className="h-2" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Uso de Memoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {telemetry.memLoad}%
              </div>
              <Progress value={telemetry.memLoad} className="h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Potencia Óptica RX
            </CardTitle>
            <CardDescription className="text-slate-400">
              Últimas 20 mediciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rxPower" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name="RX Power (dBm)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Recursos del Sistema
            </CardTitle>
            <CardDescription className="text-slate-400">
              CPU y Memoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  dot={false}
                  name="CPU %"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#ec4899" 
                  strokeWidth={2}
                  dot={false}
                  name="Memoria %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Device Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Información del Dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Modelo</p>
            <p className="text-white font-medium">EG8245W5-6T</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Fabricante</p>
            <p className="text-white font-medium">Huawei</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">IP WAN</p>
            <p className="text-white font-medium">{device.ip_wan}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Dispositivos Conectados</p>
            <p className="text-white font-medium">{telemetry?.connectedDevices || 0}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Tiempo de Actividad</p>
            <p className="text-white font-medium">
              {telemetry ? Math.floor(telemetry.upTime / 3600) : 0} horas
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Última Sincronización</p>
            <p className="text-white font-medium">
              {new Date(device.last_sync).toLocaleString('es-ES')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
