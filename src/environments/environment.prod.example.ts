// Copy to environment.prod.ts (gitignored) before npm run build:prod.
// Dual-host Traefik: front on HOME_HOST, API on HOME_API_HOST.
export const environment = {
  production: true,
  apiUrl: 'https://api.example.com/api',
  wsUrl: 'wss://api.example.com/ws',
};
