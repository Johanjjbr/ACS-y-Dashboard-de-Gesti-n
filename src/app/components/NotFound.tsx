import { Link } from 'react-router'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Página No Encontrada</h2>
      <p className="text-slate-400 mb-6">La ruta que buscas no existe</p>
      <Link to="/">
        <Button className="bg-blue-600 hover:bg-blue-700">
          Volver al Dashboard
        </Button>
      </Link>
    </div>
  )
}
