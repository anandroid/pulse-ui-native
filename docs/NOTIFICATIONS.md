# Push Notification Implementation Guide

## Overview
This document describes how push notifications are implemented in the Pulse ecosystem, enabling seamless content delivery from server to app.

## Architecture

### Flow Diagram
```
FCM Server → Native App → WebView → Feed Injection → User Sees Content
```

### Components
1. **FCM Server**: Sends push notifications with Pulse data
2. **Native App** (pulse-ui-native): Receives and processes notifications
3. **WebView Bridge**: Passes notification data to web app
4. **Feed Injection** (pulse-ui): Displays notification as first feed item

## Implementation Details

### 1. Native App (pulse-ui-native)

#### Notification Handler Hook
Located at `src/hooks/useNotificationHandler.ts`:
- Listens for incoming notifications
- Parses `pulse_data` field from notification payload
- Sends data to WebView when ready
- Handles app launch from notification tap

#### App.tsx Integration
- Initializes notification handler
- Manages WebView communication
- Sends FCM token to web app
- Responds to notification requests

### 2. Web App (pulse-ui)

#### Notification Store
Located at `src/stores/notification-store.ts`:
- Zustand store for notification state
- Stores current notification item
- Allows clearing notification

#### Notification Feed Hook
Located at `src/hooks/use-notification-feed.ts`:
- Merges notification item with feed data
- Places notification as first item
- Handles deduplication
- Maintains category organization

#### Notification Bridge
Located at `src/hooks/use-notification-bridge.ts`:
- Listens for notification messages from native app
- Updates notification store
- Requests pending notifications on mount

## Notification Payload Structure

### FCM Message Format
```json
{
  "notification": {
    "title": "New Event in Tampa",
    "body": "Jazz Night at The Hub"
  },
  "data": {
    "pulse_data": "{...}" // Stringified PulseDataItem
  }
}
```

### Supported Content Types
- Events
- Deals
- News Articles
- Reels/Videos
- Places

See `/docs/notification-payload.md` for detailed examples.

## User Experience

### Notification Tap Flow
1. User receives push notification
2. User taps notification
3. App opens (or comes to foreground)
4. Notification content appears as first feed item
5. User can interact normally with the content
6. User naturally discovers more content by scrolling

### Benefits
- **No Extra Screens**: Direct to feed experience
- **Increased Engagement**: Users see more content
- **Seamless Integration**: Notification items look like regular feed items
- **Smart Deduplication**: No duplicate content

## Testing

### Manual Testing Steps
1. Send test notification with pulse_data
2. Tap notification while app is closed
3. Verify item appears first in feed
4. Test with app in background
5. Test with app in foreground

### Test Payload Example
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Test Event",
      "body": "Testing notification"
    },
    "data": {
      "pulse_data": "{\"id\":\"test123\",\"category\":\"events\",\"title\":\"Test Event\",\"description\":\"Test Description\",\"location\":\"Tampa\"}"
    }
  }'
```

## Configuration

### Native App
- Update `App.tsx` with notification handler
- Ensure proper FCM setup in `google-services.json` (Android)
- Configure `GoogleService-Info.plist` (iOS)

### Web App
- NotificationProvider in layout
- NotificationFeed hook in content sections
- Zustand store for state management

## Debugging

### Console Logs
- Native: Check for "Notification received" logs
- WebView: Look for "Received notification data" logs
- Feed: Verify "hasNotificationItem" in component

### Common Issues
1. **Notification not showing in feed**
   - Check pulse_data format
   - Verify WebView message passing
   - Ensure notification store is initialized

2. **Duplicate items**
   - Check item ID uniqueness
   - Verify deduplication logic

3. **App doesn't open to feed**
   - Ensure notification handler is registered
   - Check deep linking configuration