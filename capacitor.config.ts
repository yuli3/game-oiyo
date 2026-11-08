export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  backgroundColor?: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
    url?: string;
    cleartext?: boolean;
  };
  ios?: {
    contentInset?: 'automatic' | 'scrollableAxes' | 'never' | 'always';
    preferredContentMode?: 'mobile' | 'desktop';
    limitsNavigationsToAppBoundDomains?: boolean;
  };
  android?: {
    allowMixedContent?: boolean;
    captureInput?: boolean;
    backgroundColor?: string;
  };
  plugins?: Record<string, unknown>;
}

const config: CapacitorConfig = {
  appId: 'net.oiyo.game.neonsurvivor',
  appName: 'Neon Survivor: Cyberpunk Roguelike',
  webDir: 'dist',
  backgroundColor: '#0a0a0c',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: '#0a0a0c',
  },
  plugins: {
    Haptics: {
      // CoreHaptics enabled on native iOS/Android
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0a0a0c',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
