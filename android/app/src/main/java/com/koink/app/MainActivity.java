package com.koink.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugin has to be registered before the bridge is built in super.onCreate().
        registerPlugin(KoinkDevicePlugin.class);
        // Window and WebView take the saved app background from the first frame, so there is no
        // light flash before a dark theme and the launch animation starts on the colour of the
        // system launch screen (see LaunchBackground).
        LaunchBackground.applyToWindow(this);
        // Only matters for the next cold start: done when the main thread is idle, not during onCreate.
        LaunchBackground.applySplashThemeWhenIdle(this);
        super.onCreate(savedInstanceState);
        if (getBridge() != null) LaunchBackground.applyToWebView(this, getBridge().getWebView());
    }
}
