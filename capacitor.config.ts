export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: string;
    url?: string;
    cleartext?: boolean;
  };
  plugins?: Record<string, unknown>;
}

const config: CapacitorConfig = {
  appId: 'net.oiyo.game.neonsurvivor',
  appName: 'Neon Survivor: Cyberpunk Roguelike',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Haptics: {
      // CoreHaptics enabled on iOS
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
  },
};

export default config;
