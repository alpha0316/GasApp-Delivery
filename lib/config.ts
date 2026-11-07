// The API URL is the only env var. EXPO_PUBLIC_* values are public in the bundle.
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and set it.');
}

export const API_URL = rawApiUrl.replace(/\/+$/, '');

// Socket.IO connects to the API host, not to /api/v1.
export const SOCKET_URL = new URL(API_URL).origin;
