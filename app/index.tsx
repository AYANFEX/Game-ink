import { useRef, useEffect, useCallback } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation, ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

const APP_URL  = 'https://app.v1-0-0.gameink.abikaz.name.ng/spa/';
const APP_HOST = 'app.v1-0-0.gameink.abikaz.name.ng';

async function requestNotifications() {
  try {
    await Notifications.requestPermissionsAsync();
  } catch {}
}

export default function MainScreen() {
  const webViewRef = useRef<WebView>(null);
  const canGoBack  = useRef(false);
  const isReady    = useRef(false);

  useEffect(() => {
    requestNotifications();
  }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, []);

  const onLoad = useCallback(async () => {
    if (!isReady.current) {
      isReady.current = true;
      await SplashScreen.hideAsync();
    }
  }, []);

  const onNavigationStateChange = (state: WebViewNavigation) => {
    canGoBack.current = state.canGoBack;
  };

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
        onLoad={onLoad}
        onNavigationStateChange={onNavigationStateChange}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        overScrollMode="never"
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        renderLoading={() => <View style={styles.blank} />}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview:   { flex: 1, backgroundColor: '#000' },
  blank:     { flex: 1, backgroundColor: '#000' },
});
