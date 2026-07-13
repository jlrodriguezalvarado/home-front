const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: `${protocol}//${window.location.host}/ws`,
};
