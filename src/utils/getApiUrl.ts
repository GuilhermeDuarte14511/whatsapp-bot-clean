import os from 'os';

export function getLocalApiUrl(port = 3001): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return `http://${iface.address}:${port}`;
      }
    }
  }
  return `http://localhost:${port}`;
}

export function getApiUrl(): string {
  const portStr = process.env.PORT || '3001';
  const port = Number(portStr);
  return getLocalApiUrl(port);
}
