---
name: koink-android
description: >-
  Use when modifying Android native code (Java, XML layouts/drawables, Gradle),
  widgets, notifications, splash themes, or preparing the Capacitor Android app.
---

# Koink Android Workflow

1. Open the single matching doc (`docs/android.md`, `docs/prepare-apps.md`, `docs/features/widgets.md`, or `docs/notifications.md`) and `docs/file-map/android-native.md`.
2. Keep project constraints in mind: application id `com.koink.app`, Java 21, minSdk 24, compileSdk/targetSdk 36, Capacitor 8 (`server.androidScheme: "https"`, no `server.url`).
3. After web, widget, or theme edits affecting Android:
   - Run `npm run android:splash` if any theme `--bg` changed.
   - Run `npm run brand` if `src/brand/art.js` changed.
   - Run `npm run android:prepare` (runs `scripts/prepare-android.mjs` and must end with `Android assets ready`).
4. When adding, renaming, or changing native files or widget/notification behaviour, update `docs/android.md` and `docs/file-map/android-native.md` (and `scripts/export-context.mjs`).
