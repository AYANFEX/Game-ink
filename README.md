# Game Ink — Android App (Katana)

WebView shell for the Game Ink SPA with native notification support.

## Setup

```bash
npm install
```

## Building with EAS

Before building, place these files in the project root (they are gitignored — keep them safe):
- `gameink-katana.keystore`
- `credentials.json`

Then log in to EAS:
```bash
npx eas login
# username: domax
```

### Preview APK (for testing)
```bash
npm run build:preview
```

### Production APK
```bash
npm run build:prod
```

EAS will build in the cloud — no local Android SDK needed.
Download the APK from the Expo dashboard when done.

## Keystore credentials
- **Alias:** gameink
- **Store/Key password:** G4m3Ink@K4t4n4!
- **Valid until:** Nov 11, 2053

⚠️ Back up `gameink-katana.keystore` and `credentials.json` somewhere safe.
If you lose the keystore you cannot update the app on Play Store.
