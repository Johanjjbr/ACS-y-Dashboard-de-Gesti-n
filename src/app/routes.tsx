import { createBrowserRouter } from 'react-router'
import { RootLayout } from './components/RootLayout'
import { Dashboard } from './components/Dashboard'
import { DeviceList } from './components/DeviceList'
import { DeviceDetails } from './components/DeviceDetails'
import { MACWhitelist } from './components/MACWhitelist'
import { Telemetry } from './components/Telemetry'
import { NotFound } from './components/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'devices', Component: DeviceList },
      { path: 'devices/:id', Component: DeviceDetails },
      { path: 'whitelist', Component: MACWhitelist },
      { path: 'telemetry', Component: Telemetry },
      { path: '*', Component: NotFound }
    ]
  }
])
