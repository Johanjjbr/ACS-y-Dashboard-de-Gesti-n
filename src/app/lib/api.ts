import { projectId, publicAnonKey } from '/utils/supabase/info'

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-4bdedad9`

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed')
  }

  return data.data
}

// Device API
export const deviceAPI = {
  getAll: () => apiRequest<any[]>('/devices'),
  getById: (id: string) => apiRequest<any>(`/devices/${id}`),
  create: (device: { serial_number: string; ip_wan: string; alias?: string }) =>
    apiRequest<any>('/devices', {
      method: 'POST',
      body: JSON.stringify(device)
    }),
  update: (id: string, updates: any) =>
    apiRequest<any>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
  delete: (id: string) =>
    apiRequest<void>(`/devices/${id}`, { method: 'DELETE' }),
  getTelemetry: (id: string) =>
    apiRequest<any>(`/devices/${id}/telemetry`),
  getTelemetryHistory: (id: string) =>
    apiRequest<any[]>(`/devices/${id}/telemetry/history`),
  syncWhitelist: (id: string) =>
    apiRequest<void>(`/devices/${id}/sync-whitelist`, { method: 'POST' })
}

// Whitelist API
export const whitelistAPI = {
  getAll: () => apiRequest<any[]>('/whitelist'),
  add: (entry: { mac_address: string; device_name?: string; is_active?: boolean }) =>
    apiRequest<any>('/whitelist', {
      method: 'POST',
      body: JSON.stringify(entry)
    }),
  update: (mac: string, updates: any) =>
    apiRequest<any>(`/whitelist/${mac}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
  delete: (mac: string) =>
    apiRequest<void>(`/whitelist/${mac}`, { method: 'DELETE' })
}
