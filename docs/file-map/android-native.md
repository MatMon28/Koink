# File map: `android/` and Capacitor

> **Scope:** every file of the native project, which ones are ours, which are the template's, which are generated.
>
> **Read when:** you open `android/` and need to know what you may edit.
>
> **Related:** [../android.md](../android.md), [../prepare-apps.md](../prepare-apps.md)

The project was created by `npx cap add android` (Capacitor 8.5.3). Paths below are relative to `android/`.

## Written or produced for Koink

| File | What |
| --- | --- |
| `app/src/main/java/com/koink/app/MainActivity.java` | `BridgeActivity`: registers `KoinkDevicePlugin`, sets the window and WebView background to the saved colour before the page loads |
| `app/src/main/java/com/koink/app/LaunchBackground.java` | Stores the app's background colour (SharedPreferences `launch_background`), applies it to window and WebView, and on Android 13+ switches the launch-screen style to `Splash_<hex>` |
| `app/src/main/java/com/koink/app/KoinkDevicePlugin.java` | Capacitor plugin `KoinkDevice` with two methods: `setLaunchBackground({ color })` and `setWidgets({ json })` |
| `app/src/main/java/com/koink/app/KoinkWidgetProvider.java` | The three home-screen widgets (`Single`, `Multi`, `Categories`): draw the buttons the web app stored with `setWidgets`, a tap starts the app with `koink://widget?a=<action>` |
| `app/src/main/res/layout/widget_buttons.xml`, `widget_row.xml`, `widget_button.xml`, `widget_button_single.xml` | RemoteViews layouts: centred tray, row, round button (small icon + name), the lone circle of the single-button widget, empty state |
| `app/src/main/res/drawable/widget_tray_pill.xml`, `widget_tray_card.xml`, `widget_tile_bg.xml` | Tray shapes (one row = pill, several rows = card) and the round button; all white and tinted at run time with the app's theme / the button's colour |
| `app/src/main/res/xml/widget_single_info.xml`, `widget_multi_info.xml`, `widget_categories_info.xml` | `appwidget-provider` definitions (1x1, 4x1, 4x2) |
| `app/src/main/res/values/splash_themes.xml` | **Generated** by `npm run android:splash`: 48 `Splash_<hex>` styles, one per app background. Do not edit |
| `app/src/main/res/drawable/splash_blank.xml` | Transparent launch-screen icon, so the launch screen is a colour only |
| `app/src/main/res/values/styles.xml` | Template themes; `AppTheme.NoActionBarLaunch` = colour, blank icon, `postSplashScreenTheme` |
| `app/src/main/res/values/colors.xml` | `launch_background` `#EFE9DD`, the fallback launch colour |
| `app/src/main/res/mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`, `ic_launcher_monochrome.png` | Launcher icons, rendered by `npm run brand` |
| `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `ic_launcher_round.xml` | Adaptive icon: colour background, PNG foreground, PNG monochrome layer (themed icons) |
| `app/src/main/res/values/ic_launcher_background.xml` | Adaptive-icon background colour `#F9F3E6` |
| `app/src/main/res/drawable-{m,h,xh,xxh,xxxh}dpi/ic_stat_koink.png` | Notification icon: the logo, white on transparent, rendered by `npm run brand`, found by name by the notifications plugin |
| `app/src/main/res/raw/keep.xml` | Keeps `Splash_*` and `ic_stat_koink` if resource shrinking is ever enabled |
| `app/src/main/res/values/strings.xml` | App name `Koink`, package `com.koink.app` (written by Capacitor from `capacitor.config.json`), plus the widget names and descriptions |
| `app/src/main/AndroidManifest.xml` | Template manifest plus three permissions for reminders (`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`), the three widget receivers and the `koink://widget` intent filter |
| `app/build.gradle` | `namespace` / `applicationId` `com.koink.app`, `versionCode`, `versionName`. Raise the version here for a release |

## Template, unchanged

| File | Role |
| --- | --- |
| (the rest of `AndroidManifest.xml`) | One activity (`singleTask`, launch theme), the `FileProvider` used when sharing a backup, the `INTERNET` permission |
| `app/src/main/res/xml/file_paths.xml` | `FileProvider` paths: external storage and the cache directory |
| `app/src/main/res/layout/activity_main.xml`, `res/drawable/ic_launcher_background.xml`, `res/drawable-v24/ic_launcher_foreground.xml` | Layout, unused template vectors |
| `app/proguard-rules.pro`, `app/.gitignore`, `.gitignore` | Shrinker rules (minification is off), ignore lists |
| `build.gradle`, `settings.gradle`, `gradle.properties`, `variables.gradle` | Gradle setup; SDK and library versions are in `variables.gradle` (minSdk 24, compile / target 36) |
| `gradlew`, `gradlew.bat`, `gradle/wrapper/*` | Gradle wrapper 8.14.3 |
| `app/src/test/`, `app/src/androidTest/` | Capacitor's example tests |

The template's launch images (`drawable*/splash.png`) were removed: nothing refers to them any more.

## Rewritten by every `cap sync`: do not edit

| File | Content |
| --- | --- |
| `capacitor.settings.gradle` | Gradle `include` lines for Capacitor and each of the four plugins (paths into `node_modules`) |
| `app/capacitor.build.gradle` | Java 21 compile options and the plugin dependencies |

## Generated and git-ignored

| Path | Content |
| --- | --- |
| `app/src/main/assets/public/` | The web build copied from `dist/` |
| `app/src/main/assets/capacitor.config.json` | Copy of the root config |
| `app/src/main/assets/capacitor.plugins.json` | Plugin classes to load (`AppPlugin`, `FilesystemPlugin`, `LocalNotificationsPlugin`, `SharePlugin`) |
| `app/src/main/res/xml/config.xml`, `capacitor-cordova-android-plugins/` | Cordova compatibility layer (no Cordova plugins are used) |
| `app/build/`, `.gradle/`, `local.properties` | Build output and local SDK path |

## Outside `android/`

| File | Role |
| --- | --- |
| `capacitor.config.json` | App id, name, `webDir`, scheme, `SystemBars`, Android options |
| `scripts/prepare-android.mjs` | The build-and-sync step; also checks the notification icon, the blank launch icon, the plugin and that `splash_themes.xml` is up to date |
| `scripts/generate-splash-themes.mjs`, `scripts/render-brand.mjs` | Write `splash_themes.xml`; write the icons |
| `src/lib/platform.ts`, `src/lib/back.ts`, `src/lib/notifications.ts` | The JavaScript that talks to the plugins (`KoinkDevice` is declared in `platform.ts`) |

Because the Gradle files point into `node_modules/@capacitor/*`, the Android project only builds after `npm ci`.
