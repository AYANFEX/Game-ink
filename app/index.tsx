import { useRef, useEffect, useCallback } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation, ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

// Keep splash visible until WebView is ready
SplashScreen.preventAutoHideAsync();

const APP_URL  = 'https://gameink.helioho.st/spa/';
const APP_HOST = 'gameink.helioho.st';

// ── Notification permission ────────────────────────────────────
async function requestNotifications() {
  try {
    await Notifications.requestPermissionsAsync();
  } catch {}
}

export default function MainScreen() {
  const webViewRef  = useRef<WebView>(null);
  const canGoBack   = useRef(false);
  const isReady     = useRef(false);

  // Request notification permission on first launch
  useEffect(() => {
    requestNotifications();
  }, []);

  // Android hardware back button — navigate back in WebView first
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) {
        webViewRef.current?.goBack();
        return true; // consumed
      }
      return false; // let system handle (exits app)
    });
    return () => handler.remove();
  }, []);

  // Hide splash once WebView has painted
  const onLoad = useCallback(async () => {
    if (!isReady.current) {
      isReady.current = true;
      await SplashScreen.hideAsync();
    }
  }, []);

  const onNavigationStateChange = (state: WebViewNavigation) => {
    canGoBack.current = state.canGoBack;
  };

  // Domain lock — anything outside APP_HOST opens in system browser
  const onShouldStartLoadWithRequest = (req: ShouldStartLoadRequest): boolean => {
    try {
      const { hostname } = new URL(req.url);
      if (hostname === APP_HOST) return true;
      Linking.openURL(req.url);
      return false;
    } catch {
      return false;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}

        // Lifecycle
        onLoad={onLoad}
        onNavigationStateChange={onNavigationStateChange}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}

        // JS & storage
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}

        // Media — shorts need this
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}

        // Feel — remove browser scroll bounce & scrollbars
        overScrollMode="never"
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}

        // No white flash while loading
        renderLoading={() => <View style={styles.blank} />}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  blank: {
    flex: 1,
    backgroundColor: '#000',
  },
});
