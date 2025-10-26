# Mobilapp Distribution Guide

Guide til at bygge og distribuere test-versionen af mobilappen.

## 🚀 Hurtig Start: GitHub Releases (Anbefalet for testing)

### 1. Byg Android APK

```bash
cd mobile

# Install dependencies
flutter pub get

# Build release APK
flutter build apk --release

# APK vil være placeret i:
# build/app/outputs/flutter-apk/app-release.apk
```

### 2. Upload til GitHub Releases

```bash
# Fra root directory
git tag -a v1.0.0-beta -m "Beta test version 1.0.0"
git push origin v1.0.0-beta

# Gå til GitHub:
# https://github.com/IIVroomVroomII/lonberegner/releases/new

# 1. Vælg tag: v1.0.0-beta
# 2. Release title: "Lønberegning App Beta v1.0.0"
# 3. Description: "Test version til chauffører"
# 4. Upload fil: mobile/build/app/outputs/flutter-apk/app-release.apk
# 5. Mark as "Pre-release"
# 6. Publish release

# Testere kan nu downloade fra:
# https://github.com/IIVroomVroomII/lonberegner/releases/latest
```

### 3. Del download link

Send testere dette link:
```
https://github.com/IIVroomVroomII/lonberegner/releases/latest/download/app-release.apk
```

**Android Installation:**
1. Download APK på telefon
2. Åbn fil
3. Tryk "Installer" (skal tillade installation fra ukendte kilder første gang)
4. Åbn app

---

## 🔥 Firebase App Distribution (For professionel distribution)

Mere avanceret men bedre til teams.

### Setup

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize Firebase i mobile directory
cd mobile
firebase init

# Vælg:
# - App Distribution
# - Create new project: "lonberegning-app"

# 4. Add Firebase plugin
flutter pub add firebase_core
flutter pub add firebase_app_distribution

# 5. Build and upload
flutter build apk --release
firebase appdistribution:distribute \
  build/app/outputs/flutter-apk/app-release.apk \
  --app YOUR_APP_ID \
  --groups testers \
  --release-notes "Beta test version"
```

### Inviter testere

```bash
# Via email
firebase appdistribution:testers:add test@example.com --project lonberegning-app

# Via Firebase Console
# https://console.firebase.google.com/project/lonberegning-app/appdistribution
```

Testere modtager email med download link.

---

## 📱 TestFlight (iOS - Kræver Apple Developer Account)

**Forudsætninger:**
- Apple Developer Account ($99/år)
- Mac med Xcode
- Signing certificates

### Build iOS

```bash
cd mobile

# Build iOS
flutter build ios --release

# Open i Xcode
open ios/Runner.xcworkspace

# I Xcode:
# 1. Select "Any iOS Device"
# 2. Product → Archive
# 3. Distribute App → App Store Connect
# 4. Upload

# I App Store Connect:
# 1. Gå til TestFlight
# 2. Tilføj testere
# 3. Send invitation
```

---

## 🔧 Development Builds (For testing under udvikling)

### Option 1: Direct APK Install (Hurtigst)

```bash
# Connect Android device via USB
flutter devices

# Install directly
flutter install
# eller
flutter run --release
```

### Option 2: QR Code Distribution

Brug en service som:
- **Appetize.io** - Kør app i browser
- **BrowserStack App Live** - Test på rigtige devices
- **Diawi.com** - Upload APK/IPA, få download link

---

## 📦 Build Kommandoer Oversigt

```bash
# Android
flutter build apk --release              # Standard APK
flutter build apk --split-per-abi        # Separate APKs per CPU architecture (mindre størrelse)
flutter build appbundle --release        # AAB for Google Play

# iOS
flutter build ios --release              # iOS build
flutter build ipa --release              # iOS IPA fil

# Debug builds
flutter build apk --debug                # Debug APK
flutter run --release                    # Run release mode på tilsluttet device
```

---

## 🎯 Recommended Workflow for Beta Testing

**Uge 1-2: Internal Testing**
1. Byg APK: `flutter build apk --release`
2. Test selv på 2-3 devices
3. Upload til GitHub Releases (private)

**Uge 3-4: Closed Beta**
1. Setup Firebase App Distribution
2. Inviter 5-10 testere
3. Indsaml feedback
4. Bug fixes

**Uge 5+: Open Beta**
1. Upload til Google Play (Internal Testing track)
2. Større tester gruppe (50+ users)
3. Performance monitoring
4. Forbered production release

**Production:**
1. Google Play Store submission
2. Apple App Store submission (hvis iOS)

---

## 🔐 Signing Configuration (For production)

### Android Signing

```bash
# Generate keystore
keytool -genkey -v -keystore ~/lonberegning-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias lonberegning

# Create key.properties
cat > android/key.properties << EOF
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=lonberegning
storeFile=/Users/you/lonberegning-release-key.jks
EOF

# Update android/app/build.gradle
# (See Flutter docs for signing configuration)
```

---

## 📊 Testing Checklist

Før distribution til testere:

- [ ] App bygger uden fejl
- [ ] Alle features virker i release mode
- [ ] Internet permissions sat korrekt
- [ ] Location permissions virker
- [ ] Notifications virker
- [ ] App icon sat
- [ ] App navn korrekt
- [ ] Minimum SDK version sat (Android 21+)
- [ ] Privacy policy link tilgængelig
- [ ] Crash reporting setup (optional)

---

## 🆘 Troubleshooting

**"App not installed" fejl:**
- Afinstaller eksisterende version først
- Check signing configuration
- Tjek available storage

**Location permissions virker ikke:**
- Tilføj permissions i AndroidManifest.xml
- Request runtime permissions i app

**APK for stor:**
- Brug `--split-per-abi` flag
- Enable ProGuard/R8 shrinking
- Compress assets

---

## 📱 Quick Download Link Template

Send dette til testere:

```
📱 Download Lønberegning Beta App

Android:
👉 https://github.com/IIVroomVroomII/lonberegner/releases/latest

Installation:
1. Klik på linket på din Android telefon
2. Download "app-release.apk"
3. Åbn filen når download er færdig
4. Tryk "Installer" (skal evt. tillade installation fra Chrome)
5. Åbn appen

Første gang:
- Tillad location permissions (for GPS tracking)
- Tillad notification permissions (for påmindelser)
- Log ind med dine credentials

Support: [din email]
```

---

## 🎉 Næste Steps

1. **Byg første APK**
   ```bash
   cd mobile && flutter build apk --release
   ```

2. **Test lokalt først**
   ```bash
   flutter install
   ```

3. **Upload til GitHub Releases**
   - Tag: v1.0.0-beta
   - Upload APK
   - Share link med testere

4. **Indsaml feedback**
   - Opret GitHub Issues for bugs
   - Prioriter fixes
   - Release v1.0.1-beta

5. **Når klar til production:**
   - Setup Google Play Console
   - Submit til review
   - Monitor metrics
