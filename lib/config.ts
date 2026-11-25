// The API URL is the only env var. EXPO_PUBLIC_* values are public in the bundle.
// EXPO_PUBLIC_* values are inlined at bundle time from whatever .env a build
// had access to - a cloud EAS build has none unless it's set as an EAS env
// var, so this falls back to the known live API instead of throwing. A
// throw here would crash every launch of a build built without that var.
const FALLBACK_API_URL = 'https://gasapp.thelocalgodd.me/api/v1';
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  console.warn('EXPO_PUBLIC_API_URL is not set; falling back to the live API. Copy .env.example to .env and set it.');
}

export const API_URL = (rawApiUrl || FALLBACK_API_URL).replace(/\/+$/, '');

// Socket.IO connects to the API host, not to /api/v1.
export const SOCKET_URL = new URL(API_URL).origin;
