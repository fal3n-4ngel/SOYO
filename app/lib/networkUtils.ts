// File: lib/networkUtils.ts
import { networkInterfaces, NetworkInterfaceInfo } from 'os'

export function getLocalIpAddresses(): string[] {
  const interfaces = networkInterfaces()
  const ipAddresses: string[] = []

  Object.values(interfaces).forEach((interfaceInfo) => {
    interfaceInfo?.forEach((info: NetworkInterfaceInfo) => {
      if (info.family === 'IPv4' && !info.internal) {
        ipAddresses.push(info.address)
      }
    })
  })

  return ipAddresses
}

export function isLocalNetwork(requestIp: string): boolean {
  const localIps = getLocalIpAddresses()
  return localIps.some(ip => requestIp.startsWith(ip.split('.').slice(0, 3).join('.')))
}