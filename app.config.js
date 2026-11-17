// Layers env-dependent native config on top of app.json's static config.
// react-native-maps needs a Google Maps API key wired into the Android
// manifest to not crash when a MapView renders in a release/standalone
// build (Expo Go and dev client both tolerate its absence; a real APK does
// not). Kept out of app.json/version control: set GOOGLE_MAPS_API_KEY via
// an EAS environment variable (eas env:create) or a local .env for
// `expo run:android` / `eas build --local`.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
});
