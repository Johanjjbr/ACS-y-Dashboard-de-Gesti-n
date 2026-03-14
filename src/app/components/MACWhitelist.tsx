import { useEffect, useState } from 'react'
import { Plus, Trash2, RefreshCw, Shield, Power, PowerOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { whitelistAPI } from '../lib/api'
import { toast } from 'sonner'

export function MACWhitelist() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    mac_address: '',
    device_name: '',
    is_active: true
  })

  useEffect(() => {
    loadWhitelist()
  }, [])

  async function loadWhitelist() {
    try {
      setLoading(true)
      const data = await whitelistAPI.getAll()
      setEntries(data)
    } catch (error) {
      console.error('Error loading whitelist:', error)
      toast.error('Error al cargar whitelist')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      await whitelistAPI.add(formData)
      toast.success('Dirección MAC agregada a la whitelist')
      setDialogOpen(false)
      setFormData({ mac_address: '', device_name: '', is_active: true })
      loadWhitelist()
    } catch (error: any) {
      console.error('Error adding to whitelist:', error)
      toast.error(error.message || 'Error al agregar MAC')
    }
  }

  async function handleToggle(mac: string, currentState: boolean) {
    try {
      await whitelistAPI.update(mac, { is_active: !currentState })
      toast.success(`Filtro ${!currentState ? 'activado' : 'desactivado'}`)
      loadWhitelist()
    } catch (error) {
      console.error('Error toggling entry:', error)
      toast.error('Error al actualizar estado')
    }
  }

  async function handleDelete(mac: string) {
    if (!confirm('¿Eliminar esta dirección MAC?')) return
    
    try {
      await whitelistAPI.delete(mac)
      toast.success('Dirección MAC eliminada')
      loadWhitelist()
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Error al eliminar')
    }
  }

  const formatMAC = (mac: string) => {
    return mac.replace(/[:-]/g, '').match(/.{1,2}/g)?.join(':').toUpperCase() || mac
  }

  const activeCount = entries.filter(e => e.is_active).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Whitelist MAC</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de direcciones MAC autorizadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadWhitelist}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Agregar MAC
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Agregar Dirección MAC</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Registra una nueva dirección MAC en la whitelist
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mac">Dirección MAC</Label>
                  <Input
                    id="mac"
                    value={formData.mac_address}
                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    className="bg-slate-800 border-slate-700 font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Formato: XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX
                  </p>
                </div>
                <div>
                  <Label htmlFor="name">Nombre del Dispositivo</Label>
                  <Input
                    id="name"
                    value={formData.device_name}
                    onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                    placeholder="Laptop Office"
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Activar filtro</Label>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreate}
                  disabled={!formData.mac_address}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Agregar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total de Entradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{entries.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Filtros Activos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{activeCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Filtros Inactivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-400">{entries.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Direcciones MAC Registradas
          </CardTitle>
          <CardDescription className="text-slate-400">
            Sincronización automática vía TR-069/CWMP
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Cargando whitelist...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay direcciones MAC registradas</p>
              <p className="text-sm text-slate-500 mt-1">Haz clic en "Agregar MAC" para empezar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">Dirección MAC</TableHead>
                  <TableHead className="text-slate-400">Dispositivo</TableHead>
                  <TableHead className="text-slate-400">Estado</TableHead>
                  <TableHead className="text-slate-400">Fecha de Registro</TableHead>
                  <TableHead className="text-slate-400 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.mac_address} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-white">
                      {formatMAC(entry.mac_address)}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {entry.device_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={entry.is_active 
                          ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                          : 'border-slate-500/50 text-slate-400 bg-slate-500/10'
                        }
                      >
                        {entry.is_active ? (
                          <>
                            <Power className="w-3 h-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-3 h-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {new Date(entry.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggle(entry.mac_address, entry.is_active)}
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          {entry.is_active ? (
                            <>
                              <PowerOff className="w-3 h-3 mr-1" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <Power className="w-3 h-3 mr-1" />
                              Activar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(entry.mac_address)}
                          className="border-red-800 text-red-400 hover:bg-red-950"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Información de Sincronización</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400 space-y-2">
          <p>
            ✓ Los filtros activos se sincronizan automáticamente con todas las ONTs registradas
          </p>
          <p>
            ✓ Utiliza el protocolo TR-069 para aplicar cambios en tiempo real
          </p>
          <p>
            ✓ Los cambios se guardan en la configuración permanente del dispositivo
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
