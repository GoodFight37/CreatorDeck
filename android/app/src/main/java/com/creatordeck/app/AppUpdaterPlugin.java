package com.creatordeck.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Mise à jour de l'APK de test depuis l'appli (D-144).
 *
 * Android interdit l'installation silencieuse d'une appli hors Play Store : le
 * plugin télécharge l'APK, vérifie son empreinte SHA-256, son nom de paquet et
 * son numéro de version, puis ouvre l'installateur d'Android, où le joueur
 * appuie sur « Installer ». La signature est vérifiée par Android lui-même :
 * seule une APK signée avec la même clé (D-139) peut remplacer l'appli.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String APK_MIME = "application/vnd.android.package-archive";
    private static final long MAX_BYTES = 300L * 1024L * 1024L;
    /** Seules les releases de ce dépôt peuvent être téléchargées (miroir de `updateDownloadPrefix`). */
    private static final String ALLOWED_PREFIX = "https://github.com/GoodFight37/creatordeck-apk/releases/download/";

    private long installedVersionCode() throws PackageManager.NameNotFoundException {
        PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
    }

    private boolean canInstall() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    /** Version installée et droit d'installer. */
    @PluginMethod
    public void info(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionCode", installedVersionCode());
            result.put("versionName", info.versionName);
            result.put("canInstall", canInstall());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Version installée illisible.", error);
        }
    }

    /** Ouvre le réglage « Installer des applis inconnues » pour CreatorDeck. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent intent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()))
                : new Intent(Settings.ACTION_SECURITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Réglage introuvable.", error);
        }
    }

    /** Télécharge, vérifie, puis ouvre l'installateur. Émet « progress » ({ done, total }). */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String expected = call.getString("sha256");
        // Un nombre JSON comme 872293 arrive en Integer : PluginCall.getLong()
        // ne lit que les Long et renverrait null. optLong lit les deux.
        long minVersion = call.getData().optLong("versionCode", -1L);
        if (url == null || !url.startsWith(ALLOWED_PREFIX) || expected == null || expected.length() != 64 || minVersion <= 0) {
            call.reject("Mise à jour invalide.");
            return;
        }
        new Thread(() -> {
            File dir = new File(getContext().getCacheDir(), "updates");
            File apk = new File(dir, "creatordeck-update.apk");
            HttpURLConnection connection = null;
            try {
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Dossier de téléchargement indisponible.");
                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                int status = connection.getResponseCode();
                if (status != 200) throw new IllegalStateException("Téléchargement refusé (" + status + ").");
                long total = connection.getContentLengthLong();
                if (total > MAX_BYTES) throw new IllegalStateException("Fichier trop gros.");
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long done = 0;
                long lastEmit = 0;
                try (InputStream in = connection.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        digest.update(buffer, 0, read);
                        done += read;
                        if (done > MAX_BYTES) throw new IllegalStateException("Fichier trop gros.");
                        if (done - lastEmit > 512 * 1024) {
                            lastEmit = done;
                            JSObject progress = new JSObject();
                            progress.put("done", done);
                            progress.put("total", total);
                            notifyListeners("progress", progress);
                        }
                    }
                }
                StringBuilder hex = new StringBuilder();
                for (byte b : digest.digest()) hex.append(String.format(Locale.ROOT, "%02x", b));
                if (!hex.toString().equalsIgnoreCase(expected)) throw new IllegalStateException("Fichier abîmé : empreinte différente.");

                PackageManager pm = getContext().getPackageManager();
                PackageInfo archive = pm.getPackageArchiveInfo(apk.getAbsolutePath(), 0);
                if (archive == null || !getContext().getPackageName().equals(archive.packageName)) {
                    throw new IllegalStateException("Ce fichier n'est pas CreatorDeck.");
                }
                long archiveVersion = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? archive.getLongVersionCode() : archive.versionCode;
                if (archiveVersion < minVersion || archiveVersion <= installedVersionCode()) {
                    throw new IllegalStateException("Cette version n'est pas plus récente.");
                }

                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, APK_MIME);
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(install);
                JSObject result = new JSObject();
                result.put("started", true);
                call.resolve(result);
            } catch (Exception error) {
                //noinspection ResultOfMethodCallIgnored
                apk.delete();
                String message = error.getMessage() != null ? error.getMessage() : "Téléchargement impossible.";
                call.reject(message, error);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }
}
