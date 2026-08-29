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
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { deviceId } from '@/api/client';
import { loadCatalogue } from '@/store/catalogue';
import { purchases } from '@/purchases';
import { color } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * The whole navigation stack: one Stack, no tab bar.
 *
 * The app is a single loop — preview, generate, result, back to preview — and a
 * tab bar would be four permanent buttons under a screen that is mostly a
 * photograph. The profile is a push from the header, the paywall is a modal,
 * and that is the entire structure.
 *
 * The splash is held until the fonts are in. The design system is a serif for
 * statements and a sans for everything else, and a first frame in the system
 * font then reflowing into the real one is worse than a beat of splash.
 */
export default function RootLayout() {
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
    void deviceId().then((id) => purchases().configure(id));

    // Started behind the splash, which is held for the fonts anyway. In the
    // usual case — a cached manifest — storage has answered before the preview
    // screen mounts and its loading state is never seen.
    void loadCatalogue();
  }, []);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
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
    </SafeAreaProvider>
  );
}
