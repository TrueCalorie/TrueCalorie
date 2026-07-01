#!/usr/bin/env bash
set -euo pipefail
PLIST="ios/App/App/Info.plist"

set_str () {
  /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Set :$1 $2" "$PLIST"
}

set_str NSCameraUsageDescription "Used to scan food barcodes for quick logging."
set_str NSMicrophoneUsageDescription "Used to log meals by voice."
set_str NSSpeechRecognitionUsageDescription "TrueCalorie uses speech recognition to understand your meal descriptions."

/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST"

if ! /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string truecalorie" "$PLIST"
fi

echo "patch-plist: Info.plist patched."
