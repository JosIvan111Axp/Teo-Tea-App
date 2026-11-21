package io.ionic.starter;

import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Guarda y recupera la contraseña con el gestor del teléfono (Google Password Manager)
 * mediante Credential Manager. Dentro de la app (WebView) el teléfono no siempre ofrece
 * "¿Guardar contraseña?" por sí solo, así que la app se lo pide explícitamente.
 */
@CapacitorPlugin(name = "PasswordSaver")
public class PasswordSaverPlugin extends Plugin {

    private CredentialManager manager() {
        return CredentialManager.create(getContext());
    }

    @PluginMethod
    public void save(PluginCall call) {
        String id = call.getString("id");
        String password = call.getString("password");
        if (id == null || id.isEmpty() || password == null || password.isEmpty()) {
            call.reject("Faltan el usuario o la contraseña.");
            return;
        }
        if (getActivity() == null) {
            call.reject("La app no está visible.");
            return;
        }
        CreatePasswordRequest request = new CreatePasswordRequest(id, password);
        manager().createCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                @Override
                public void onResult(CreateCredentialResponse result) {
                    JSObject data = new JSObject();
                    data.put("saved", true);
                    call.resolve(data);
                }

                @Override
                public void onError(CreateCredentialException e) {
                    JSObject data = new JSObject();
                    data.put("saved", false);
                    data.put("cancelled", e instanceof CreateCredentialCancellationException);
                    call.resolve(data);
                }
            }
        );
    }

    @PluginMethod
    public void get(PluginCall call) {
        if (getActivity() == null) {
            call.reject("La app no está visible.");
            return;
        }
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(new GetPasswordOption())
            .build();
        manager().getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    Credential credential = result.getCredential();
                    JSObject data = new JSObject();
                    if (credential instanceof PasswordCredential) {
                        PasswordCredential pc = (PasswordCredential) credential;
                        data.put("id", pc.getId());
                        data.put("password", pc.getPassword());
                    }
                    call.resolve(data);
                }

                @Override
                public void onError(GetCredentialException e) {
                    JSObject data = new JSObject();
                    data.put("none", e instanceof NoCredentialException);
                    data.put("cancelled", e instanceof GetCredentialCancellationException);
                    call.resolve(data);
                }
            }
        );
    }
}
