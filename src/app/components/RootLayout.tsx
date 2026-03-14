import { Outlet, Link, useLocation } from 'react-router'
import { Activity, Database, Network, Shield, LayoutDashboard } from 'lucide-react'
import { cn } from '../components/ui/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Dispositivos ONT', href: '/devices', icon: Network },
  { name: 'Whitelist MAC', href: '/whitelist', icon: Shield },
  { name: 'Telemetría', href: '/telemetry', icon: Activity }
]

export function RootLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ACS Huawei GPON</h1>
                <p className="text-xs text-slate-400">EchoLife EG8245W5-6T</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-md">
                <span className="text-xs font-medium text-green-400">Sistema Activo</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <nav className="flex gap-2 mb-6 border-b border-slate-800">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Page Content */}
        <Outlet />
      </div>
    </div>
  )
}
