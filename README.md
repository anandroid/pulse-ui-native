# Pulse UI Native

React Native app for TampaVibes (pulse-ui) with WebView integration and push notification support.

## Features

- WebView displaying tampavibes.app
- Firebase push notifications (Android & iOS)
- External link handling in separate WebView with close button
- Theme synchronization with Next.js app
- Dynamic status bar color based on selected theme
- No action bar for clean interface

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- Firebase project with iOS and Android apps configured

### Installation

```bash
npm install
```

### Firebase Configuration

1. Replace the placeholder Firebase configuration files:
   - Android: `google-services.json`
   - iOS: `GoogleService-Info.plist`

2. Update these files with your actual Firebase project credentials.

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Theme Synchronization

The app syncs themes with the Next.js pulse-ui app:
- Reads theme from localStorage in WebView
- Updates status bar color based on selected theme
- Supports all pulse-ui themes (light, dark, evening, twilight, twilight-light, purple-day)

## Push Notifications

The app registers for push notifications on startup and exposes the token to the WebView through:
```javascript
window.getPushToken()
```

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## Package Information

- Bundle ID: `vybe.search.app`
- Android Package: `vybe.search.app`