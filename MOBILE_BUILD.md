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

### Haptic Feedback Utility

Room XI Connect includes a haptic feedback utility in `src/lib/haptics.ts` that respects user preferences and platform capabilities:

```typescript
import { haptics } from '@/lib/haptics';

// Light tap for subtle feedback
await haptics.light();

// Medium impact for button presses
await haptics.medium();

// Heavy impact for important actions
await haptics.heavy();

// Notification feedback
await haptics.success();  // Success actions
await haptics.warning();  // Warning messages
await haptics.error();    // Error states
```

**Features:**
- Automatically checks if running on native platform
- Respects `prefers-reduced-motion` user preference
- Gracefully degrades on web platform
- Error handling for unsupported devices

**Usage Example:**
```typescript
import { haptics } from '@/lib/haptics';

async function handleCheckIn() {
  try {
    await submitCheckIn();
    await haptics.success(); // Success feedback
  } catch (error) {
    await haptics.error(); // Error feedback
  }
}
```

## Mobile-Specific Features Configuration

### Splash Screen

The splash screen is configured in `capacitor.config.ts` and displays when the app launches:

**Configuration:**
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,        // 2 second duration
    backgroundColor: '#1e293b',       // Dark slate (brand color)
    androidSplashResourceName: 'splash',
    iosSplashResourceName: 'Default',
    showSpinner: false,
    spinnerColor: '#60a5fa'
  }
}
```

**How It Works:**
1. Splash screen shows immediately on app launch
2. Displays for 2 seconds (or until app is ready)
3. Automatically hides when React app mounts (`src/main.tsx`)
4. Uses brand colors matching the app theme

**Manual Control (if needed):**
```typescript
import { SplashScreen } from '@capacitor/splash-screen';

// Show splash screen
await SplashScreen.show();

// Hide splash screen
await SplashScreen.hide();
```

### Status Bar Configuration

The status bar is configured automatically in `src/main.tsx` on native platforms:

**Current Configuration:**
- **Style**: Dark (white text on dark background)
- **Background Color**: `#1e293b` (matches app theme)
- **Platform Detection**: Only applies on native iOS/Android

**Customization:**
```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

// Change style
await StatusBar.setStyle({ style: Style.Light }); // Dark text
await StatusBar.setStyle({ style: Style.Dark });  // White text

// Android: Change background color
await StatusBar.setBackgroundColor({ color: '#ffffff' });

// Show/hide status bar
await StatusBar.show();
await StatusBar.hide();
```

### Mobile Permissions

Room XI Connect requires specific permissions for mobile features. These are configured in platform-specific files.

#### iOS Permissions (`ios/App/App/Info.plist`)

**Required Permission Descriptions:**

1. **Microphone** - Voice journal feature
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Room XI Connect uses your microphone to record voice journal entries. Your recordings stay private and are processed locally on your device.</string>
   ```

2. **Camera** - QR code scanning for event check-ins
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Room XI Connect uses your camera to scan QR codes for event check-ins.</string>
   ```

3. **Photo Library** - Save mood visualizations
   ```xml
   <key>NSPhotoLibraryAddUsageDescription</key>
   <string>Room XI Connect allows you to save mood visualizations to your photo library.</string>
   ```

**Note:** These descriptions appear in iOS permission dialogs. They must be clear, specific, and explain the privacy-preserving nature of the app.

#### Android Permissions (`android/app/src/main/AndroidManifest.xml`)

**Required Permissions:**

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**Permission Details:**
- **INTERNET** - API communication (always granted)
- **RECORD_AUDIO** - Voice journal recording (runtime permission)
- **CAMERA** - QR code scanning (runtime permission)
- **POST_NOTIFICATIONS** - Push notifications (runtime permission on Android 13+)

**Runtime Permission Handling:**

Android automatically prompts users for permissions when features are used. For example, accessing the camera will trigger a permission dialog.

### App Icons and Splash Screen Assets

#### Asset Generation with @capacitor/assets

Room XI Connect uses the `@capacitor/assets` tool to generate platform-specific icons and splash screens from master assets.

**Prerequisites:**

1. Install the assets tool (dev dependency):
   ```bash
   npm install -D @capacitor/assets
   ```

2. Create master assets in the `assets/` directory:
   - `assets/icon.png` - 1024x1024px app icon
   - `assets/splash.png` - 2732x2732px splash screen

**Icon Requirements:**
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Content: Should be centered, avoid text near edges
- Safe area: Keep important content within 80% center circle

**Splash Screen Requirements:**
- Size: 2732x2732 pixels (largest iPad Pro size)
- Format: PNG
- Design: Simple, branded design with logo centered
- Background: Use brand color `#1e293b` (dark slate)

**Generate Assets:**

```bash
# Generate all icons and splash screens
npx capacitor-assets generate --iconBackgroundColor '#1e293b'
```

This command will:
- Generate iOS app icons (all required sizes)
- Generate Android app icons (all densities)
- Generate splash screens for both platforms
- Place assets in correct platform directories

**Manual Asset Placement (if not using the tool):**

**iOS Icons:**
- Directory: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Sizes: 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024
- Update `Contents.json` with icon filenames

**Android Icons:**
- Directories: `android/app/src/main/res/mipmap-{density}/`
- Densities: mdpi (48x48), hdpi (72x72), xhdpi (96x96), xxhdpi (144x144), xxxhdpi (192x192)
- Files: `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`

**iOS Splash Screens:**
- Directory: `ios/App/App/Assets.xcassets/Splash.imageset/`
- Sizes: 2732x2732px (universal)

**Android Splash Screens:**
- Directories: `android/app/src/main/res/drawable-{orientation}-{density}/`
- Files: `splash.png` in various sizes

#### Asset Design Guidelines

**App Icon Best Practices:**
1. Use Room XI Connect branding (logo/mark)
2. Keep design simple and recognizable at small sizes
3. Avoid text (hard to read at small sizes)
4. Use solid background or subtle gradient
5. Test at various sizes before finalizing

**Splash Screen Best Practices:**
1. Simple, clean design
2. Brand logo centered
3. Dark slate background (`#1e293b`)
4. Minimal text or graphics
5. Should load quickly

**Brand Colors:**
- Primary: `#1e293b` (dark slate)
- Accent: `#60a5fa` (blue)
- Background: `#0f172a` (darker slate)

### App Metadata Configuration

#### iOS Metadata (`ios/App/App/Info.plist`)

The following metadata is configured:

```xml
<key>CFBundleDisplayName</key>
<string>Room XI Connect</string>

<key>CFBundleShortVersionString</key>
<string>$(MARKETING_VERSION)</string>  <!-- 1.0.0 -->

<key>CFBundleVersion</key>
<string>$(CURRENT_PROJECT_VERSION)</string>  <!-- 1 -->
```

**Update Version:**
1. Open Xcode project
2. Select App target
3. Go to General tab
4. Update Version and Build number

#### Android Metadata (`android/app/build.gradle`)

The following metadata is configured:

```gradle
android {
    namespace "com.roomxi.connect"
    defaultConfig {
        applicationId "com.roomxi.connect"
        versionCode 1
        versionName "1.0"
    }
}
```

**Update Version:**
1. Edit `android/app/build.gradle`
2. Increment `versionCode` (integer, increments with each release)
3. Update `versionName` (user-facing version string)

## Testing Mobile Features

### Testing Splash Screen

**iOS Simulator:**
1. Clean build and run
2. Observe splash screen on launch
3. Verify 2-second duration
4. Check brand colors match

**Android Emulator:**
1. Uninstall app if previously installed
2. Build and run
3. Observe splash screen on launch
4. Verify colors and duration

**Common Issues:**
- Splash not showing: Check asset paths in config
- Wrong colors: Verify `backgroundColor` in `capacitor.config.ts`
- Too long/short: Adjust `launchShowDuration`

### Testing Permissions

**iOS:**
1. Delete app to reset permissions
2. Reinstall and run
3. Trigger permission-requiring feature (camera, microphone)
4. Verify permission dialog shows custom description
5. Grant permission and test feature

**Android:**
1. Long-press app icon → App Info → Permissions
2. Revoke all permissions
3. Trigger features requiring permissions
4. Verify permission dialogs appear
5. Grant permissions and test features

**Debugging Permission Issues:**
- Check `Info.plist` (iOS) has all required keys
- Check `AndroidManifest.xml` has permission declarations
- Test on physical devices (some permissions not available in simulators)
- Check iOS Console/Android Logcat for permission errors

### Testing Status Bar

**Verify:**
- Status bar text is white (Dark style)
- Background color matches app (`#1e293b`)
- Status bar appears on all screens
- No overlap with app content

**Adjust if needed:**
- Edit `src/main.tsx` to change status bar style
- Update `capacitor.config.ts` for config-based changes

### Testing Haptic Feedback

**iOS Devices:**
- All iPhones support haptics (iPhone 7+)
- Test light, medium, heavy impacts
- Verify notification feedback (success, warning, error)

**Android Devices:**
- Support varies by device
- Test on actual hardware (not emulators)
- Verify vibration occurs for impacts

**Accessibility Testing:**
- Enable "Reduce Motion" in device settings
- Verify haptics are disabled (respects preference)
- Confirm app functions normally without haptics

### Testing on Physical Devices

**iOS (Physical Device):**
1. Connect iPhone via USB
2. Trust computer if prompted
3. Select device in Xcode
4. Build and run
5. Test all native features (camera, microphone, haptics)

**Android (Physical Device):**
1. Enable Developer Options
2. Enable USB Debugging
3. Connect via USB
4. Select device in Android Studio
5. Build and run
6. Test all native features

**Features to Test:**
- [ ] App launches with splash screen
- [ ] Icon appears correctly on home screen
- [ ] Status bar matches app theme
- [ ] Camera permission dialog shows (QR scanning)
- [ ] Microphone permission dialog shows (voice journal)
- [ ] Haptic feedback works on interactions
- [ ] Push notifications work (if configured)
- [ ] App handles background/foreground transitions

## Privacy Policy Requirements

When submitting to app stores, you must disclose data collection and permission usage:

**App Store Connect (iOS):**
- Privacy Policy URL required
- Data collection disclosure required
- Purpose for each permission must be listed

**Google Play Console (Android):**
- Privacy Policy URL required
- Data Safety section required
- Explain data handling for each permission

**Required Disclosures:**
- Microphone: "Voice recordings for personal journaling, processed locally"
- Camera: "QR code scanning for event check-ins"
- Photos: "Optional save of mood visualizations to user's library"
- Internet: "Communication with backend API for data sync"

See `attached_assets/privacy_policy.pdf` for the full privacy policy that covers all data handling and permissions.

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
