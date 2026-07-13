const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';

export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: `${wsProtocol}://${host}/ws`,
};
