package com.koink.app;

import android.app.Activity;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Looper;
import android.webkit.WebView;

/**
 * Keeps every native surface that is visible before the web page paints the same colour as the
 * app's current background (`--bg`). The launch animation starts on that colour too, so opening the
 * app shows one unbroken background from the system launch screen to the animation. The web layer
 * reports the colour through KoinkDevicePlugin.setLaunchBackground whenever the theme changes.
 *
 * - System launch screen (Android 13+): getSplashScreen().setSplashScreenTheme picks the matching
 *   generated style `Splash_<hex>` (values/splash_themes.xml, scripts/generate-splash-themes.mjs).
 *   On Android 12 and older the launch screen keeps the Light colour of AppTheme.NoActionBarLaunch:
 *   the platform has no run-time switch there.
 * - Activity window and WebView background: set in MainActivity before the page has loaded.
 */
final class LaunchBackground {
    private static final String PREFS = "launch_background";
    private static final String KEY = "color";
    // Light, the same as values/colors.xml > launch_background and capacitor.config.json > android.backgroundColor.
    private static final int FALLBACK = 0xFFEFE9DD;

    private LaunchBackground() {}

    private static Activity getActivity(Context context) {
        Context current = context;
        while (current instanceof ContextWrapper) {
            if (current instanceof Activity) {
                return (Activity) current;
            }
            current = ((ContextWrapper) current).getBaseContext();
        }
        return null;
    }

    /** Accepts `#rrggbb` only; returns whether the colour was stored. */
    static boolean save(Context context, String hex) {
        if (hex == null || !hex.matches("^#[0-9a-fA-F]{6}$")) return false;
        String clean = hex.toLowerCase();
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!clean.equals(prefs.getString(KEY, null))) prefs.edit().putString(KEY, clean).apply();
        applySplashTheme(context, clean);
        return true;
    }

    static int color(Context context) {
        String hex = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        try {
            return hex == null ? FALLBACK : Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return FALLBACK;
        }
    }

    /** Re-asserts the splash style for the next cold start (also covers an app update that reset it). */
    static void applySplashTheme(Context context) {
        String hex = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        if (hex != null) applySplashTheme(context, hex);
    }

    /**
     * Same as {@link #applySplashTheme(Context)} but off the start-up path: it only affects the NEXT
     * cold start, so it runs when the main thread first goes idle instead of inside onCreate().
     */
    static void applySplashThemeWhenIdle(final Activity activity) {
        if (Build.VERSION.SDK_INT < 33) return;
        Looper.myQueue().addIdleHandler(() -> {
            if (!activity.isFinishing() && !activity.isDestroyed()) applySplashTheme(activity);
            return false; // run once
        });
    }

    private static void applySplashTheme(Context context, String hex) {
        if (Build.VERSION.SDK_INT < 33) return;
        Activity activity = getActivity(context);
        if (activity == null) return;
        // Looked up by name: res/raw/keep.xml protects the Splash_* styles from resource shrinking.
        int style = activity.getResources().getIdentifier("Splash_" + hex.substring(1), "style", activity.getPackageName());
        if (style != 0) activity.getSplashScreen().setSplashScreenTheme(style);
    }

    static void applyToWindow(Activity activity) {
        activity.getWindow().setBackgroundDrawable(new ColorDrawable(color(activity)));
    }

    static void applyToWebView(Activity activity, WebView webView) {
        if (webView != null) webView.setBackgroundColor(color(activity));
    }
}
