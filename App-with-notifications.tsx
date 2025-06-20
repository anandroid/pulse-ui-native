import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, StatusBar, Modal, TouchableOpacity, Text, SafeAreaView, Alert, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { themes, DEFAULT_THEME, THEME_STORAGE_KEY, ThemeMode, ThemeColors } from './src/constants/themes';
import { useNotificationHandler } from './src/hooks/useNotificationHandler';

const MAIN_URL = 'https://tampavibes.app';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppContent() {
  const [theme, setTheme] = useState<ThemeMode>(DEFAULT_THEME);
  const [themeColors, setThemeColors] = useState<ThemeColors>(themes[DEFAULT_THEME]);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const mainWebViewRef = useRef<WebView>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Initialize notification handler
  const { handlePendingNotificationRequest } = useNotificationHandler(mainWebViewRef);

  useEffect(() => {
    loadTheme();
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    setThemeColors(themes[theme]);
  }, [theme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && savedTheme in themes) {
        setTheme(savedTheme as ThemeMode);
        await AsyncStorage.setItem('splash-background-color', themes[savedTheme as ThemeMode].background);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Permission not granted', 'Failed to get push token for push notification!');
        return;
      }
      
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'api-project-269146618053',
      })).data;
      console.log('Push token:', token);
      setPushToken(token);
      
      // TODO: Get actual FCM token for production
      // For now, using Expo token as placeholder
      setFcmToken(token);
      
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'theme-change' && data.theme in themes) {
        setTheme(data.theme);
        AsyncStorage.setItem(THEME_STORAGE_KEY, data.theme);
        AsyncStorage.setItem('splash-background-color', themes[data.theme].background);
      } else if (data.type === 'external-link') {
        setExternalUrl(data.url);
      } else if (data.type === 'get-push-token') {
        // Send legacy push token for backward compatibility
        mainWebViewRef.current?.postMessage(JSON.stringify({
          type: 'push-token',
          token: pushToken,
        }));
      } else if (data.type === 'request-fcm-token') {
        // Send enhanced FCM token with platform info
        if (fcmToken) {
          mainWebViewRef.current?.postMessage(JSON.stringify({
            type: 'fcm-token',
            token: fcmToken,
            platform: Platform.OS as 'ios' | 'android'
          }));
        }
      } else if (data.type === 'request-pending-notification') {
        // Handle request for pending notification
        handlePendingNotificationRequest();
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const injectedJavaScript = `
    (function() {
      // Listen for theme changes
      const checkTheme = () => {
        const theme = localStorage.getItem('${THEME_STORAGE_KEY}');
        if (theme) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'theme-change',
            theme: theme.replace(/"/g, '')
          }));
        }
      };
      
      // Check theme on load and when storage changes
      checkTheme();
      window.addEventListener('storage', function(e) {
        if (e.key === '${THEME_STORAGE_KEY}') {
          checkTheme();
        }
      });
      
      // Also check periodically in case storage event doesn't fire
      setInterval(checkTheme, 1000);
      
      // Override window.open to handle external links
      const originalOpen = window.open;
      window.open = function(url, target) {
        if (url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('tampavibes.app')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'external-link',
            url: url
          }));
          return null;
        }
        return originalOpen.apply(this, arguments);
      };
      
      // Intercept link clicks
      document.addEventListener('click', function(e) {
        let target = e.target;
        while (target && target.tagName !== 'A') {
          target = target.parentElement;
        }
        
        if (target && target.href) {
          const url = target.href;
          if (!url.includes('tampavibes.app') && (url.startsWith('http://') || url.startsWith('https://'))) {
            e.preventDefault();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'external-link',
              url: url
            }));
          }
        }
      }, true);
      
      // Expose method to get push token (legacy)
      window.getPushToken = () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'get-push-token'
        }));
      };
      
      // Send FCM token automatically when ready
      setTimeout(() => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'request-fcm-token'
          }));
        }
      }, 1000);
      
      true;
    })();
  `;

  // Show a fallback on web platform since WebView doesn't work on web
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.webFallback, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.webFallbackText, { color: themeColors.foreground }]}>
          WebView is not supported on web platform.
        </Text>
        <Text style={[styles.webFallbackSubtext, { color: themeColors.foreground }]}>
          Please run this app on iOS or Android.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={themeColors.statusBarStyle}
        backgroundColor={themeColors.background}
        translucent={false}
      />
      
      <View style={[styles.topSpace, { backgroundColor: themeColors.background, height: insets.top }]} />
      
      <WebView
        ref={mainWebViewRef}
        source={{ uri: MAIN_URL }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        originWhitelist={['*']}
        mixedContentMode={'compatibility'}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
        }}
        onLoadStart={() => {
          console.log('WebView loading started');
          setIsLoading(true);
        }}
        onLoadEnd={() => {
          console.log('WebView loading ended');
          setIsLoading(false);
          // Send FCM token once WebView is loaded
          if (fcmToken) {
            setTimeout(() => {
              mainWebViewRef.current?.postMessage(JSON.stringify({
                type: 'fcm-token',
                token: fcmToken,
                platform: Platform.OS as 'ios' | 'android'
              }));
            }, 500);
          }
        }}
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.foreground }]}>Loading TampaVibes...</Text>
          </View>
        )}
      />
      
      <Modal
        visible={!!externalUrl}
        animationType="slide"
        onRequestClose={() => setExternalUrl(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: themeColors.secondary }]}>
            <TouchableOpacity
              onPress={() => setExternalUrl(null)}
              style={styles.closeButton}
            >
              <Text style={[styles.closeButtonText, { color: themeColors.foreground }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {externalUrl && (
            <WebView
              source={{ uri: externalUrl }}
              style={styles.webview}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              originWhitelist={['*']}
              mixedContentMode={'compatibility'}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  webFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFallbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  webFallbackSubtext: {
    fontSize: 16,
  },
  topSpace: {
    // Height will be set dynamically based on safe area insets
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}