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
 * button. A tap opens the app with that link ({@code koink://widget?a=<action>}), which the web app turns
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
            root.setViewVisibility(R.id.rows, android.view.View.GONE);
            Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (open != null) {
                root.setOnClickPendingIntent(R.id.root, PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            return root;
        }

        root.setViewVisibility(R.id.empty, android.view.View.GONE);
        root.setViewVisibility(R.id.rows, android.view.View.VISIBLE);
        // The single button is just the tile; the others sit on a soft tray.
        if (buttons.length() == 1) root.setInt(R.id.root, "setBackgroundColor", Color.TRANSPARENT);

        // Category widget: four per row. The others: one row up to four buttons, then two rows.
        int count = buttons.length();
        int perRow = "categories".equals(kind()) ? 4 : (count > 4 ? (count + 1) / 2 : count);

        RemoteViews row = null;
        for (int i = 0; i < count; i++) {
            if (i % perRow == 0) {
                if (row != null) root.addView(R.id.rows, row);
                row = new RemoteViews(context.getPackageName(), R.layout.widget_row);
            }
            JSONObject button = buttons.optJSONObject(i);
            if (button != null && row != null) row.addView(R.id.row, tile(context, button));
        }
        if (row != null) {
            // Short last row of the category grid: pad it so the tiles keep their size.
            if ("categories".equals(kind())) {
                for (int pad = count % perRow; pad != 0 && pad < perRow; pad++) {
                    row.addView(R.id.row, new RemoteViews(context.getPackageName(), R.layout.widget_button_pad));
                }
            }
            root.addView(R.id.rows, row);
        }
        return root;
    }

    private RemoteViews tile(Context context, JSONObject button) {
        RemoteViews tile = new RemoteViews(context.getPackageName(), R.layout.widget_button);
        int bg = color(button.optString("bg"), Color.parseColor("#FBF8F2"));
        int fg = color(button.optString("fg"), Color.parseColor("#24201C"));
        tile.setInt(R.id.tile_bg, "setColorFilter", bg);
        tile.setTextViewText(R.id.label, button.optString("label"));
        tile.setTextColor(R.id.label, fg);
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

    /** The buttons the user picks (up to six, two rows from five). */
    public static class Multi extends KoinkWidgetProvider {
        @Override protected String kind() { return "multi"; }
    }

    /** One button per expense category: a tap opens Add expense with it chosen. Four per row. */
    public static class Categories extends KoinkWidgetProvider {
        @Override protected String kind() { return "categories"; }
    }
}
