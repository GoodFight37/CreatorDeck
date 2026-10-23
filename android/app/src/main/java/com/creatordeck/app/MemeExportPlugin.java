package com.creatordeck.app;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import android.util.Base64InputStream;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.UUID;

/** Enregistrement choisi par le joueur, sans permission générale de stockage. */
@CapacitorPlugin(name = "MemeExport")
public class MemeExportPlugin extends Plugin {
    private static final int MAX_BYTES = 25 * 1024 * 1024;

    private String content(PluginCall call) {
        String name = call.getString("name", "");
        String mime = call.getString("mime", "");
        String encoded = call.getString("base64", "");
        if (!name.matches("creatordeck-[a-zA-Z0-9-]+\\.(png|gif)") || encoded.length() > (MAX_BYTES + 2L) / 3 * 4)
            throw new IllegalArgumentException("Nom ou taille de création invalide.");
        if (encoded.length() < 12) throw new IllegalArgumentException("Création vide.");
        byte[] bytes = Base64.decode(encoded.substring(0, 12), Base64.DEFAULT);
        boolean png = bytes.length >= 8 && (bytes[0] & 255) == 137 && bytes[1] == 80 && bytes[2] == 78 && bytes[3] == 71;
        boolean gif = bytes.length >= 6 && bytes[0] == 71 && bytes[1] == 73 && bytes[2] == 70 && bytes[3] == 56;
        if (bytes.length > MAX_BYTES || !(png && mime.equals("image/png") && name.endsWith(".png")
                || gif && mime.equals("image/gif") && name.endsWith(".gif")))
            throw new IllegalArgumentException("Format de création invalide.");
        return encoded;
    }

    @PluginMethod
    public void save(PluginCall call) {
        execute(() -> {
            try {
                String encoded = content(call);
                String name = "meme-export-" + UUID.randomUUID() + ".tmp";
                call.getData().put("cachedExport", name);
                // Capacitor persiste les options pendant SAF : jamais le gros base64.
                call.getData().remove("base64");
                InputStream ascii = new InputStream() {
                    private int offset = 0;
                    @Override public int read() { return offset < encoded.length() ? encoded.charAt(offset++) : -1; }
                };
                try (Base64InputStream input = new Base64InputStream(ascii, Base64.DEFAULT);
                     OutputStream output = new FileOutputStream(cachedFile(call))) {
                    byte[] buffer = new byte[8192];
                    int count, total = 0;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > MAX_BYTES) throw new IllegalArgumentException();
                        output.write(buffer, 0, count);
                    }
                }
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(call.getString("mime"));
                intent.putExtra(Intent.EXTRA_TITLE, call.getString("name"));
                getBridge().executeOnMainThread(() -> {
                    try { startActivityForResult(call, intent, "saveResult"); }
                    catch (Exception error) { clearCachedFile(call); call.reject("Enregistrement indisponible."); }
                });
            } catch (Exception error) { clearCachedFile(call); call.reject("Création invalide ou enregistrement indisponible."); }
        });
    }

    private File cachedFile(PluginCall call) {
        String name = call.getString("cachedExport", "");
        if (!name.matches("meme-export-[a-f0-9-]{36}\\.tmp")) throw new IllegalArgumentException();
        return new File(getContext().getCacheDir(), name);
    }

    private void clearCachedFile(PluginCall call) {
        try { cachedFile(call).delete(); } catch (Exception ignored) { }
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject response = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK) {
            clearCachedFile(call);
            response.put("saved", false); call.resolve(response); return;
        }
        execute(() -> {
            try {
                if (result.getData() == null || result.getData().getData() == null) throw new IllegalArgumentException();
                File cached = cachedFile(call);
                if (!cached.isFile() || cached.length() > MAX_BYTES) throw new IllegalArgumentException();
                try (InputStream input = new FileInputStream(cached);
                     OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "w")) {
                    if (output == null) throw new IllegalArgumentException();
                    byte[] buffer = new byte[8192];
                    int count, total = 0;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > MAX_BYTES) throw new IllegalArgumentException();
                        output.write(buffer, 0, count);
                    }
                }
                response.put("saved", true); call.resolve(response);
            } catch (Exception error) { call.reject("Le fichier n’a pas pu être enregistré."); }
            finally { clearCachedFile(call); }
        });
    }
}
