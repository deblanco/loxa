import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { deviceId } from '@/api/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { flushDiagnostics, installDiagnostics, noteRoute, reportHandled } from '@/diagnostics';
import { loadLanguage } from '@/i18n';
import { loadCatalogue } from '@/store/catalogue';
import { purchases } from '@/purchases';
import { color } from '@/theme';

void SplashScreen.preventAutoHideAsync();

// At module scope, beside the splash, because both have to happen before any
// component mounts: a crash while the tree is still being built is exactly the
// one worth catching, and a handler armed inside an effect would miss it.
installDiagnostics();

/**
 * The whole navigation stack: one Stack, no tab bar.
 *
 * The app is a single loop — preview, generate, result, back to preview — and a
 * tab bar would be four permanent buttons under a screen that is mostly a
 * photograph. The profile is a push from the header, the paywall is a modal,
 * and that is the entire structure.
 *
 * The splash is held until the fonts and the language are in. The design
 * system is a serif for statements and a sans for everything else, and a first
 * frame in the system font then reflowing into the real one is worse than a
 * beat of splash. The language is held for the same reason and it is the same
 * beat: i18next starts on the phone's language synchronously, and this is only
 * the stored choice correcting it, which must not arrive as a flash of Spanish
 * on the entry carousel.
 */
export default function RootLayout() {
  const pathname = usePathname();
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  useEffect(() => {
    // The store's customer id is our anonymous device id, which is what lets an
    // app with no login screen still verify a purchase server-side.
    //
    // The three boots below are `void`ed, so until now a throw in any of them
    // was an unhandled rejection that went nowhere. They are caught rather than
    // awaited: none of them is allowed to hold the splash, and the app works
    // without any of them — it just works worse, which is the thing worth
    // hearing about.
    void deviceId()
      .then((id) => purchases().configure(id))
      .catch((err: unknown) => reportHandled(err, 'purchases.configure'));

    // Started behind the splash, which is held for the fonts anyway. In the
    // usual case — a cached manifest — storage has answered before the preview
    // screen mounts and its loading state is never seen.
    void loadCatalogue().catch((err: unknown) => reportHandled(err, 'loadCatalogue'));

    void loadLanguage()
      .catch((err: unknown) => reportHandled(err, 'loadLanguage'))
      .finally(() => setLanguageLoaded(true));
  }, []);

  const ready = fontsLoaded && languageLoaded;

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();
    // Behind the splash that was already held, and never on the crash path: a
    // report written on the launch that died is sent on this one.
    void flushDiagnostics();
  }, [ready]);

  // Which screen the user was on when it broke, and a breadcrumb for how they
  // got there. One hook here covers every route rather than a call per screen.
  useEffect(() => {
    noteRoute(pathname);
  }, [pathname]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {/* Inside the provider so the fallback screen has safe-area insets, and
          around the whole Stack so a screen that throws cannot take the app
          down to a white rectangle with no way back. */}
      <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.paper },
          animation: 'fade',
        }}
      >
        {/* The three night screens declare themselves, so the status bar and
            the transition background do not flash paper on the way in. */}
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: color.night } }} />
        <Stack.Screen name="camera" options={{ contentStyle: { backgroundColor: '#0b0a0a' } }} />
        <Stack.Screen
          name="result/[id]"
          options={{ contentStyle: { backgroundColor: color.night } }}
        />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'transparentModal', animation: 'none' }}
        />
      </Stack>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
