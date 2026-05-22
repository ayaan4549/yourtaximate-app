import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yourtaximate.app",
  appName: "YourTaxiMate",
  webDir: "dist",

  // Embedded server — loads built files from disk, not a remote URL
  server: {
    androidScheme: "https",
    allowNavigation: [
      "*.supabase.co",      // Supabase API & auth
      "*.googleapis.com",   // Google Maps / Places (future)
    ],
  },

  android: {
    buildOptions: {
      releaseType: "AAB",   // Google Play requires .aab not .apk
    },
    backgroundColor: "#f8fafc",
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1e293b",   // Slate-900 — matches app header
      androidSplashResourceName: "splash",
      showSpinner: false,
    },

    StatusBar: {
      style: "DARK",
      backgroundColor: "#1e293b",
    },

    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },

    Geolocation: {
      // Required for live GPS tracking of driver location
    },

    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
