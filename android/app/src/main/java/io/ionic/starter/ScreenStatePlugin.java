package io.ionic.starter;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Informa a la app si la pantalla del teléfono está encendida o apagada.
 * La música lo usa para distinguir "bloqueé el celular" de "cambié a otra app"
 * (en JavaScript ambos casos se ven iguales).
 */
@CapacitorPlugin(name = "ScreenState")
public class ScreenStatePlugin extends Plugin {

    private BroadcastReceiver receiver;

    @Override
    public void load() {
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                JSObject data = new JSObject();
                data.put("screenOn", Intent.ACTION_SCREEN_ON.equals(intent.getAction()));
                notifyListeners("screenChange", data);
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        // Son avisos del sistema: NOT_EXPORTED basta y es lo recomendado desde Android 14.
        ContextCompat.registerReceiver(getContext(), receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @PluginMethod
    public void isScreenOn(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        JSObject result = new JSObject();
        result.put("screenOn", pm == null || pm.isInteractive());
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(receiver);
        } catch (Exception ignored) {
            // ya estaba desregistrado
        }
    }
}
