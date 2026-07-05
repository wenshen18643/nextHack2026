# Sentinel Wallet Shield (Android)

A native Android demo that detects when the user is on a TNG eWallet transfer confirmation screen, reads the payee/amount/notes from the accessibility tree, and overlays a Sentinel AI scam warning before the transfer is completed.

## What it does

- **Accessibility service** watches window changes for the TNG eWallet package (`com.tngdigital.ewallet`) and the bundled mock screen.
- **Screen adapter** pattern-matches visible labels ("Transfer to", "Amount", "Notes", etc.) the same way the browser extension's `site_adapters.js` does.
- **API client** POSTs `{payee, amount, memo}` to your existing `/api/screen` endpoint and returns a fail-open `allow` verdict if the network fails.
- **Overlay warning** dims the wallet app and shows a "Cancel transfer" / "Send anyway" card.
- **Mock TNG activity** lets you demonstrate the full flow on a device or emulator without installing TNG.

## Project structure

```
src/wallet/
├── app/src/main/java/com/sentinel/wallet/
│   ├── MainActivity.kt                    # Launcher / permission & API URL settings
│   ├── MockTngActivity.kt                 # Fake TNG transfer confirmation screen
│   ├── model/Transfer.kt                  # Transfer data class
│   ├── model/ScreenResult.kt              # Screening verdict data class
│   ├── net/SentinelApi.kt                 # POST /api/screen client
│   ├── overlay/WarningOverlay.kt          # System alert window UI
│   ├── service/SentinelAccessibilityService.kt  # Accessibility service entry point
│   └── service/TngScreenAdapter.kt        # Extracts transfer from node tree
├── app/src/main/res/
│   ├── layout/activity_main.xml
│   ├── layout/activity_mock_tng.xml
│   ├── layout/overlay_warning.xml
│   ├── drawable/ic_sentinel.xml
│   ├── drawable/badge_block.xml
│   ├── drawable/badge_warn.xml
│   ├── drawable/card_background.xml
│   └── values/{colors,strings,themes}.xml
└── app/src/main/AndroidManifest.xml
```

## Build requirements

- Android Studio Ladybug or newer
- Android SDK 34
- JDK 17

## Build the APK

### Android Studio (recommended)

1. Open `src/wallet` in Android Studio.
2. Sync Gradle and let it download dependencies.
3. Choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. The APK path is shown in the notification; it is usually `src/wallet/app/build/outputs/apk/debug/app-debug.apk`.

### Command line

With the Android SDK installed and `ANDROID_HOME` set:

```bash
cd src/wallet
./gradlew assembleDebug
```

The debug APK is written to:

```
app/build/outputs/apk/debug/app-debug.apk
```

Install it with:

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Run the demo

1. Open `src/wallet` in Android Studio and sync Gradle.
2. Run the `app` configuration on an emulator or physical device.
3. On the main screen, tap **Enable protection (Accessibility)** and turn on **Sentinel Scam Shield** in system settings.
4. Tap **Allow display over other apps** and grant the permission.
5. Tap **Open Mock TNG transfer (demo)**.
6. The Sentinel overlay appears after a short delay with the screening verdict.

## Make it work with the real TNG app

The code already targets TNG's package name (`com.tngdigital.ewallet`). Flutter apps expose a semantics tree, but the exact labels and structure differ from the mock screen. To calibrate:

1. Install the debug APK on a device with TNG eWallet.
2. Enable Sentinel Scam Shield in Accessibility settings.
3. Open TNG and navigate to any transfer confirmation screen.
4. Watch the logcat dump:

```bash
adb logcat -s SentinelAccessibility:D
```

Every TNG window event prints a node tree dump showing `className`, `viewIdResourceName`, and visible `text` for every node.

5. Compare the dump to the label sets in `TngScreenAdapter.kt` (`PAYEE_LABELS`, `AMOUNT_LABELS`, `MEMO_LABELS`) and adjust them to match the exact text TNG uses on its confirmation screen.
6. Rebuild and reinstall.

The adapter uses the same label-fallback strategy as the browser extension, so small wording differences are the only thing standing between the mock and the real app.

## Configure the API endpoint

The default endpoint is `https://next-hack2026.vercel.app`. For local development with the Next.js dev server, change the API base URL in the app to `http://10.0.2.2:3000` (emulator) or your machine's LAN IP (physical device). Cleartext traffic is already permitted for `10.0.2.2` and `localhost` in `network_security_config.xml`.

## Real-world caveats

- **Android only.** iOS does not allow apps to inspect other apps.
- **TNG may resist.** Some wallet apps detect accessibility services and warn or refuse to run; this is a deployment consideration, not a demo blocker.
- **Play Store policy.** Accessibility services are scrutinized, but anti-fraud is an accepted justification. For the hackathon, sideload the APK.
- **Adapter tuning.** The mock screen is tuned to the strings in `res/values/strings.xml`. The real TNG Flutter semantics tree may need small adjustments to `TngScreenAdapter.kt` based on an actual node dump.
