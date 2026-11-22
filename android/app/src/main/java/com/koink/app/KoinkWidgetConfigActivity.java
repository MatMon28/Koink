package com.koink.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Shown when a "Koink: Button" widget is placed (and when it is reconfigured): the user picks which button this
 * widget is, from the app's catalog (the fixed actions and every visible expense category, handed over by the web
 * app in {@code KoinkDevice.setWidgets}, src/lib/widgetBridge.ts). The pick is stored per widget id
 * ({@link KoinkWidgetProvider.Single#pick}). Closing it without a pick cancels the placement. The list is built in
 * code (no layout file) from the same buttons, colours and icons the widget itself draws.
 */
public class KoinkWidgetConfigActivity extends Activity {

    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        // Cancelled until a button is picked: backing out leaves no widget behind.
        setResult(RESULT_CANCELED);
        Intent intent = getIntent();
        if (intent != null && intent.getExtras() != null) {
            widgetId = intent.getExtras().getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }
        setTitle(R.string.widget_pick_title);

        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(16);
        list.setPadding(pad, pad, pad, pad);

        TextView heading = new TextView(this);
        heading.setText(R.string.widget_pick_title);
        heading.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        heading.setTypeface(heading.getTypeface(), android.graphics.Typeface.BOLD);
        heading.setTextColor(Color.parseColor("#24201C"));
        heading.setPadding(0, 0, 0, dp(8));
        list.addView(heading);

        JSONArray catalog = KoinkWidgetProvider.catalog(this);
        if (catalog == null || catalog.length() == 0) {
            // The app has not handed its buttons over yet (it has never been opened): nothing to list.
            TextView empty = new TextView(this);
            empty.setText(R.string.widget_pick_empty);
            empty.setTextColor(Color.parseColor("#24201C"));
            empty.setPadding(0, dp(4), 0, dp(12));
            list.addView(empty);
            TextView open = row(null, getString(R.string.widget_pick_open), Color.parseColor("#EFE9DD"));
            open.setOnClickListener(v -> {
                Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (launch != null) startActivity(launch);
                finish();
            });
            list.addView(open);
        } else {
            for (int i = 0; i < catalog.length(); i++) {
                JSONObject button = catalog.optJSONObject(i);
                if (button == null) continue;
                final String key = button.optString("key");
                if (key.isEmpty()) continue;
                int bg = parse(button.optString("bg"), Color.parseColor("#FBF8F2"));
                TextView item = row(icon(button.optString("icon")), button.optString("label"), bg);
                item.setOnClickListener(v -> choose(key));
                list.addView(item);
            }
        }

        ScrollView scroll = new ScrollView(this);
        scroll.addView(list);
        setContentView(scroll);
    }

    private void choose(String key) {
        KoinkWidgetProvider.Single.pick(this, widgetId, key);
        Intent result = new Intent();
        result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        setResult(RESULT_OK, result);
        finish();
    }

    /** One line: the round coloured icon the widget will show, then the name. */
    private TextView row(Bitmap icon, String label, int circleColor) {
        TextView item = new TextView(this);
        item.setText(label);
        item.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        item.setTextColor(Color.parseColor("#24201C"));
        item.setGravity(Gravity.CENTER_VERTICAL);
        item.setMinHeight(dp(56));
        item.setCompoundDrawablePadding(dp(14));
        item.setClickable(true);
        item.setFocusable(true);
        TypedValue ripple = new TypedValue();
        if (getTheme().resolveAttribute(android.R.attr.selectableItemBackground, ripple, true)) item.setBackgroundResource(ripple.resourceId);
        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(circleColor);
        circle.setSize(dp(40), dp(40));
        if (icon != null) {
            // The icon sits on its coloured circle: a layer list is not needed, a bitmap drawn on the circle is.
            android.graphics.drawable.LayerDrawable layers = new android.graphics.drawable.LayerDrawable(new android.graphics.drawable.Drawable[] {
                circle, new android.graphics.drawable.BitmapDrawable(getResources(), icon)
            });
            int inset = dp(9);
            layers.setLayerInset(1, inset, inset, inset, inset);
            layers.setBounds(0, 0, dp(40), dp(40));
            item.setCompoundDrawables(layers, null, null, null);
        } else {
            circle.setBounds(0, 0, dp(40), dp(40));
            item.setCompoundDrawables(circle, null, null, null);
        }
        return item;
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

    private static int parse(String hex, int fallback) {
        try {
            return hex == null || hex.isEmpty() ? fallback : Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
