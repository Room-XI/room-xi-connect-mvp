# Room XI Connect - Mobile Build Guide

This guide explains how to build and deploy Room XI Connect as a native mobile application for iOS and Android using Capacitor.

## ⚠️ First-Time Setup (Required)

**IMPORTANT**: The `/ios` and `/android` folders are not committed to version control. You must generate them before building.

### Quick Start

```bash
# Install dependencies
npm install

# Generate native projects (first time only)
npx cap add ios
npx cap add android

# Build and sync
npm run build:mobile
npm run cap:sync
```

**Or use the convenience script:**

```bash
npm run setup:mobile
```

### Why aren't native projects committed?

- **Cleaner repository**: Keeps repo size small and focused on source code
- **Avoid merge conflicts**: Platform-specific files cause conflicts in team development
- **Standard Capacitor practice**: Recommended approach for simple wrapper apps
- **Reproducible**: Native projects can be regenerated from `capacitor.config.ts`

### When to regenerate native projects

- ✅ First time cloning the repository
- ✅ After updating Capacitor CLI version
- ✅ If native projects become corrupted
- ✅ After changing `capacitor.config.ts` settings

### Verify Setup

After first-time setup, verify everything works:

```bash
# Check native projects exist
ls ios && ls android

# Verify sync works
npm run cap:sync
```

**Expected output**: You should see both `ios/` and `android/` directories created, and Capacitor should detect 5 plugins (App, Haptics, Preferences, Splash Screen, Status Bar).

---

## Overview

Room XI Connect uses Capacitor to wrap the web application into native iOS and Android apps. The same codebase runs on web (PWA), iOS, and Android platforms.

**Bundle ID:** `com.roomxi.connect`  
**App Name:** Room XI Connect

## Prerequisites

### Required for All Platforms
- Node.js 18+ and npm
- Room XI Connect codebase
- Backend API deployed and accessible

### For iOS Development (macOS only)
- macOS 12.0 or later
- Xcode 14.0 or later
- Xcode Command Line Tools
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (for App Store deployment)

### For Android Development
- Android Studio 2021.3.1 or later
- Android SDK (API 22+)
- Java Development Kit (JDK) 17
- Google Play Developer Account (for Play Store deployment)

## Initial Setup

### 1. Install Dependencies

All Capacitor dependencies are already installed in `package.json`:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file with your production API URL:

```bash
# Copy from example
cp .env.example .env

# Edit .env and set:
VITE_API_BASE_URL=https://your-production-url.repl.co
```

This ensures the mobile app connects to your deployed backend instead of localhost.

### 3. Build the Web Application

```bash
npm run build:mobile
```

This creates an optimized production build in the `dist/` folder.

### 4. Sync to Native Projects

```bash
npm run cap:sync
```

This copies the web assets to both iOS and Android projects and updates native dependencies.

## iOS Build Instructions

**Note:** iOS builds require macOS. On non-macOS systems, you can still add the iOS platform but cannot build or test.

### 1. Open iOS Project in Xcode

```bash
npm run cap:open:ios
```

Or manually:
```bash
open ios/App/App.xcworkspace
```

### 2. Configure Signing & Capabilities

1. In Xcode, select the `App` target
2. Go to "Signing & Capabilities"
3. Select your development team
4. Ensure bundle identifier is `com.roomxi.connect`

### 3. Configure App Icons and Splash Screen

1. Navigate to `ios/App/App/Assets.xcassets`
2. Add app icons (1024x1024 required)
3. Add splash screen images

### 4. Build and Run

**On Simulator:**
1. Select a simulator device (e.g., iPhone 15 Pro)
2. Click the Run button (▶️) or press Cmd+R

**On Physical Device:**
1. Connect your iPhone via USB
2. Select your device from the device list
3. Click Run

### 5. Archive for App Store

1. In Xcode, select "Any iOS Device" as the target
2. Go to Product → Archive
3. Follow the organizer prompts to upload to App Store Connect

## Android Build Instructions

### 1. Open Android Project in Android Studio

```bash
npm run cap:open:android
```

Or manually:
```bash
open -a "Android Studio" android/
```

### 2. Configure App Details

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">Room XI Connect</string>
    <string name="title_activity_main">Room XI Connect</string>
    <string name="package_name">com.roomxi.connect</string>
</resources>
```

### 3. Add App Icons

1. Right-click `res` folder → New → Image Asset
2. Configure launcher icons
3. Generate all required sizes

### 4. Build and Run

**On Emulator:**
1. Create/start an Android Virtual Device (AVD)
2. Click Run (▶️)

**On Physical Device:**
1. Enable Developer Options and USB Debugging on your Android device
2. Connect via USB
3. Select your device and click Run

**Live Reload Development:**
```bash
npm run cap:run:android
```

This enables hot-reload during development.

### 5. Build Release APK/AAB

**Generate Signing Key (first time only):**
```bash
keytool -genkey -v -keystore room-xi-connect.keystore -alias room-xi -keyalg RSA -keysize 2048 -validity 10000
```

**Build Release:**
1. In Android Studio: Build → Generate Signed Bundle/APK
2. Select Android App Bundle (AAB) for Play Store
3. Follow the signing wizard
4. Upload AAB to Google Play Console

## Development Workflow

### Making Changes

1. **Edit source code** in `src/` directory
2. **Build web app:**
   ```bash
   npm run build:mobile
   ```
3. **Sync changes to native:**
   ```bash
   npm run cap:sync
   ```
4. **Rebuild in Xcode/Android Studio**

### Quick Sync Commands

```bash
# Sync all platforms
npm run cap:sync

# Sync iOS only
npm run cap:sync:ios

# Sync Android only
npm run cap:sync:android

# Copy web assets only (no native dependency updates)
npm run cap:copy
```

## Platform-Specific Features

### Detecting Platform in Code

Use the utilities in `src/lib/capacitor.ts`:

```typescript
import { isNativePlatform, isIOS, isAndroid, isWeb } from '@/lib/capacitor';

if (isNativePlatform()) {
  // Running on iOS or Android
}

if (isIOS()) {
  // iOS-specific code
}

if (isAndroid()) {
  // Android-specific code
}

if (isWeb()) {
  // Web/PWA-specific code
}
```

### Using Capacitor Plugins

The following Capacitor plugins are installed and available:

- **@capacitor/app** - App lifecycle events
- **@capacitor/haptics** - Haptic feedback
- **@capacitor/status-bar** - Status bar styling
- **@capacitor/splash-screen** - Splash screen control
- **@capacitor/preferences** - Native storage

Example usage:

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

// Haptic feedback on button press
await Haptics.impact({ style: ImpactStyle.Medium });

// Style status bar
await StatusBar.setStyle({ style: Style.Dark });
```

## Troubleshooting

### iOS Issues

**CocoaPods not installed:**
```bash
sudo gem install cocoapods
pod install --project-directory=ios
```

**Xcode build fails:**
1. Clean build folder: Product → Clean Build Folder
2. Delete derived data: Xcode → Preferences → Locations → Derived Data
3. Rebuild

**Simulator not showing updates:**
- Delete app from simulator
- Clean build
- Rebuild and run

### Android Issues

**Gradle sync failed:**
1. File → Invalidate Caches / Restart
2. Rebuild

**App not installing:**
- Uninstall existing app
- Clean project: Build → Clean Project
- Rebuild

**Native dependencies missing:**
```bash
npm run cap:sync:android
```

### General Issues

**Changes not appearing:**
1. Rebuild web app: `npm run build:mobile`
2. Sync to native: `npm run cap:sync`
3. Clean and rebuild in IDE

**API calls failing:**
- Verify `VITE_API_BASE_URL` in `.env`
- Ensure backend is accessible from mobile network
- Check CORS settings on backend

## Testing

### On Replit (Web Only)
The Replit environment cannot build iOS/Android apps, but you can:
- Test web version (PWA)
- Verify mobile-responsive design
- Test API integrations
- Run unit tests

### On macOS (iOS + Android)
- Build and test iOS in Xcode Simulator
- Build and test Android in Android Studio Emulator
- Test on physical devices

### On Windows/Linux (Android Only)
- Build and test Android in Android Studio Emulator
- Test on physical Android devices

## Deployment

### iOS App Store

1. **Prepare app metadata** in App Store Connect
2. **Archive and upload** from Xcode
3. **Submit for review** with screenshots and description
4. **Wait for approval** (typically 24-48 hours)

### Google Play Store

1. **Create app listing** in Google Play Console
2. **Upload AAB** (Android App Bundle)
3. **Complete store listing** with screenshots and description
4. **Submit for review** (typically 24-48 hours)

### Internal Testing

**iOS TestFlight:**
1. Upload build to App Store Connect
2. Add internal/external testers
3. Distribute via TestFlight app

**Android Internal Testing:**
1. Upload to Play Console internal testing track
2. Add tester emails
3. Share testing link

## CI/CD Setup

For automated builds, add these steps to your CI pipeline:

### Example GitHub Actions Workflow

```yaml
# Example workflow steps for GitHub Actions
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '20'

- name: Install dependencies
  run: npm install

- name: Setup Capacitor native projects
  run: |
    npx cap add ios
    npx cap add android

- name: Build and sync
  run: |
    npm run build:mobile
    npm run cap:sync
```

### Notes for CI/CD

- Native projects must be generated in every CI run
- Caching `node_modules` speeds up builds but native projects still need generation
- For iOS builds on CI, you'll need a macOS runner
- Android builds work on any platform

## Configuration Files

### capacitor.config.ts
Main Capacitor configuration:
```typescript
{
  appId: 'com.roomxi.connect',
  appName: 'Room XI Connect',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
}
```

### Important Folders

- `/ios` - iOS native project (Xcode) - **Generated, not committed**
- `/android` - Android native project (Android Studio) - **Generated, not committed**
- `/dist` - Web build output (synced to native projects)
- `src/lib/capacitor.ts` - Platform detection utilities

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Apple Developer](https://developer.apple.com/)
- [Google Play Console](https://play.google.com/console)

## Support

For issues specific to Room XI Connect mobile builds:
1. Check this guide first
2. Review Capacitor documentation
3. Contact the development team

## Notes

- **iOS builds require macOS** - Cannot build iOS on Windows/Linux/Replit
- **Android builds work everywhere** - Build on any OS with Android Studio
- **Web version always works** - PWA deployment independent of mobile builds
- **Keep versions in sync** - Update version in package.json and native projects together
- **Test on real devices** - Emulators/simulators don't catch all issues
