#!/bin/bash

# Build and Release Script for Lønberegning Mobile App
# Usage: ./build-and-release.sh [version]

set -e

VERSION=${1:-"1.0.0-beta"}
REPO="IIVroomVroomII/lonberegner"

echo "🚀 Building Lønberegning Mobile App v$VERSION"
echo "=============================================="

# Check Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter is not installed. Please install Flutter first."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
flutter clean

# Get dependencies
echo "📦 Installing dependencies..."
flutter pub get

# Run tests (if any)
# echo "🧪 Running tests..."
# flutter test

# Build APK
echo "🔨 Building Android APK..."
flutter build apk --release

# Check if build was successful
if [ ! -f "build/app/outputs/flutter-apk/app-release.apk" ]; then
    echo "❌ Build failed! APK not found."
    exit 1
fi

# Get file size
SIZE=$(du -h "build/app/outputs/flutter-apk/app-release.apk" | cut -f1)
echo "✅ Build successful! APK size: $SIZE"

# Create releases directory
mkdir -p releases

# Copy APK with version name
cp build/app/outputs/flutter-apk/app-release.apk "releases/lonberegning-v$VERSION.apk"

echo ""
echo "📱 APK Ready for Distribution!"
echo "================================"
echo "File: releases/lonberegning-v$VERSION.apk"
echo "Size: $SIZE"
echo ""
echo "Next steps:"
echo ""
echo "1. Test locally:"
echo "   flutter install"
echo ""
echo "2. Create GitHub Release:"
echo "   git tag -a v$VERSION -m 'Release version $VERSION'"
echo "   git push origin v$VERSION"
echo ""
echo "   Then go to: https://github.com/$REPO/releases/new"
echo "   - Select tag: v$VERSION"
echo "   - Upload: releases/lonberegning-v$VERSION.apk"
echo "   - Mark as pre-release"
echo "   - Publish"
echo ""
echo "3. Share download link:"
echo "   https://github.com/$REPO/releases/download/v$VERSION/lonberegning-v$VERSION.apk"
echo ""
echo "4. Or use GitHub latest release link:"
echo "   https://github.com/$REPO/releases/latest"
echo ""

# Optional: Automatically create GitHub release if gh CLI is installed
if command -v gh &> /dev/null; then
    read -p "📤 Do you want to create a GitHub release now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating GitHub release..."

        # Create tag
        git tag -a "v$VERSION" -m "Release version $VERSION" 2>/dev/null || echo "Tag already exists"
        git push origin "v$VERSION" 2>/dev/null || echo "Tag already pushed"

        # Create release
        gh release create "v$VERSION" \
            "releases/lonberegning-v$VERSION.apk" \
            --title "Lønberegning App v$VERSION" \
            --notes "Beta test version

**Features:**
- 🟢 Start/Stop arbejde med live timer
- ⏸️ Pause & hvil tracking
- 🧙 Smart wizard ved dagens afslutning
- 📍 GPS automatisk work type detection
- 💾 Offline database support
- 📅 Historik med kalender
- 🔔 Push notifikationer

**Installation:**
1. Download APK på Android telefon
2. Åbn fil og installer
3. Tillad permissions (location, notifications)
4. Log ind

**Test credentials:** (hvis du har oprettet nogen)

**Known issues:** TBD

**Feedback:** Opret en issue på GitHub" \
            --prerelease

        echo "✅ GitHub release created!"
        echo "📱 Download link: https://github.com/$REPO/releases/download/v$VERSION/lonberegning-v$VERSION.apk"
    fi
fi

echo ""
echo "✨ Done!"
