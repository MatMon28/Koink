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
 * button, plus the app's theme colours. The widget's shape follows the number of buttons (circle, pill, card).
 * Behind several buttons there is a semitransparent tray (the app's surface colour at about 70 %, {@code widget_tray_bg});
 * a lone button has none. The buttons share the widget's width, so they spread out as the widget is made wider. The lone
 * circle of the single widget is 48dp (icon 24dp), the other circles 40dp (icon 22dp). Every single-button widget has
 * its own button, picked when it is placed ({@link KoinkWidgetConfigActivity}) and stored per widget id. A tap opens the app with that link ({@code koink://widget?a=<action>}), which the web app turns
 * into the matching sheet (src/lib/useWidgets.ts). Layouts use only RemoteViews-safe classes.
 */
public abstract class KoinkWidgetProvider extends AppWidgetProvider {

    private static final String PREFS = "koink_widgets";
    private static final String KEY_JSON = "json";
    /**
     * Opacity of the tray behind several buttons, 0 to 255. Same as the Kakcal widgets: 0x7A (48 %) on a light
     * surface (Kakcal's {@code widget_tray.xml}), 0xA6 (65 %) on a dark one ({@code widget_tray_dark.xml}).
     */
    private static final int TRAY_ALPHA = 122;
    private static final int TRAY_ALPHA_DARK = 166;
    /** The button each single-button widget was given when it was placed: {@code w<widgetId>} = action key. */
    static final String PICKS = "koink_widget_picks";
    /** Which array of the stored JSON this widget shows: "single", "multi" or "categories". */
    protected abstract String kind();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(context, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, android.os.Bundle options) {
        manager.updateAppWidget(id, build(context, id));
    }

    private RemoteViews build(Context context, int widgetId) {
        RemoteViews root = new RemoteViews(context.getPackageName(), R.layout.widget_buttons);
        root.removeAllViews(R.id.rows);
        JSONArray buttons = buttons(context, widgetId);

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

        // The app's own surface colour (Light, Soft dark, Dark), handed over with the buttons: it tints the tray.
        JSONObject theme = theme(context);

        // The widget's shape follows its buttons (mirrors widgetShape / widgetColumns in src/lib/widgets.ts):
        // one button = a lone circle, two to four = a pill with one row, five or more = a rounded card of
        // three (up to six buttons) or four buttons per row.
        int count = buttons.length();
        int perRow = count <= 4 ? Math.max(1, count) : (count <= 6 ? 3 : 4);

        // Several buttons sit on a semitransparent tray: the app's surface colour at about 48 % (65 % when dark, like Kakcal) (the shape is a
        // rounded rectangle whose radius turns a one-row tray into a pill). A lone circle has no tray and no padding.
        float d = context.getResources().getDisplayMetrics().density;
        if (count == 1) {
            root.setViewVisibility(R.id.tray_bg, android.view.View.GONE);
            root.setViewPadding(R.id.rows, 0, 0, 0, 0);
        } else {
            int surface = color(theme == null ? null : theme.optString("surface"), Color.parseColor("#FBF8F2"));
            root.setViewVisibility(R.id.tray_bg, android.view.View.VISIBLE);
            // A dark surface (Soft dark, Dark) gets the denser tray, a light one the airier one.
            boolean dark = (0.299 * Color.red(surface) + 0.587 * Color.green(surface) + 0.114 * Color.blue(surface)) < 128;
            root.setInt(R.id.tray_bg, "setColorFilter", (surface & 0x00FFFFFF) | ((dark ? TRAY_ALPHA_DARK : TRAY_ALPHA) << 24));
            root.setViewPadding(R.id.rows, (int) (10 * d), (int) (8 * d), (int) (10 * d), (int) (8 * d));
        }

        RemoteViews row = null;
        for (int i = 0; i < count; i++) {
            if (i % perRow == 0) {
                if (row != null) root.addView(R.id.rows, row);
                row = new RemoteViews(context.getPackageName(), R.layout.widget_row);
            }
            JSONObject button = buttons.optJSONObject(i);
            if (button != null && row != null) {
                // A short last row is centred on the grid of the rows above: half a slot of spacer per missing button, on each side.
                int inRow = Math.min(perRow, count - (i / perRow) * perRow);
                boolean first = i % perRow == 0;
                if (first && count > 1 && inRow < perRow) addSpacers(context, row, perRow - inRow);
                row.addView(R.id.row, tile(context, button, count == 1));
                if (count > 1 && inRow < perRow && i % perRow == inRow - 1) addSpacers(context, row, perRow - inRow);
            }
        }
        if (row != null) root.addView(R.id.rows, row);
        return root;
    }

    private static void addSpacers(Context context, RemoteViews row, int count) {
        for (int k = 0; k < count; k++) row.addView(R.id.row, new RemoteViews(context.getPackageName(), R.layout.widget_spacer));
    }

    private RemoteViews tile(Context context, JSONObject button, boolean lone) {
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

    /** The buttons this widget draws. */
    protected JSONArray buttons(Context context, int widgetId) {
        String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_JSON, null);
        if (json == null) return null;
        try {
            return new JSONObject(json).optJSONArray(kind());
        } catch (org.json.JSONException e) {
            return null;
        }
    }

    /** Every button a single-button widget can be given (the app's catalog), or null before the first hand-over. */
    static JSONArray catalog(Context context) {
        String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_JSON, null);
        if (json == null) return null;
        try {
            return new JSONObject(json).optJSONArray("catalog");
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

    /**
     * One button. Each widget has its own: the user picks it when placing the widget (KoinkWidgetConfigActivity),
     * so one can open Add expense in Food and another Add income. A widget without a pick (or whose pick no
     * longer exists, a deleted category) shows the default of Settings > Widgets.
     */
    public static class Single extends KoinkWidgetProvider {
        @Override protected String kind() { return "single"; }

        @Override
        protected JSONArray buttons(Context context, int widgetId) {
            String pick = context.getSharedPreferences(PICKS, Context.MODE_PRIVATE).getString("w" + widgetId, null);
            JSONArray catalog = catalog(context);
            if (pick != null && catalog != null) {
                for (int i = 0; i < catalog.length(); i++) {
                    JSONObject button = catalog.optJSONObject(i);
                    if (button != null && pick.equals(button.optString("key"))) {
                        JSONArray one = new JSONArray();
                        one.put(button);
                        return one;
                    }
                }
            }
            return super.buttons(context, widgetId);
        }

        @Override
        public void onDeleted(Context context, int[] ids) {
            SharedPreferences.Editor edit = context.getSharedPreferences(PICKS, Context.MODE_PRIVATE).edit();
            for (int id : ids) edit.remove("w" + id);
            edit.apply();
        }

        /** Remembers the button picked for one widget and draws it. */
        static void pick(Context context, int widgetId, String key) {
            context.getSharedPreferences(PICKS, Context.MODE_PRIVATE).edit().putString("w" + widgetId, key).apply();
            new Single().onUpdate(context, AppWidgetManager.getInstance(context), new int[] { widgetId });
        }
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
