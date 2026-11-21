package io.ionic.starter;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio de la app (ver ScreenStatePlugin): debe registrarse antes de super.onCreate.
        registerPlugin(ScreenStatePlugin.class);
        registerPlugin(PasswordSaverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
