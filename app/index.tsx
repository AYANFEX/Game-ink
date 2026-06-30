import { useRef, useEffect, useCallback, useState } from 'react';
import {
  BackHandler, StyleSheet, View, Text, TouchableOpacity,
  Animated, Easing, Dimensions, Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation, ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

const APP_URL     = 'https://app.v1-0-0.gameink.abikaz.name.ng/';
const APP_HOST    = 'app.v1-0-0.gameink.abikaz.name.ng';
const TOKEN_URL   = 'https://app.v1-0-0.gameink.abikaz.name.ng/api/register-push-token.php';
const SHIMMER_DELAY = 150;
const LOAD_TIMEOUT  = 8000; // 8s — if page hasn't loaded by then, show timeout page
const { width, height } = Dimensions.get('window');

// ── Push notification setup ───────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

async function registerForPushNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[FCM] Permission denied');
      return;
    }

    // Get raw FCM device token (not Expo token)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken  = tokenData.data;
    console.log('[FCM] Token:', fcmToken.slice(0, 20) + '...');

    // Send to backend
    await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: fcmToken }),
    });
  } catch (e) {
    console.warn('[FCM] Setup failed:', e);
  }
}

// ── Shimmer — dark grey, no green ────────────────────────────
function ShimmerBar({ w, h, mt = 0, radius = 6 }: {
  w: number; h: number; mt?: number; radius?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  return (
    <Animated.View style={{
      width: w, height: h, marginTop: mt,
      borderRadius: radius,
      backgroundColor: '#222',
      opacity,
    }} />
  );
}

function ShimmerOverlay({ visible }: { visible: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.shimmerOverlay, { opacity: fadeAnim }]}>
      {/* Feed cards */}
      <View style={{ padding: 16 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ marginBottom: 20 }}>
            <ShimmerBar w={width - 32} h={180} radius={10} />
            <ShimmerBar w={width * 0.62} h={13} mt={10} />
            <ShimmerBar w={width * 0.42} h={11} mt={7} />
          </View>
        ))}
        {/* List rows */}
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <ShimmerBar w={44} h={44} radius={22} />
            <View style={{ marginLeft: 12 }}>
              <ShimmerBar w={width * 0.52} h={13} />
              <ShimmerBar w={width * 0.34} h={11} mt={6} />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Timeout page ──────────────────────────────────────────────
function TimeoutPage({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.offlinePage}>
      <Image
        source={require('../assets/icon.png')}
        style={styles.offlineLogo}
        resizeMode="contain"
      />
      <Text style={styles.offlineTitle}>Connection timed out</Text>
      <Text style={styles.offlineSubtitle}>
        Please check your internet connection.
      </Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.75}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function MainScreen() {
  const webViewRef    = useRef<WebView>(null);
  const canGoBack     = useRef(false);
  const isReady       = useRef(false);
  const shimmerTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shimmer, setShimmer] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => { registerForPushNotifications(); }, []);

  // Android back button
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) { webViewRef.current?.goBack(); return true; }
      return false;
    });
    return () => handler.remove();
  }, []);

  const clearTimers = () => {
    if (shimmerTimer.current) clearTimeout(shimmerTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
  };

  const onLoadStart = useCallback(() => {
    setTimedOut(false);
    shimmerTimer.current  = setTimeout(() => setShimmer(true), SHIMMER_DELAY);
    timeoutTimer.current  = setTimeout(() => {
      setShimmer(false);
      setTimedOut(true);
      if (!isReady.current) {
        isReady.current = true;
        SplashScreen.hideAsync();
      }
    }, LOAD_TIMEOUT);
  }, []);

  const onLoadProgress = useCallback(async ({ nativeEvent }: { nativeEvent: { progress: number } }) => {
    if (nativeEvent.progress < 1) return;
    clearTimers();
    setShimmer(false);
    setTimedOut(false);
    if (!isReady.current) {
      isReady.current = true;
      await SplashScreen.hideAsync();
    }
  }, []);

  const onRetry = useCallback(() => {
    setTimedOut(false);
    webViewRef.current?.reload();
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
    } catch { return false; }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onLoadStart={onLoadStart}
        onLoadProgress={onLoadProgress}
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
      />

      <ShimmerOverlay visible={shimmer && !timedOut} />

      {timedOut && <TimeoutPage onRetry={onRetry} />}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  webview:      { flex: 1, backgroundColor: '#000' },
  blank:        { flex: 1, backgroundColor: '#000' },

  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    paddingTop: 56,
    zIndex: 10,
  },

  offlinePage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    zIndex: 20,
  },
  offlineLogo: {
    width: 80,
    height: 80,
    marginBottom: 8,
    opacity: 0.6,
  },
  offlineTitle: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '700',
    color: '#f0f2f0',
  },
  offlineSubtitle: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 36,
    paddingVertical: 13,
    backgroundColor: '#8ef53a',
    borderRadius: 12,
  },
  retryText: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});