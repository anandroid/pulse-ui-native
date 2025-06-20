import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { WebView } from 'react-native-webview';

interface NotificationData {
  pulse_data?: string;
  [key: string]: any;
}

export function useNotificationHandler(webViewRef: React.RefObject<WebView>) {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const pendingNotificationRef = useRef<any>(null);

  useEffect(() => {
    // Handler for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      handleNotificationData(notification.request.content.data);
    });

    // Handler for when user interacts with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      handleNotificationData(response.notification.request.content.data);
    });

    // Check for notification that opened the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('App opened from notification:', response);
        handleNotificationData(response.notification.request.content.data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationData = (data: NotificationData) => {
    if (!data || !data.pulse_data) {
      console.log('No pulse_data in notification');
      return;
    }

    try {
      const pulseData = JSON.parse(data.pulse_data);
      console.log('Parsed pulse data:', pulseData);

      // If WebView is ready, send immediately
      if (webViewRef.current) {
        sendNotificationToWebView(pulseData);
      } else {
        // Store for later when WebView is ready
        pendingNotificationRef.current = pulseData;
      }
    } catch (error) {
      console.error('Error parsing pulse_data:', error);
    }
  };

  const sendNotificationToWebView = (pulseData: any) => {
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'notification',
        data: pulseData
      });
      console.log('Sending notification to WebView:', message);
      webViewRef.current.postMessage(message);
      // Clear pending notification after sending
      pendingNotificationRef.current = null;
    }
  };

  // Function to handle WebView requests for pending notifications
  const handlePendingNotificationRequest = () => {
    if (pendingNotificationRef.current && webViewRef.current) {
      sendNotificationToWebView(pendingNotificationRef.current);
    }
  };

  return {
    handlePendingNotificationRequest,
    hasPendingNotification: !!pendingNotificationRef.current
  };
}