# NovaMed Capacitor Ready

This folder is prepared for packaging the static HTML/CSS/JS NovaMed project into an Android app using Capacitor.

## Commands on Windows PowerShell

```powershell
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Then in Android Studio:
Build > Build Bundle(s) / APK(s) > Build APK(s)

Every time you edit files inside www:
```powershell
npx cap sync android
npx cap open android
```
