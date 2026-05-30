# PhotoWiper

A swipe-to-clean photo gallery app for Android. Review your camera roll Tinder-style — swipe to keep or delete — and reclaim storage fast. All data stays on-device.

Built with **Expo (SDK 54)**, **React Native 0.81**, and **TypeScript**.

## Features

- **Swipe to clean** — swipe through your photos one at a time; keep or queue for deletion with smooth gesture animations and haptic feedback.
- **Batch delete** — photos marked for deletion are queued and removed together via the system media library.
- **Sessions & resume** — pick up exactly where you left off; review screen before anything is deleted.
- **Dashboard & history** — track how many photos you've reviewed, deleted, and how much space you've freed.
- **Settings** — light/dark theme, haptics toggle, permission management, and more.
- **Local-first** — all stats and progress are stored on-device in SQLite. No account required.

## Tech Stack

| Area | Choice |
| --- | --- |
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Language | TypeScript |
| Navigation | React Navigation (stack + bottom tabs) |
| State | Zustand |
| Local storage | expo-sqlite, AsyncStorage |
| Media access | expo-media-library |
| Animation / gestures | react-native-reanimated, react-native-gesture-handler |
| Images | expo-image |
| Haptics | expo-haptics |
| Build | EAS Build | 

## Project Structure

```
PhotoSwipe/
├── App.tsx                  # App entry, providers, theme
├── app.json                 # Expo config (permissions, plugins, icons)
├── eas.json                 # EAS build profiles (dev / preview / production)
├── src/
│   ├── navigation/          # AppNavigator (stack + tabs)
│   ├── screens/             # Splash, Permission, Loading, Swipe, Review,
│   │                        #   Deleting, AllDone, Resume, Dashboard,
│   │                        #   History, Settings, Denied
│   ├── services/            # databaseService, mediaLibraryService,
│   │                        #   photoQueue, swipeEngine, analyticsService,
│   │                        #   hapticsService, permissions, deviceService
│   ├── store/               # Zustand store (useStore)
│   ├── theme/               # ThemeContext (light/dark)
│   ├── constants/           # theme tokens
│   └── types/               # shared TypeScript types
├── assets/                  # icons, splash, logo
└── server/                  # Express + MongoDB backend (currently unused — see Notes)
```

## Getting Started

### Prerequisites

- Node.js 18+
- An [Expo](https://expo.dev/) account and the EAS CLI: `npm install -g eas-cli`
- An Android device or emulator. **Note:** Expo Go cannot use the Android media library — you need a development build (see below).

### Install

```bash
npm install
```

### Run (development build)

`expo-media-library` and other native modules require a dev build, not Expo Go:

```bash
# Build a development client for Android (one-time, via EAS)
eas build --profile development --platform android

# Install the resulting APK on your device, then start the dev server
npm start
```

Open the installed dev build and it will connect to the running Metro server.

### Other scripts

```bash
npm run android   # expo run:android (local native build)
```

## Building

Build profiles are defined in [eas.json](eas.json):

```bash
eas build --profile preview --platform android      # internal APK
eas build --profile production --platform android    # production app bundle (.aab)
```

## Permissions

The app requests photo/media access on Android:
`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, and legacy
`READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`. These are needed to read your gallery
and delete the photos you choose to remove.

## Notes

- **Architecture is local-first.** All analytics, sessions, and stats live in on-device SQLite. The `server/` directory contains an earlier Express + MongoDB backend that the app no longer uses; it's kept for reference only.