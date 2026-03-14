import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Trash2, RefreshCw, Signal, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { deviceAPI } from '../lib/api'
import { toast } from 'sonner'

export function DeviceList() {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    serial_number: '',
    ip_wan: '',
    alias: ''
  })

  useEffect(() => {
    loadDevices()
  }, [])

  async function loadDevices() {
    try {
      setLoading(true)
      const data = await deviceAPI.getAll()
      setDevices(data)
    } catch (error) {
      console.error('Error loading devices:', error)
      toast.error('Error al cargar dispositivos')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      await deviceAPI.create(formData)
      toast.success('Dispositivo registrado exitosamente')
      setDialogOpen(false)
      setFormData({ serial_number: '', ip_wan: '', alias: '' })
      loadDevices()
    } catch (error) {
      console.error('Error creating device:', error)
      toast.error('Error al crear dispositivo')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este dispositivo?')) return
    
    try {
      await deviceAPI.delete(id)
      toast.success('Dispositivo eliminado')
      loadDevices()
    } catch (error) {
      console.error('Error deleting device:', error)
      toast.error('Error al eliminar dispositivo')
    }
  }

  async function handleSyncWhitelist(id: string) {
    try {
      await deviceAPI.syncWhitelist(id)
      toast.success('Whitelist sincronizada vía TR-069')
      loadDevices()
    } catch (error) {
      console.error('Error syncing whitelist:', error)
      toast.error('Error al sincronizar whitelist')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dispositivos ONT</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de Huawei EchoLife EG8245W5-6T
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDevices}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Registrar ONT
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Registrar Nueva ONT</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Ingresa los datos del dispositivo para conectarlo al ACS
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="serial">Número de Serie</Label>
                  <Input
                    id="serial"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="HWT12345678"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label htmlFor="ip">IP WAN</Label>
                  <Input
                    id="ip"
                    value={formData.ip_wan}
                    onChange={(e) => setFormData({ ...formData, ip_wan: e.target.value })}
                    placeholder="192.168.10.1"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label htmlFor="alias">Alias (Opcional)</Label>
                  <Input
                    id="alias"
                    value={formData.alias}
                    onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                    placeholder="ONT-Principal"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreate}
                  disabled={!formData.serial_number || !formData.ip_wan}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
          <p className="text-slate-400">Cargando dispositivos...</p>
        </div>
      ) : devices.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No hay dispositivos registrados</p>
            <p className="text-sm text-slate-500 mt-1">Haz clic en "Registrar ONT" para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {devices.map((device) => (
            <Card key={device.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg text-white">
                        {device.alias || device.serial_number}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className={device.status === 'online' 
                          ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                          : 'border-slate-500/50 text-slate-400 bg-slate-500/10'
                        }
                      >
                        <div className={`w-2 h-2 rounded-full mr-1.5 ${device.status === 'online' ? 'bg-green-400' : 'bg-slate-400'}`} />
                        {device.status === 'online' ? 'En línea' : 'Desconectado'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <CardDescription className="text-slate-400">
                        <span className="text-slate-500">Serial:</span> {device.serial_number}
                      </CardDescription>
                      <CardDescription className="text-slate-400">
                        <span className="text-slate-500">IP WAN:</span> {device.ip_wan}
                      </CardDescription>
                      <CardDescription className="text-slate-400 col-span-2">
                        <span className="text-slate-500">Última sincronización:</span>{' '}
                        {new Date(device.last_sync).toLocaleString('es-ES')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncWhitelist(device.id)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <Signal className="w-4 h-4 mr-1" />
                      Sync MAC
                    </Button>
                    <Link to={`/devices/${device.id}`}>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Ver Detalles
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(device.id)}
                      className="border-red-800 text-red-400 hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
