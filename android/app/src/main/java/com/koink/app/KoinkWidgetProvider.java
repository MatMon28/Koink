package com.koink.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.util.Base64;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The three home-screen widgets: one button ({@link Single}), several buttons ({@link Multi}) and one button
 * per expense category ({@link Categories}). They draw whatever the web app last handed over through
 * {@code KoinkDevice.setWidgets} (src/lib/widgetBridge.ts): label, colours, an icon PNG and a link for each
 * button, plus the app's theme colours. The widget's shape follows the number of buttons (circle, pill, card). A tap opens the app with that link ({@code koink://widget?a=<action>}), which the web app turns
 * into the matching sheet (src/lib/useWidgets.ts). Layouts use only RemoteViews-safe classes.
 */
public abstract class KoinkWidgetProvider extends AppWidgetProvider {

    private static final String PREFS = "koink_widgets";
    private static final String KEY_JSON = "json";

    /** Which array of the stored JSON this widget shows: "single", "multi" or "categories". */
    protected abstract String kind();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(context));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, android.os.Bundle options) {
        manager.updateAppWidget(id, build(context));
    }

    private RemoteViews build(Context context) {
        RemoteViews root = new RemoteViews(context.getPackageName(), R.layout.widget_buttons);
        root.removeAllViews(R.id.rows);
        JSONArray buttons = buttons(context);

        if (buttons == null || buttons.length() == 0) {
            // Nothing handed over yet (the app has not been opened since the widget was added).
            root.setViewVisibility(R.id.empty, android.view.View.VISIBLE);
            root.setViewVisibility(R.id.tray, android.view.View.GONE);
            Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (open != null) {
                root.setOnClickPendingIntent(R.id.root, PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            return root;
        }

        root.setViewVisibility(R.id.empty, android.view.View.GONE);
        root.setViewVisibility(R.id.tray, android.view.View.VISIBLE);

        // The app's own colours (Light, Soft dark, Dark), handed over with the buttons.
        JSONObject theme = theme(context);
        int surface = color(theme == null ? null : theme.optString("surface"), Color.parseColor("#FBF8F2"));
        int border = color(theme == null ? null : theme.optString("border"), Color.parseColor("#E2D9C8"));
        int text = color(theme == null ? null : theme.optString("text"), Color.parseColor("#24201C"));

        // The widget's shape follows its buttons (mirrors widgetShape / widgetColumns in src/lib/widgets.ts):
        // one button = a lone circle, two to four = a pill with one row, five or more = a rounded card of
        // three (up to six buttons) or four buttons per row.
        int count = buttons.length();
        int perRow = count <= 4 ? Math.max(1, count) : (count <= 6 ? 3 : 4);

        if (count == 1) {
            root.setViewVisibility(R.id.tray_border, android.view.View.GONE);
            root.setViewVisibility(R.id.tray_fill, android.view.View.GONE);
            root.setViewPadding(R.id.rows, 0, 0, 0, 0);
        } else {
            int tray = count <= 4 ? R.drawable.widget_tray_pill : R.drawable.widget_tray_card;
            root.setViewVisibility(R.id.tray_border, android.view.View.VISIBLE);
            root.setViewVisibility(R.id.tray_fill, android.view.View.VISIBLE);
            root.setImageViewResource(R.id.tray_border, tray);
            root.setImageViewResource(R.id.tray_fill, tray);
            root.setInt(R.id.tray_border, "setColorFilter", border);
            root.setInt(R.id.tray_fill, "setColorFilter", surface);
            float d = context.getResources().getDisplayMetrics().density;
            root.setViewPadding(R.id.rows, (int) (8 * d), (int) (6 * d), (int) (8 * d), (int) (6 * d));
        }

        RemoteViews row = null;
        for (int i = 0; i < count; i++) {
            if (i % perRow == 0) {
                if (row != null) root.addView(R.id.rows, row);
                row = new RemoteViews(context.getPackageName(), R.layout.widget_row);
            }
            JSONObject button = buttons.optJSONObject(i);
            if (button != null && row != null) row.addView(R.id.row, tile(context, button, count == 1, text));
        }
        if (row != null) root.addView(R.id.rows, row);
        return root;
    }

    private RemoteViews tile(Context context, JSONObject button, boolean lone, int textColor) {
        RemoteViews tile = new RemoteViews(context.getPackageName(), lone ? R.layout.widget_button_single : R.layout.widget_button);
        int bg = color(button.optString("bg"), Color.parseColor("#FBF8F2"));
        tile.setInt(R.id.tile_bg, "setColorFilter", bg);
        // No visible text on a button: the name is only what a screen reader announces.
        tile.setContentDescription(R.id.tile, button.optString("label"));
        Bitmap icon = icon(button.optString("icon"));
        if (icon != null) tile.setImageViewBitmap(R.id.icon, icon);
        String uri = button.optString("uri");
        if (!uri.isEmpty()) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
            intent.setPackage(context.getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            tile.setOnClickPendingIntent(R.id.tile, PendingIntent.getActivity(context, uri.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        return tile;
    }

    private static int color(String hex, int fallback) {
        if (hex == null || hex.isEmpty()) return fallback;
        try {
            return Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    private static Bitmap icon(String base64) {
        if (base64 == null || base64.isEmpty()) return null;
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** The app's surface / border / text colours as last handed over, or null before the first hand-over. */
    private JSONObject theme(Context context) {
        String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_JSON, null);
        if (json == null) return null;
        try {
            return new JSONObject(json).optJSONObject("theme");
        } catch (org.json.JSONException e) {
            return null;
        }
    }

    private JSONArray buttons(Context context) {
        String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_JSON, null);
        if (json == null) return null;
        try {
            return new JSONObject(json).optJSONArray(kind());
        } catch (org.json.JSONException e) {
            return null;
        }
    }

    /** Stores what the web app handed over and redraws every widget of the three kinds. */
    public static void save(Context context, String json) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_JSON, json).apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        refresh(context, manager, new ComponentName(context, Single.class), new Single());
        refresh(context, manager, new ComponentName(context, Multi.class), new Multi());
        refresh(context, manager, new ComponentName(context, Categories.class), new Categories());
    }

    private static void refresh(Context context, AppWidgetManager manager, ComponentName name, KoinkWidgetProvider provider) {
        int[] ids = manager.getAppWidgetIds(name);
        if (ids != null && ids.length > 0) provider.onUpdate(context, manager, ids);
    }

    /** One button: the user picks what it does. */
    public static class Single extends KoinkWidgetProvider {
        @Override protected String kind() { return "single"; }
    }

    /** The buttons the user picks (up to six, three per row from five). */
    public static class Multi extends KoinkWidgetProvider {
        @Override protected String kind() { return "multi"; }
    }

    /** One button per expense category: a tap opens Add expense with it chosen. Four per row from seven buttons. */
    public static class Categories extends KoinkWidgetProvider {
        @Override protected String kind() { return "categories"; }
    }
}
