package com.koink.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The app's own bridge to native code. JavaScript side: `KoinkDevice` in src/lib/platform.ts.
 * Registered in MainActivity, so it is not listed in capacitor.plugins.json.
 */
@CapacitorPlugin(name = "KoinkDevice")
public class KoinkDevicePlugin extends Plugin {

    /** Stores the app's current background colour (`#rrggbb`) for the native launch surfaces, see LaunchBackground. */
    @PluginMethod
    public void setLaunchBackground(PluginCall call) {
        if (LaunchBackground.save(getContext(), call.getString("color"))) call.resolve();
        else call.reject("Expected a #rrggbb colour");
    }

    /** Stores the buttons of the three home-screen widgets (JSON from src/lib/widgetBridge.ts) and redraws them. */
    @PluginMethod
    public void setWidgets(PluginCall call) {
        String json = call.getString("json");
        if (json == null || json.isEmpty()) {
            call.reject("Expected the widgets as a JSON string");
            return;
        }
        KoinkWidgetProvider.save(getContext(), json);
        call.resolve();
    }
}
