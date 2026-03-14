import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Network, Shield, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { deviceAPI, whitelistAPI } from '../lib/api'
import { projectId, publicAnonKey } from '/utils/supabase/info'

export function Dashboard() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    whitelistEntries: 0,
    activeFilters: 0,
    loading: true
  })

  useEffect(() => {
    initializeApp()
  }, [])

  async function initializeApp() {
    try {
      // Try to load existing data
      const devices = await deviceAPI.getAll()
      
      // If no devices exist, initialize demo data
      if (devices.length === 0) {
        console.log('No data found, initializing demo data...')
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4bdedad9/init-demo`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
        await response.json()
      }
      
      // Load stats
      loadStats()
      const interval = setInterval(loadStats, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    } catch (error) {
      console.error('Error initializing app:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  async function loadStats() {
    try {
      const [devices, whitelist] = await Promise.all([
        deviceAPI.getAll(),
        whitelistAPI.getAll()
      ])

      setStats({
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.status === 'online').length,
        whitelistEntries: whitelist.length,
        activeFilters: whitelist.filter(w => w.is_active).length,
        loading: false
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  const statCards = [
    {
      title: 'ONTs Totales',
      value: stats.totalDevices,
      description: `${stats.onlineDevices} en línea`,
      icon: Network,
      color: 'blue',
      link: '/devices'
    },
    {
      title: 'Filtros MAC Activos',
      value: stats.activeFilters,
      description: `${stats.whitelistEntries} entradas totales`,
      icon: Shield,
      color: 'green',
      link: '/whitelist'
    },
    {
      title: 'Telemetría',
      value: 'En Tiempo Real',
      description: 'Monitoreo continuo',
      icon: Activity,
      color: 'purple',
      link: '/telemetry'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600/10 via-cyan-600/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Sistema de Autoconfiguración TR-069/CWMP
            </h2>
            <p className="text-slate-300 mb-4 max-w-2xl">
              Panel centralizado para gestión de flotas Huawei EchoLife EG8245W5-6T. 
              Protocolo TR-069 para configuración remota y telemetría en tiempo real.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>Servidor ACS Operativo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <Clock className="w-4 h-4" />
                <span>Última actualización: {new Date().toLocaleTimeString('es-ES')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
            green: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
            purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400'
          }

          return (
            <Link key={stat.title} to={stat.link}>
              <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[stat.color]} border flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {stats.loading ? '...' : stat.value}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-400" />
              Gestión de Dispositivos
            </CardTitle>
            <CardDescription className="text-slate-400">
              Registro, configuración y monitoreo de ONTs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link 
              to="/devices" 
              className="block p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="text-sm font-medium text-white">Ver todos los dispositivos</div>
              <div className="text-xs text-slate-400">Administrar ONTs registradas</div>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Control de Acceso
            </CardTitle>
            <CardDescription className="text-slate-400">
              Whitelist MAC y políticas de seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link 
              to="/whitelist" 
              className="block p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="text-sm font-medium text-white">Gestionar whitelist</div>
              <div className="text-xs text-slate-400">Sincronización vía TR-069</div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Information Box */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
            <p className="font-medium text-blue-400 mb-2">🔌 Arquitectura con Agentes Locales</p>
            <p className="text-slate-300 text-sm">
              Este sistema usa <strong>agentes locales</strong> que se ejecutan en cada sitio. 
              Los agentes se conectan a las ONTs localmente (192.168.10.1) y mantienen 
              una conexión WebSocket persistente con este servidor central.
            </p>
            <p className="text-slate-400 text-xs mt-2">
              ⚠️ Si tus ONTs no aparecen como "En línea", asegúrate de tener el agente ejecutándose 
              en la misma red que cada ONT. Ver documentación en <code>/agent/README.md</code>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-white mb-1">Protocolo Principal</p>
              <p className="text-slate-400">TR-069/CWMP para gestión a escala</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Credenciales ONT</p>
              <p className="text-slate-400">Usuario: admin@claro (192.168.10.1)</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Estrategia de Fallback</p>
              <p className="text-slate-400">Web Scraping para parámetros no expuestos</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Persistencia</p>
              <p className="text-slate-400">PostgreSQL vía KV Store</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}