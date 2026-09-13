package com.fruiz.game;

import android.os.Bundle;
import android.view.View;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(true);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightNavigationBars(true);
        if (getBridge() == null) return;

        // Le fond s'étend sous les barres ; le jeu reste dans la zone sûre.
        // Un seul propriétaire des insets : SystemBars.insetsHandling=disable.
        View host = (View) getBridge().getWebView().getParent();
        host.setBackgroundColor(0xfff5efdf);
        ViewCompat.setOnApplyWindowInsetsListener(host, (view, windowInsets) -> {
            Insets safe = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right, Math.max(safe.bottom, keyboard.bottom));
            // Le canvas ne doit pas appliquer une seconde fois les marges CSS.
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(host);
    }
}
