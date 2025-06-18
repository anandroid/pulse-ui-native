import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, StatusBar, Modal, TouchableOpacity, Text, SafeAreaView, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { themes, DEFAULT_THEME, THEME_STORAGE_KEY, ThemeMode, ThemeColors } from './src/constants/themes';

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

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(DEFAULT_THEME);
  const [themeColors, setThemeColors] = useState<ThemeColors>(themes[DEFAULT_THEME]);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const mainWebViewRef = useRef<WebView>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

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
      
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);
      setPushToken(token);
      
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
      } else if (data.type === 'external-link') {
        setExternalUrl(data.url);
      } else if (data.type === 'get-push-token') {
        mainWebViewRef.current?.postMessage(JSON.stringify({
          type: 'push-token',
          token: pushToken,
        }));
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
      window.addEventListener('storage', checkTheme);
      
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
      
      // Expose method to get push token
      window.getPushToken = () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'get-push-token'
        }));
      };
      
      true;
    })();
  `;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={themeColors.statusBarStyle}
        backgroundColor={themeColors.statusBarBackground}
      />
      
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
});
