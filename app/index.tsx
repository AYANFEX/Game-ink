import { useRef, useEffect, useCallback, useState } from 'react';
import { BackHandler, StyleSheet, View, Animated, Easing, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation, ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

const APP_URL  = 'https://app.v1-0-0.gameink.abikaz.name.ng/spa/';
const APP_HOST = 'app.v1-0-0.gameink.abikaz.name.ng';
const { width, height } = Dimensions.get('window');
const SHIMMER_DELAY = 150; // ms before shimmer shows — avoids flash on cached pages

// ── Shimmer block ──────────────────────────────────────────────
function ShimmerBar({ w, h, mt = 0 }: { w: number; h: number; mt?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] });
  return (
    <Animated.View style={{ width: w, height: h, marginTop: mt, borderRadius: 6, backgroundColor: '#8ef53a', opacity }} />
  );
}

// Cycles: feed cards → list rows → shorts vertical
function ShimmerOverlay({ visible }: { visible: boolean }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const cycleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(cycleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(cycleAnim, { toValue: 2, duration: 1200, useNativeDriver: true }),
          Animated.timing(cycleAnim, { toValue: 3, duration: 1200, useNativeDriver: true }),
          Animated.timing(cycleAnim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.shimmerOverlay, { opacity: fadeAnim }]}>
      {/* Feed cards */}
      <View style={styles.shimmerSection}>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.shimmerCard}>
            <ShimmerBar w={width - 32} h={180} />
            <ShimmerBar w={width * 0.6} h={14} mt={10} />
            <ShimmerBar w={width * 0.4} h={12} mt={6} />
          </View>
        ))}
      </View>
      {/* List rows */}
      <View style={styles.shimmerSection}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={styles.shimmerRow}>
            <ShimmerBar w={44} h={44} />
            <View style={{ marginLeft: 12 }}>
              <ShimmerBar w={width * 0.55} h={13} />
              <ShimmerBar w={width * 0.35} h={11} mt={6} />
            </View>
          </View>
        ))}
      </View>
      {/* Shorts vertical */}
      <View style={styles.shimmerSection}>
        <ShimmerBar w={width} h={height * 0.75} />
        <ShimmerBar w={width * 0.5} h={14} mt={12} />
        <ShimmerBar w={width * 0.3} h={12} mt={6} />
      </View>
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────
async function requestNotifications() {
  try { await Notifications.requestPermissionsAsync(); } catch {}
}

export default function MainScreen() {
  const webViewRef    = useRef<WebView>(null);
  const canGoBack     = useRef(false);
  const isReady       = useRef(false);
  const shimmerTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shimmer, setShimmer] = useState(false);

  useEffect(() => { requestNotifications(); }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) { webViewRef.current?.goBack(); return true; }
      return false;
    });
    return () => handler.remove();
  }, []);

  const onLoadStart = useCallback(() => {
    // Only show shimmer if page takes longer than SHIMMER_DELAY (cached pages won't trigger it)
    shimmerTimer.current = setTimeout(() => setShimmer(true), SHIMMER_DELAY);
  }, []);

  const onLoadEnd = useCallback(async () => {
    if (shimmerTimer.current) clearTimeout(shimmerTimer.current);
    setShimmer(false);
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
        onLoadEnd={onLoadEnd}
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
      <ShimmerOverlay visible={shimmer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#000' },
  webview:        { flex: 1, backgroundColor: '#000' },
  blank:          { flex: 1, backgroundColor: '#000' },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    paddingTop: 48,
    zIndex: 10,
  },
  shimmerSection: { position: 'absolute', top: 48, left: 0, right: 0, padding: 16 },
  shimmerCard:    { marginBottom: 20 },
  shimmerRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
});
